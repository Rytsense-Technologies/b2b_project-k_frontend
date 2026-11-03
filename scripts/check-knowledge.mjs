#!/usr/bin/env node
/**
 * Validates docs/knowledge OKF files: YAML type+title, and /-links that resolve
 * under docs/knowledge. Run from repo root: node scripts/check-knowledge.mjs
 *
 * --paths also fails on repo paths in AGENTS.md, CLAUDE.md and docs/agent that do not resolve.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.CHECK_KNOWLEDGE_ROOT
  || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KNOWLEDGE = path.join(ROOT, 'docs', 'knowledge');
const SKIP = new Set(['index.md', 'log.md']);
const LINK_KINDS = new Set(['roles', 'rules', 'flows', 'tables', 'api', 'metrics', 'product.md']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(KNOWLEDGE, file).split(path.sep).join('/');
}

const files = walk(KNOWLEDGE);
const errors = [];
let checked = 0;

for (const file of files) {
  const name = path.basename(file);
  if (SKIP.has(name)) continue;
  const text = fs.readFileSync(file, 'utf8');
  checked += 1;
  if (!text.startsWith('---')) {
    errors.push(`${rel(file)}: missing YAML front matter`);
    continue;
  }
  const end = text.indexOf('\n---', 3);
  if (end < 0) {
    errors.push(`${rel(file)}: unclosed YAML front matter`);
    continue;
  }
  const fm = text.slice(4, end);
  if (!/^type:\s.+/m.test(fm) || !/^title:\s.+/m.test(fm)) {
    errors.push(`${rel(file)}: YAML needs type and title`);
  }
  const linkRe = /\]\((\/(?:roles|rules|flows|tables|api|metrics)\/[^)#\s]+|\/product\.md)\)/g;
  let m;
  while ((m = linkRe.exec(text))) {
    const target = m[1].replace(/^\//, '');
    const kind = target === 'product.md' ? 'product.md' : target.split('/')[0];
    if (!LINK_KINDS.has(kind)) continue;
    const abs = path.join(KNOWLEDGE, target);
    if (!fs.existsSync(abs)) errors.push(`${rel(file)}: broken link ${m[1]}`);
  }
}

/** Repo-relative doc paths written as `docs/x.md`, [x](docs/x.md) or (scripts/x.mjs). */
function checkDocPaths() {
  const agentDir = path.join(ROOT, 'docs', 'agent');
  const sources = [path.join(ROOT, 'AGENTS.md'), path.join(ROOT, 'CLAUDE.md')]
    .filter((f) => fs.existsSync(f));
  if (fs.existsSync(agentDir)) sources.push(...walk(agentDir));
  const pathRe = /[`(]((?:docs|scripts)\/[\w./-]+\.\w+)[`)#]/g;
  for (const file of sources) {
    // Past dated entries legitimately name files that have since moved.
    if (path.basename(file) === 'HANDOFF.md') continue;
    const text = fs.readFileSync(file, 'utf8');
    const seen = new Set();
    let m;
    while ((m = pathRe.exec(text))) {
      const target = m[1];
      if (seen.has(target) || fs.existsSync(path.join(ROOT, target))) continue;
      seen.add(target);
      errors.push(`${path.relative(ROOT, file).split(path.sep).join('/')}: missing path ${target}`);
    }
  }
}

if (process.argv.includes('--paths')) checkDocPaths();

if (errors.length) {
  console.error(`check-knowledge: ${errors.length} issue(s) in ${checked} files`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-knowledge: ok (${checked} concept files)`);
