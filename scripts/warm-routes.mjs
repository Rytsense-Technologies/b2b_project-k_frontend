#!/usr/bin/env node
/**
 * Pre-compile every portal page in `next dev` so the first click on each module is instant.
 *
 * The dev server compiles a route the first time it is requested (0.5–5 s each on this machine);
 * after that a page switch takes ~0.1 s. Run this once after `npm run dev` is up:
 *
 *   npm run warm                      # http://127.0.0.1:3000
 *   npm run warm -- http://127.0.0.1:3001
 *
 * It only sends GET requests with the two marker cookies the middleware checks (pk_session,
 * pk_role), so no API call or data change happens — the page HTML is compiled and discarded.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const BASE = (process.argv[2] || process.env.WARM_BASE || 'http://127.0.0.1:3000').replace(/\/$/, '');
const APP = join(process.cwd(), 'src', 'app');

const PORTALS = [
  { prefix: '/superadmin', role: 'superadmin' },
  { prefix: '/admin', role: 'college_admin' },
  { prefix: '/faculty', role: 'faculty' },
  { prefix: '/student', role: 'student' },
];

function pages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...pages(full));
    else if (/^page\.(jsx?|tsx?)$/.test(name)) out.push(full);
  }
  return out;
}

function routeOf(file) {
  const parts = relative(APP, file).split(sep).slice(0, -1)
    .filter((p) => !(p.startsWith('(') && p.endsWith(')'))); // route groups
  if (parts.some((p) => p.startsWith('['))) return null; // dynamic segments need real ids
  return '/' + parts.join('/');
}

const routes = [...new Set(pages(APP).map(routeOf).filter(Boolean))].sort();

async function warm(route) {
  const portal = PORTALS.find((p) => route === p.prefix || route.startsWith(p.prefix + '/'));
  const headers = portal ? { cookie: `pk_session=1; pk_role=${portal.role}` } : {};
  const t0 = Date.now();
  try {
    const res = await fetch(BASE + route, { headers, redirect: 'manual' });
    await res.arrayBuffer();
    return `${String(res.status).padEnd(4)} ${String(Date.now() - t0).padStart(6)} ms  ${route}`;
  } catch (e) {
    return `ERR  ${String(Date.now() - t0).padStart(6)} ms  ${route}  (${e.message})`;
  }
}

console.log(`Warming ${routes.length} routes on ${BASE} …`);
const started = Date.now();
for (const r of routes) console.log(await warm(r)); // one at a time: parallel compiles thrash the dev server
console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s. Page switches now skip the compile step.`);
