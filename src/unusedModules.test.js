// FE-026: every module in src is reachable from a route, a layout or the middleware.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = import.meta.dirname;
const ROOT = /[\\/](page|layout|not-found|error|loading|route|template|global-error)\.jsx?$|[\\/]middleware\.js$|[\\/]Providers\.jsx$/;
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+|require\()['"]([^'"]+)['"]/g;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.jsx?$/.test(name) && !/\.test\.jsx?$/.test(name) ? [full] : [];
  });
}

function resolve(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  return [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]
    .find((c) => existsSync(c) && statSync(c).isFile()) || `MISSING ${spec} in ${path.relative(SRC, from)}`;
}

function graph() {
  const files = walk(SRC);
  const deps = new Map(files.map((f) => [
    f,
    [...readFileSync(f, 'utf8').matchAll(IMPORT)].map((m) => resolve(f, m[1])).filter(Boolean),
  ]));
  const seen = new Set();
  const stack = files.filter((f) => ROOT.test(f));
  while (stack.length) {
    const f = stack.pop();
    if (!seen.has(f)) {
      seen.add(f);
      stack.push(...(deps.get(f) || []));
    }
  }
  return { files, seen };
}

describe('src module graph', () => {
  const { files, seen } = graph();

  it('has no unreachable modules', () => {
    expect(files.filter((f) => !seen.has(f)).map((f) => path.relative(SRC, f).replace(/\\/g, '/')).sort()).toEqual([]);
  });

  it('has no import of a missing file', () => {
    expect([...seen].filter((f) => f.startsWith('MISSING'))).toEqual([]);
  });
});
