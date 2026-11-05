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
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['permissions-policy']).toContain('microphone=(self)');
  });

  it('keeps the CSP open for LiveKit and media, and strict on eval in production', async () => {
    const prod = (await load('production')).headers['content-security-policy'];
    expect(prod).toMatch(/connect-src[^;]*wss:/);
    expect(prod).toMatch(/media-src[^;]*https:/);
    expect(prod).not.toContain('unsafe-eval');
    expect((await load('development')).headers['content-security-policy']).toContain('unsafe-eval');
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
});

describe('frontend image', () => {
  const docker = read('Dockerfile');

  it('runs as the unprivileged node user', () => {
    const runner = docker.slice(docker.lastIndexOf('FROM '));
    expect(runner).toMatch(/^USER node$/m);
    expect(runner.indexOf('USER node')).toBeLessThan(runner.indexOf('CMD '));
    expect(runner).toMatch(/^HEALTHCHECK /m);
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
});

describe('repository hygiene', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n');

  it('ignores local verification output', () => {
    const ignored = read('.gitignore').split('\n');
    for (const entry of ['.playwright-mcp/', '/.next-*/', '/test-results/', '/playwright-report/', '.tmp-*']) {
      expect(ignored).toContain(entry);
    }
  });

  it('example env has no payment key', () => {
    expect(read('.env.example')).not.toMatch(/RAZORPAY/i);
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
