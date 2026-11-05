// INT: what a local `docker build` of the frontend may take into the image (INFRA-012, INFRA-035 / INT-007).
// Run: npx vitest run docker-image.int.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const ignore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');

describe('frontend build context', () => {
  it.each([
    ['.env', 'local secrets / API targets would be read by next build and baked into the bundle'],
    ['.env.*', '.env.local / .env.production.local likewise'],
    ['.next-*', 'isolated QA builds (.next-preview, .next-xb, ...) - hundreds of MB'],
    ['docs', 'audit evidence and handoff notes'],
    ['coverage', 'coverage output'],
    ['test-results', 'Playwright output'],
    ['playwright-report', 'Playwright output'],
    ['.playwright-mcp', 'browser session data'],
  ])('ignores %s (%s)', (entry) => {
    expect(ignore).toContain(entry);
  });

  it('keeps .env.example (documentation, no values)', () => {
    expect(ignore).toContain('!.env.example');
  });
});

describe('frontend image', () => {
  it('runs as the unprivileged node user in the final stage', () => {
    const runner = dockerfile.slice(dockerfile.lastIndexOf('FROM '));
    expect(runner).toMatch(/^USER node\s*$/m);
    expect(runner).toMatch(/--chown=node:node \/app\/\.next/);
  });
});
