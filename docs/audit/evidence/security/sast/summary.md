# SAST / supply-chain assessment (6 Nov 2026)

Scope: frontend `E:\b2b_superAdmin_frontend` (Next 14.2.35) and backend `E:\b2b\b2b_projectk` (FastAPI). Local only, owner-authorised. This folder holds no secret values: gitleaks ran with `--redact`, and `Code`/`Match` were stripped from every trivy secret result.

## Tools

| Tool | Version | Raw output |
|---|---|---|
| semgrep (WSL venv `~/secvenv`) | 1.184.0 | `semgrep-backend.json`, `semgrep-backend-fastapi.json`, `semgrep-frontend.json` |
| bandit | 1.9.4 | `bandit-backend.json` (before), `bandit-backend-after.json` |
| pip-audit | 2.10.1 | `pip-audit-lock.json`, `pip-audit-env.json`, `pip-audit-lock-after.json` |
| npm audit | npm 11.16.0 / node 26.3.0 | `npm-audit-{prod,full}.json`, `npm-audit-{prod,full}-after.json` |
| trivy (docker `aquasec/trivy`) | 0.76.2 | `trivy-fs-{backend,frontend}.json`, `trivy-image-{backend,frontend}.json` |
| gitleaks (docker) | 8.21.2 | `gitleaks-{backend,frontend}.json`, `*-allrefs.json`, `gitleaks-backend-worktree.json` |
| actionlint (docker) | 1.7.8 | shellcheck SC2034 only (unused loop variable `i`) in both repos |

Rulesets:
- Backend: p/python, p/owasp-top-ten, p/secrets, p/dockerfile, p/github-actions, p/docker-compose, and p/fastapi (the registry has 1 rule for it; 0 findings).
- Frontend: p/javascript, p/typescript, p/react, p/nextjs, p/owasp-top-ten, p/secrets, p/dockerfile, p/github-actions.

Images were built from the current trees as `seca/backend:sast` (16 min) and `seca/frontend:sast` (18 min). The frontend context was built from a WSL-native copy that excluded `.env*`.

## Counts (before -> after fixes)

| Tool | Before | After |
|---|---|---|
| semgrep backend | 24 (2 ERROR, 22 WARNING) | 16: 7 action pins and SHA-1 fixed; the rest are triaged below |
| semgrep frontend | 10 WARNING (mutable action tags) | 0 |
| bandit backend | 1 High (B324), 38 Low | 0 High, 38 Low |
| pip-audit lock | 72 advisories in 11 packages | 4: ecdsa x2 (no fix), python-jose (no fix), opentelemetry-api (blocked) |
| pip-audit installed env | 16 (pip 25.0.1, ecdsa, jose, otel) | unchanged (the env was already patched) |
| npm audit --omit=dev | 2 (next critical, postcss high) | 1 (next critical) |
| npm audit full | 17 (4C/9H/4M) | 18 (4C/4H/10M). High dropped; typescript-eslint v8 splits one minimatch moderate into 6 entries |
| trivy fs backend | python-jose CRITICAL, DS-0002 root user, DS-0026 no HEALTHCHECK, 1 secret in the untracked `.env` | unchanged |
| trivy fs frontend | next: 25 (3C/9H/11M/2L); 14 JWTs in untracked `.playwright-mcp/*.log` | unchanged |
| trivy image backend | Python: jose CRITICAL, ecdsa HIGH, setuptools 70.3.0 HIGH. Debian 13.7 OS: 1C/282H, only 2 fixable (apt). 0 secrets, no .env | n/a |
| trivy image frontend | App: next only (25), plus next-compiled @babel/runtime MEDIUM. Base image's bundled npm (`/usr/local/lib/node_modules/npm`): brace-expansion, ip-address, pacote, picomatch, sigstore HIGHs. 0 secrets. No dev deps (prune works) | n/a |
| gitleaks history | backend 7, frontend 2 (all known) | n/a |

## Findings

| ID | Sev | Tool | Location | Verdict | Status |
|---|---|---|---|---|---|
| SECA-001 | Low | bandit B324, semgrep | backend `app/services/ops_monitor.py:75` | Genuine. Regression: the QA-005 fix is not in the current tree | Fixed |
| SECA-002 | High | pip-audit | backend `requirements.lock.txt`, `requirements.txt` | Genuine. The lock (which the image installs) pinned old aiohttp, certifi, dnspython, multidict, pillow 12.3.0, pyasn1, PyJWT 2.13.0, urllib3 and yarl. The env had the fixes but the lock never got them | Fixed |
| SECA-003 | Critical (mitigated) | npm audit, trivy | frontend `next.config.js` | Genuine: `/_next/image` RCE/DoS advisories with no 14.2.x fix | Fixed (optimiser off, 404) |
| SECA-004 | Medium | semgrep | 17 `uses:` lines in both repos' workflows | Genuine: mutable action tags | Fixed (SHA + tag comment) |
| SECA-005 | Low | Dockerfile review, npm audit | frontend `Dockerfile` runner copied dev deps (vitest/vite/tinypool criticals) | Genuine | Fixed (`npm prune --omit=dev`) |
| SECA-006 | High (build-time) | npm audit | postcss 8.4.31 bundled by next | Genuine; exposure is build-time on our own CSS only | Fixed (override 8.5.32) |
| SECA-007 | Low | npm audit full | svgo 3.3.2, eslint-config-next 14.2.3 (dev) | Genuine | Fixed (3.3.5, 14.2.35) |
| SECA-008 | Medium | semgrep missing-user, trivy DS-0002 | backend `Dockerfile` runs as root | Genuine | Needs decision |
| SECA-009 | Low | pip-audit, trivy | python-jose 3.5.0 (CVE-2026-85394, no fix), ecdsa 0.19.2 (Minerva, no fix) | Advisories are real but not exploitable here: HS256 with a secret, `algorithms=[...]` pinned, no public key, ecdsa never signs | Needs decision |
| SECA-010 | Low | pip-audit | opentelemetry-api 1.44.0 | Known QA-004 | Blocked (upstream) |
| SECA-011 | High | gitleaks, grep | backend `app/config.py` 2bdef47; `.env.example` 672e9a2, ca59359 (x2); `docker/livekit.yaml` 04edd77, 7d0465b; `docker/egress.yaml` 04edd77. Frontend `.next/prerender-manifest.json` 19e0991 (x2). Seed password still in `scripts/seed_superadmin.py:19` (no gitleaks rule matches it) | Known AUTH-009 / INFRA-005 / QA-006; nothing new. The LiveKit dev pair is still tracked at HEAD | Blocked (rotation + history rewrite) |
| SECA-012 | Critical | npm audit, trivy | remaining next 14.2.35 advisories | Genuine (applicability below) | Needs decision (QA-002) |
| SECA-013 | Low | npm audit full | vitest 2.1.9, coverage-v8, vite 5, esbuild, tinypool, glob, minimatch | Genuine; dev/CI only, and the Vitest UI never runs | Needs decision (major) |
| SECA-014 | Low | semgrep compose | backend `docker-compose.yml`: no `no-new-privileges`/`read_only`; `livekit-server:latest` in both compose files | Genuine hardening gap | Open |
| SECA-015 | Info | trivy secret | frontend `.playwright-mcp/console-*.log`: 14 JWTs from Oct 2026 (untracked, gitignored, dockerignored) | Local artefacts | Open (delete the logs) |
| SECA-016 | Info | bandit B603/B607, review | backend `app/edu_video/stages/visualizer.py:_render_manim` runs LLM-generated Python with the full env | Dead code today (no caller) | Open (delete or sandbox) |
| SECA-017 | Low | trivy image | backend image: setuptools 70.3.0 (CVE-2025-47273); build-essential and *-dev libs in the runtime image | Genuine | Open (multi-stage build; `docker pull python:3.12-slim`) |
| SECA-018 | Low | trivy image | frontend image: base image's global npm (HIGHs). The app only needs it because CMD is `npm run start` | Genuine | Open (`CMD ["node_modules/.bin/next","start"]` and remove `/usr/local/lib/node_modules/npm`, or refresh node:22-alpine) |

### Next 14.2.35 applicability

- **CVE-2025-29927** (`x-middleware-subrequest`): not affected. Fixed in 14.2.25, and no code in the installed `next/dist` reads that header. The middleware only does UX redirects; the API enforces auth.
- **Image optimiser RCE/DoS** (1193733, 1242817, 1112593, 1114940, 1118952): mitigated by SECA-003. `next-server.js` calls `render404` when `images.unoptimized` is set. The only `<Image>` (QuirriLogo) was already `unoptimized`, so there is no visual change.
- **Pages Router middleware bypass** (1118962): n/a. The app is App Router only.
- **Server Actions DoS/SSRF** (1124172, 1124185, 1242819): there is no `'use server'` in `src`. The framework endpoint remains.
- **Rewrites SSRF / request smuggling** (1124193, 1114897): rewrites exist only when `API_PROXY_TARGET` is set (local dev). Production goes through nginx.
- **Windows-host RCE** (1193677): affects only the owner's Windows dev server.
- **RSC cache poisoning, App Router XSS, beforeInteractive XSS:** apply; no 14.x patch exists.
- **No Next 14.2.x fix exists.** 14.2.35 is the last 14.x (dist-tag `next-14`). The nearest fix is 15.5.28+ (`backport` tag 15.5.29, which accepts React 18).
- **postcss:** latest is 8.5.32. All four advisories are fixed from 8.5.23 (a minor bump inside 8.x).

### Remaining semgrep / bandit triage

- `python-logger-credential-disclosure` (auth.py:279, edu_video/llm/client.py:16, mcq/services/openai_service.py:188): FP. They log user_id or max_tokens.
- `directly-returned-format-string` (voice_qna/api/simple.py:206/211, voice_qna/rate_limiter.py:33): FP. These are slowapi rate-limit keys.
- `request-host-used` (deploy/nginx/xplains.conf.example:27/48): FP. `server_name` is pinned.
- `avoid-sqlalchemy-text` (scripts/check_integration_data.py:37): FP. The SQL is a module constant, run read-only.
- bandit Low (38), all FP or intended:
  - B110/B112 x21: best-effort cleanup.
  - B105 x4: enum names and a dev-default sentinel.
  - B311 x4: non-crypto random.
  - B403: `pickle.dumps` probe only.
  - B404/B603/B607: fixed argv, no shell.
  - B406: escaper, not a parser.

  The previous run had 29 Low. The 9 new ones are the same kinds, in new edu_video/mcq code.

## Fixes and verification

| ID | Files | Regression test |
|---|---|---|
| SECA-001 | `app/services/ops_monitor.py` | `tests/test_sast_regressions.py::test_fingerprint_sha1_is_marked_not_for_security` (failed first) |
| SECA-002 | `requirements.lock.txt`, `requirements.txt` | pip-audit on the lock: 72 -> 4. `pip check` clean. Backend image installs the lock (pillow 13.0.0, PyJWT 2.15.0, ...) |
| SECA-003 | `next.config.js` | `scripts/infra.test.mjs` "turns the /_next/image optimiser off" (failed first) |
| SECA-004 | backend `.github/workflows/{backup,ci,deploy}.yml`; frontend `.github/workflows/{ci,deploy,e2e}.yml` | frontend "pins every third-party action to a full commit SHA" (failed first); backend `test_workflow_actions_are_pinned_to_commit_sha` |
| SECA-005 | frontend `Dockerfile` | "ships production dependencies only" (failed first); image scan shows no dev deps |
| SECA-006/007 | `package.json` (overrides, svgo, eslint-config-next), `package-lock.json` | "resolves every postcss copy to a patched release" (the old lock fails on next/node_modules/postcss@8.4.31). The image's `next build` compiles all 56 pages |

Results:
- Frontend: vitest 384/384 (380 + 4 new). `npm run lint`: 0 errors, 8 pre-existing react-hooks warnings (that plugin's version is unchanged).
- Backend: sast_regressions, ops_monitor_sync_drain, auth_login_hardening, activation_links, rate_limit_per_user: 63 passed.

Note: the `next.config.js` change restarts a running `next dev` once.

## Needs decision (exact commands)

- **SECA-012 / QA-002:** `npm install next@15.5.29 eslint-config-next@15.5.29`. Then run the full e2e suite; Next 15 changes the async request APIs and the caching defaults.
- **SECA-013:** `npm install -D vitest@5.1.0 @vitest/coverage-v8@5.1.0`
- **SECA-008:** in the backend Dockerfile add `RUN useradd -r -u 10001 app && chown -R app /app` and `USER app`. Before deploying, run `docker run --rm -v xplains-media:/m alpine chown -R 10001 /m` on the server, or uploads fail.
- **SECA-009:** move `app/services/token_service.py` from python-jose to PyJWT (already pinned) and drop `python-jose[cryptography]`. PyJWT requires `sub` to be a string.
- **SECA-011:** owner rotates the keys and the seed password, then rewrites history.
