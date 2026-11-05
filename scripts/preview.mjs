#!/usr/bin/env node
/**
 * Fast local preview of the production build (page switches ~0.1 s, sign-in ~0.9 s),
 * without touching the dev server: it builds into `.next-preview` instead of `.next`.
 *
 *   npm run preview            # build + start on http://127.0.0.1:3100
 *   npm run preview -- 3200    # another port
 *
 * Uses the same .env.local (API_PROXY_TARGET etc.) as `npm run dev`.
 */
import { spawnSync, spawn } from 'node:child_process';

const port = process.argv[2] || process.env.PREVIEW_PORT || '3100';
const env = { ...process.env, NEXT_DIST_DIR: '.next-preview' };
const next = ['node_modules/next/dist/bin/next'];

const build = spawnSync(process.execPath, [...next, 'build'], { stdio: 'inherit', env });
if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\nPreview running on http://127.0.0.1:${port}  (Ctrl+C to stop)\n`);
spawn(process.execPath, [...next, 'start', '-p', port, '-H', '127.0.0.1'], { stdio: 'inherit', env })
  .on('exit', (code) => process.exit(code ?? 0));
