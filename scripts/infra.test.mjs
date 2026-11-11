/** Config gates that have no runtime: they fail when a deploy or repo safeguard is removed. */
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const require = createRequire(import.meta.url);
const RAW_IP = /\b13\.234\.197\.68\b/;

describe('next.config.js', () => {
  const load = async (env) => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    delete require.cache[require.resolve('../next.config.js')];
    const config = require('../next.config.js');
    const rules = await config.headers();
    process.env.NODE_ENV = before;
    return {
      config,
      source: rules[0].source,
      headers: Object.fromEntries(rules[0].headers.map((h) => [h.key.toLowerCase(), h.value])),
    };
  };

  it('sends security headers on every page and hides the framework', async () => {
    const { config, headers, source } = await load('production');
    expect(config.poweredByHeader).toBe(false);
    expect(source).toBe('/:path*');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['strict-transport-security']).toMatch(/max-age=\d{7,}/);
    expect(headers['permissions-policy']).toContain('microphone=(self)');
    // SECB-003: ZAP baseline flagged a missing opener policy; same-origin isolates the window from cross-origin popups.
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    // SECB-010: no cross-site embedding of our responses. COEP would break the S3 media, so it stays off.
    expect(headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(headers['cross-origin-embedder-policy']).toBeUndefined();
  });

  // SECB-009: a static policy cannot carry a per-request nonce; the middleware sets it (src/lib/security/csp.test.js).
  it('leaves the Content-Security-Policy to the middleware', async () => {
    expect((await load('production')).headers['content-security-policy']).toBeUndefined();
    expect(read('src/middleware.js')).toMatch(/res\.headers\.set\('Content-Security-Policy', csp\)/);
    expect(read('src/app/layout.js')).toMatch(/await headers\(\)\)\.get\('x-nonce'\)/);
  });

  it('keeps the /admin/structure redirect ahead of render (XB-012)', async () => {
    const [rule] = await require('../next.config.js').redirects();
    expect(rule).toMatchObject({ source: '/admin/structure', destination: '/admin/structure/departments', permanent: false });
  });

  it('lists no external package that is not installed', () => {
    const config = require('../next.config.js');
    expect(config.experimental?.serverComponentsExternalPackages).toBeUndefined();
  });

  it('allows no image host over plain HTTP outside localhost and never the old test IP', () => {
    const { remotePatterns } = require('../next.config.js').images;
    const local = ['localhost', '127.0.0.1'];
    expect(remotePatterns.filter((p) => p.protocol === 'http' && !local.includes(p.hostname))).toEqual([]);
    expect(read('next.config.js')).not.toMatch(RAW_IP);
  });

  // SECA-003: Next 14.2.x has unpatched critical RCE/DoS advisories in the image optimiser
  // (/_next/image). The app never uses it (its one <Image> is already unoptimized), so it stays off.
  it('turns the /_next/image optimiser off', () => {
    expect(require('../next.config.js').images.unoptimized).toBe(true);
  });

  // SECA-012: Next 14.2.x keeps unpatched advisories; 15.5.29 has none in `npm audit`. App Router 15 needs React 19,
  // and recharts 2.x only sees React 19 elements through a matching react-is.
  it('pins Next and its lint config to a patched 15.5 release on React 19', () => {
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json')).packages;
    const [maj, min, pat] = lock['node_modules/next'].version.split('.').map(Number);
    expect(maj).toBe(15);
    expect(min * 1e3 + pat).toBeGreaterThanOrEqual(5029);
    expect(pkg.devDependencies['eslint-config-next']).toBe(pkg.dependencies.next);
    for (const name of ['react', 'react-dom']) expect(lock[`node_modules/${name}`].version).toMatch(/^19\./);
    const reactIs = lock['node_modules/recharts/node_modules/react-is'] || lock['node_modules/react-is'];
    expect(reactIs.version).toMatch(/^19\./);
  });
});

describe('frontend image', () => {
  const docker = read('Dockerfile');

  it('runs as the unprivileged node user', () => {
    const runner = docker.slice(docker.lastIndexOf('FROM '));
    expect(runner).toMatch(/^USER node$/m);
    expect(runner.indexOf('USER node')).toBeLessThan(runner.indexOf('CMD '));
    expect(runner).toMatch(/^HEALTHCHECK /m);
  });

  // SECA-018: the runtime image needs no package manager; npm's bundled dependencies carried HIGH advisories.
  it('starts next with node and removes npm from the runtime stage', () => {
    const runner = docker.slice(docker.lastIndexOf('FROM '));
    expect(runner).toMatch(/^CMD \["node", "node_modules\/next\/dist\/bin\/next", "start"\]$/m);
    expect(runner).not.toMatch(/^CMD .*npm/m);
    expect(runner).toMatch(/^RUN rm -rf \/usr\/local\/lib\/node_modules\/npm /m);
  });

  // SECA-006: next 14 pins postcss 8.4.31 (file-read / path-traversal advisories, fixed in 8.5.23+).
  it('resolves every postcss copy to a patched release', () => {
    const lock = JSON.parse(read('package-lock.json')).packages;
    const copies = Object.entries(lock).filter(([k]) => k.endsWith('node_modules/postcss'));
    expect(copies.length).toBeGreaterThan(0);
    for (const [where, { version }] of copies) {
      const [maj, min, pat] = version.split('.').map(Number);
      expect(maj * 1e6 + min * 1e3 + pat, `${where}@${version}`).toBeGreaterThanOrEqual(8005023);
    }
  });

  // SECA-005: dev-only tooling (vitest, vite, eslint, svgo) carries advisories and is not needed by `next start`.
  it('ships production dependencies only', () => {
    const builder = docker.slice(docker.indexOf('AS builder'), docker.lastIndexOf('FROM '));
    expect(builder.indexOf('npm prune --omit=dev')).toBeGreaterThan(builder.indexOf('npm run build'));
  });

  it('drops the build argument nothing reads', () => {
    expect(docker).not.toContain('NEXT_PUBLIC_API_BASE_URL');
    expect(read('.github/workflows/deploy.yml')).not.toContain('NEXT_PUBLIC_API_BASE_URL');
  });

  it('keeps local env, data and docs out of the build context', () => {
    const ignored = read('.dockerignore').split('\n');
    for (const entry of ['.env*', '.data', 'docs', '.next-*', '.playwright-mcp', 'graphify-out', '.tmp-*']) {
      expect(ignored).toContain(entry);
    }
  });
});

describe('workflows', () => {
  const ci = read('.github/workflows/ci.yml');
  const deploy = read('.github/workflows/deploy.yml');

  it('CI runs on pull requests and is callable by deploy', () => {
    expect(ci).toMatch(/pull_request:/);
    expect(ci).toMatch(/workflow_call:/);
  });

  it('CI gates lint, types, unit tests and a production build', () => {
    for (const step of ['npm ci', 'npm run lint', 'npm run typecheck', 'npm test', 'npm run build']) {
      expect(ci).toContain(`run: ${step}`);
    }
  });

  // `next lint` is gone in Next 16; the ESLint CLI runs the same .eslintrc.json over the same folders.
  it('lints with the ESLint CLI, not next lint', () => {
    const { lint } = JSON.parse(read('package.json')).scripts;
    expect(lint).toMatch(/^eslint /);
    expect(lint).toContain('src e2e');
    expect(Object.values(JSON.parse(read('package.json')).scripts).join(' ')).not.toContain('next lint');
  });

  it('CI runs the accessibility check', () => {
    expect(ci).toContain('npm run test:a11y');
    expect(JSON.parse(read('package.json')).devDependencies['axe-core']).toBeTruthy();
  });

  it('deploy cannot start until CI passes', () => {
    expect(deploy).toMatch(/uses: \.\/\.github\/workflows\/ci\.yml/);
    expect(deploy).toMatch(/build-and-deploy:[\s\S]*?needs: \[?ci\]?/);
  });

  it('deploys are single-flight, bounded and roll back', () => {
    expect(deploy).toMatch(/concurrency:[\s\S]*?cancel-in-progress: false/);
    expect(deploy).toMatch(/timeout-minutes: \d+/);
    expect(deploy).toMatch(/Roll back[\s\S]*?if: failure\(\)/);
    expect(deploy).toContain('PREVIOUS_IMAGE');
  });

  it('a new image proves healthy before the running one is removed', () => {
    expect(deploy.indexOf('xplains-frontend-canary')).toBeGreaterThan(-1);
    expect(deploy.indexOf('xplains-frontend-canary')).toBeLessThan(deploy.indexOf('docker rm -f xplains-frontend\n'));
  });

  it('publishes the frontend on localhost only, with limits and log rotation', () => {
    expect(deploy).toMatch(/-p 127\.0\.0\.1:\$\{\{ env\.FRONTEND_PORT \}\}:3000/);
    expect(deploy).toContain('--memory');
    expect(deploy).toContain('--log-opt max-size=');
  });

  // SECA-004: a moved tag would run new third-party code with the deploy secrets.
  it('pins every third-party action to a full commit SHA', () => {
    for (const file of ['ci.yml', 'deploy.yml', 'e2e.yml']) {
      const uses = [...read(`.github/workflows/${file}`).matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
      for (const ref of uses.filter((u) => !u.startsWith('./'))) {
        expect(ref, `${file}: ${ref}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });
});

describe('repository hygiene', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n');

  it('ignores local verification output', () => {
    const ignored = read('.gitignore').split('\n');
    for (const entry of ['.playwright-mcp/', '/.next-*/', '/test-results/', '/playwright-report/', '.tmp-*']) {
      expect(ignored).toContain(entry);
    }
  });

  it('example env has no payment key and no auth bypass flag', () => {
    expect(read('.env.example')).not.toMatch(/RAZORPAY/i);
    expect(read('.env.example')).not.toMatch(/BYPASS/i);
  });

  // INFRA-025 / FE-028: no hard-coded test server, stale domain or bypass switch anywhere in src.
  it('src has no raw IP, stale domain or client-side auth bypass', () => {
    const src = tracked.filter((f) => /^src\/.*\.(js|jsx|mjs)$/.test(f) && !/\.test\.jsx?$/.test(f) && existsSync(path.join(ROOT, f)));
    expect(src.length).toBeGreaterThan(50);
    const hits = src.filter((f) => {
      const text = read(f);
      return RAW_IP.test(text) || /talenteur\.co\.in/.test(text) || /BYPASS/i.test(text)
        || /\b(?!127\.0\.0\.1\b)(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}\b/.test(text);
    });
    expect(hits).toEqual([]);
  });

  it('has no leftover temp files on disk', () => {
    for (const name of ['.tmp-cookies.txt', '.tmp-dash.html', '.tmp-dash2.html']) {
      expect(existsSync(path.join(ROOT, name))).toBe(false);
    }
  });

  it('tracks no key or env file', () => {
    expect(tracked.filter((f) => /(^|\/)\.env(\.(?!example$).*)?$|\.pem$/.test(f))).toEqual([]);
  });

  it('package scripts point at files that exist', () => {
    const { scripts } = JSON.parse(read('package.json'));
    for (const cmd of Object.values(scripts)) {
      for (const [file] of cmd.matchAll(/scripts\/[\w.-]+/g)) {
        expect(existsSync(path.join(ROOT, file)), file).toBe(true);
      }
    }
    expect(scripts.preview).toBeTruthy();
    expect(scripts.warm).toBeTruthy();
    expect(scripts['test:e2e']).toBeTruthy();
    expect(Object.values(scripts).join(' ')).not.toMatch(/(^|&& )graphify\s/);
  });

  it('declares the TypeScript the type check runs on, and jsconfig is valid for it', () => {
    expect(JSON.parse(read('package.json')).devDependencies.typescript).toBeTruthy();
    const options = JSON.parse(read('jsconfig.json')).compilerOptions;
    expect(options.baseUrl).toBeUndefined();
    expect(options.ignoreDeprecations).toBeUndefined();
  });
});

describe('e2e credentials', () => {
  it('come only from the environment', () => {
    const source = read('e2e/roles.js');
    expect(source).toContain('process.env.E2E_PASSWORD');
    expect(source).not.toMatch(/password:\s*['"`]/i);
    expect(source).not.toContain('@yopmail.com');
  });
});

describe('check-knowledge --paths', () => {
  const run = (doc) => {
    const root = mkdtempSync(path.join(tmpdir(), 'ck-'));
    mkdirSync(path.join(root, 'docs', 'knowledge'), { recursive: true });
    mkdirSync(path.join(root, 'docs', 'agent'), { recursive: true });
    writeFileSync(path.join(root, 'docs', 'real.md'), 'x');
    writeFileSync(path.join(root, 'AGENTS.md'), doc);
    return spawnSync(process.execPath, [path.join(ROOT, 'scripts/check-knowledge.mjs'), '--paths'], {
      encoding: 'utf8',
      env: { ...process.env, CHECK_KNOWLEDGE_ROOT: root },
    });
  };

  it('fails on a doc path that does not resolve', () => {
    const res = run('API truth: `docs/MISSING.md`');
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('docs/MISSING.md');
  });

  it('passes when every doc path resolves', () => {
    expect(run('See [real](docs/real.md).').status).toBe(0);
  });
});
