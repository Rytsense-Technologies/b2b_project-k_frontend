# Final Test Results

**Date:** 3 Nov 2026 · **Code:** working trees of both repositories (uncommitted) · **Environment:** Windows 11 + WSL Postgres 18, a throwaway QA stack (API :8200, database `quirri_e2e_test`, frontend production build on :3200) with two seeded colleges covering every role. No production system was touched. No paid LLM, TTS or voice call was made.

Every row was executed in this phase; nothing is reported from an earlier run.

| Suite | Tool | Executed | Passed | Failed | Skipped | Result |
|---|---|---|---|---|---|---|
| Backend unit + API + auth + authorization + database (real SQL) | pytest, 4 parallel chunks | 1,539 | 1,531 | 0 | 8 | Pass |
| Backend interview routers (the 8 skips, flag on) | pytest, `INTERVIEWS_ENABLED=true` | 14 | 14 | 0 | 0 | Pass |
| Multi-tenant write matrix | pytest `tests/integration/test_tenant_write_matrix.py` | 180 | 180 | 0 | 0 | Pass (inside the 1,531) |
| Frontend unit | vitest | 294 | 294 | 0 | 0 | Pass |
| End-to-end, all roles, 1440 and 390 | Playwright, real API | 252 | 192 | 60 | 0 | 60 Blocked: brand-colour contrast |
| Accessibility (inside E2E) | axe-core, 92 signed-in scans | 92 | 32 | 60 | 0 | Blocked on UX-002/UX-003 decision |
| Lint | ESLint (`next lint`) | yes | 0 errors | — | — | Pass, 7 warnings |
| Python lint | ruff | yes | clean | — | — | Pass |
| Static security | bandit | yes | 1 high fixed (QA-005), 29 low | — | — | Pass after fix |
| Backend dependencies | pip-audit | yes | 1 advisory left | — | — | QA-004 Blocked (upstream pin) |
| Frontend dependencies | npm audit (production) | yes | 1 critical, 2 high left | — | — | QA-002/QA-003 need approval |
| Secrets in git history | gitleaks (redacted) | 44 + history | 2 frontend, 7 backend matches | — | — | QA-006, INFRA-005 Blocked |
| Performance | load test, 20 concurrent, 15 s per route | 5 routes | 0 errors | — | — | See below |
| Production build | `next build` | yes | exit 0 | — | — | Pass |

## The 8 skipped backend tests

They are the interview routers, off by design (`INTERVIEWS_ENABLED=false`). They were not ignored: the same file run with the flag on passed 14 of 14, including those 8.

## The 60 failing E2E tests

All 60 are axe `color-contrast` violations, and every remaining node is the locked brand orange `#F5821F`: white on orange buttons, and orange words on white, at 2.59:1. They are classified **Blocked: business decision** (UX-002, UX-003, UIX-002). The assertions were not relaxed, and the tests remain in the suite, so they will pass once the owner chooses a compliant treatment. Non-orange contrast failures (56 nodes) were genuine defects and were fixed in this phase (UIX-003).

## Failures investigated during the phase

| Failure | Classification | Resolution |
|---|---|---|
| Student redirect landed on `localhost` instead of `127.0.0.1` | Environment | Next.js rewrites loopback hosts in redirects (`next-url.js` `REGEX_LOCALHOST_HOSTNAME`); a real host is kept. Rerun on `localhost`: pass. |
| 7 journey tests: "Set E2E_IDS" | Environment (my run) | Rerun with the seed ids: 26 of 26 pass, including the 2 that did not run. |
| Load test dashboard: 100% errors | Test defect (my script) | That route is Super Admin only (403 is correct). Rerun as Super Admin: 0 errors. |
| 16 stale backend tests after Phase 2 | Test defect | Stubs updated to new signatures; the publish assertion moved to a real-SQL test. No assertion weakened. |
| QA API died (exit 137) | Environment | A fuzz request froze the API, a genuine defect (APIX-001, fixed). The agent's `kill -9` ended it. Restarted without data loss; affected tests rerun. |
| `npm audit fix --omit=dev` removed dev dependencies | Environment (my action) | `npm install` restored them; unit tests and build rerun. |

## Performance (QA stack, single uvicorn worker, WSL, backend tests running alongside)

| Route | Requests | Rate | p50 | p95 | Max | Errors |
|---|---|---|---|---|---|---|
| `GET /auth/me` (student) | 1,158 | 77 rps | 223 ms | 389 ms | 1,145 ms | 0 |
| `GET /users` (College Admin) | 1,011 | 67 rps | 265 ms | 667 ms | 856 ms | 0 |
| `GET /dashboard` (Super Admin) | 401 | 27 rps | 648 ms | 1,231 ms | 1,905 ms | 0 |
| `GET /edu_video/student/videos` | 931 | 62 rps | 328 ms | 388 ms | 466 ms | 0 |
| `GET /leaderboard` (student) | 1,216 | 81 rps | 210 ms | 372 ms | 1,195 ms | 0 |

No errors under load. The Super Admin dashboard is the slowest route (p95 1.2 s at 20 concurrent). The data set is small, so these numbers are a floor, not a capacity figure.

## Not executed

Each of these is recorded as Blocked or out of scope, not as passed:

- **Coverage percentage:** pytest-cov is not installed in the app environment.
- **TypeScript type check:** `tsc` is not a gate.
- **GitHub CI workflows:** they have not run on GitHub.
- **Real account activation:** the token exists only in the database.
- **Real bulk promote:** it would move the seeded students.
- **Video generation, quiz generation, voice calls and LiveKit:** paid services, so not run.
- **Production checks:** nginx, e-mail delivery and backups were not checked.
