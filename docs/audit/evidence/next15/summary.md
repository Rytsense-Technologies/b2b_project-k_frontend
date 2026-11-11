# Next.js 15 upgrade (SECA-012) — 6 Nov 2026

## Versions
| Package | Before | After |
|---|---|---|
| next | 14.2.35 | 15.5.29 |
| eslint-config-next | 14.2.35 | 15.5.29 |
| react / react-dom | 18.3.1 | ~19.2.9 |
| lucide-react | 0.376 | ^0.397.0 (first React-19-compatible, same icons) |
| recharts | 2.15.4 | 2.15.4 + override `react-is: $react` |
| eslint | 8.57.1 | 8.57.1 |

Files changed: `package.json`, `package-lock.json`, `scripts/infra.test.mjs` (version-guard test). No `src/`, `e2e/`, `next.config.js`, workflow or Dockerfile change was needed: all pages are client components (no async `params`/`cookies()`/`headers()`), no server `fetch`, no route handlers, no `useFormState`.

## Results
| Check | Before | After |
|---|---|---|
| vitest | 384/384 | 385/385 |
| lint | 0 errors / 8 warnings | 0 errors / 8 warnings |
| production build | ok | ok (56 pages) |
| `npm audit --omit=dev` | 1 critical (next) | 0 |

E2E (`next start` :3601, API :8601, DB `quirri_n15_test`, alembic 0056):

| Browser | Baseline | Next 15.5.29 |
|---|---|---|
| chromium | 320 / 1 | 352 / 0 |
| firefox | 352 / 0 | 352 / 0 |
| webkit | 306 / 5 | 337 / 2 |

- First chromium run: 26 × 403 on `/api/v1/users` — QA seed users had no stored permissions (AUTHZ-006 regression; fixed in the backend on 6 Nov so empty permissions fall back to role defaults).
- WebKit remaining: college-invite timeout (same as baseline) and a department double-click flake that also reproduces on Next 14 (head-to-head run). React #310 on `/admin/structure` in WebKit is gone.
- Not run: tablet projects, msedge.

Visual: 12 full-page screenshots (login + 5 role dashboards × 1440/390), Next 14 vs 15 side by side, all within 0.2% pixel difference. Reference images in `screens/`.

## Remaining audit items (dev-only, not shipped)
vitest 2.1.9 chain (needs vitest 5), @typescript-eslint/* (moderate, `npm audit fix`), glob / minimatch / test-exclude (moderate). Dockerfile runs `npm prune --omit=dev`.

## Deploy notes
1. Local `node_modules` is still Next 14: stop the dev server, `npm ci`, `npm run warm`.
2. React 19 is stricter about hydration warnings in dev only.
3. `next lint` is removed in Next 16; move to the ESLint CLI later.
