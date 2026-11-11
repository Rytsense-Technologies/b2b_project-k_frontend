# Phase 1 Completion Report — Comprehensive Audit

**Date:** 2 Nov 2026 · **Scope:** frontend `E:\b2b_superAdmin_frontend` (commit `99ecaf7` + working tree) and backend `E:\b2b\b2b_projectk` (commit `ed34cc5` + working tree) · **Register:** [`ISSUE_REGISTER.md`](ISSUE_REGISTER.md)

## Verdict

**Phase 1 is complete for everything reachable from the repositories and the local stack: every major application module was reviewed.** It is **not** complete for the production environment, which was never accessed (see "What remains unverified"). No product code, configuration or database was changed in this phase.

The application's tenant isolation held up well on reads. The serious problems are public file access, session handling, a production build that currently fails, and an absence of automated safety nets.

## Results

| Severity | Issues |
|---|---|
| Critical | 1 |
| High | 11 |
| Medium | 109 |
| Low | 86 |
| Informational | 11 |
| **Total** | **218** |

286 raw findings: 64 duplicates merged across auditors, 4 withdrawn as non-defects (one further finding, BUILD-001, was added from the baseline run). Of the 36 findings first rated Critical or High, an independent adversarial verifier re-checked every one: 19 groups confirmed, 6 partially confirmed, none disproved. 10 groups were downgraded, with reasons recorded in the register.

## Issues that must be fixed first

| ID | Severity | Problem |
|---|---|---|
| AUTHZ-001 | Critical | Stored resumes and interview recordings download with no login (`/uploads`, `/recordings`). Reproduced on all 4 files tried. The URL must be known; the mounts remain on though interviews are off. |
| BUILD-001 | High | `next build` fails on 18 Faculty and Student pages, so the frontend cannot deploy. Fix proven on a temporary copy. |
| TEST-005 | High | Frontend production is stale: last successful deploy 28 Sep; same build failure blocks it. |
| AUTH-001 | High | A refresh token is accepted as an access token, so it works for up to 30 days, including after logout or password change. Reproduced for all 5 roles. |
| AUTH-003 | High | Concurrent refresh calls trigger false reuse detection and sign the user out everywhere. |
| AUTH-004 | High | `/auth/resend-activation` has no college scope: a College Admin can probe any e-mail and act on another college's user. |
| AUTH-006 | High | Users of a deactivated college or university can still sign in and work. |
| AUTH-009 | High | The Super Admin seed uses a tracked password and a public mailbox. Becomes **Critical** if that account exists in production. |
| AUTHZ-006 | High | Newly created or promoted admins get 403 on Users and Roles. |
| BACKEND-004 | High | A failed video cannot be retried: the message says "Press Regenerate", the API refuses. |
| INFRA-004 | High | The deploy sets no e-mail settings, so production likely sends no invites or password resets. Needs a server check. |
| INFRA-005 | High | Two API-key-shaped values and other secrets remain in backend git history. Rotate them. |

## Module review coverage

| Module | Reviewed by | Method |
|---|---|---|
| Authentication, sessions, cookies, JWT, reset, activation, OTP, rate limits | AUTH | All code; live GET probes |
| Authorization, roles, tenant isolation | AUTHZ | 144-route matrix; ~110 live GET variants across 6 identities |
| Database models, all migrations, constraints, transactions, queries | DATA | All models and migrations; read-only SQL on the WSL database |
| Users, colleges, universities, departments, academics | BACKEND | Every router read |
| Edu-video, MCQ, voice tutor, notifications, analytics, reports, leaderboard, health, audit logs, background workers | BACKEND, PIPE | Routers plus pipeline, LLM, agent and prompt internals |
| File uploads, secrets, CORS, headers, dependencies, Docker, CI, integrations | INFRA | Both repos, git history, `npm audit` |
| Frontend: 57 pages, components, hooks, API clients, middleware, permissions | FE | 228 live navigations, 5 roles, 1440 and 390: no page errors, 5xx or sideways scroll |
| Accessibility and performance | UX | axe scans, 98 page states; bundle analysis; timing |
| Test coverage and CI | TEST | Route-by-route coverage map; workflows |

Clean results worth keeping: no cross-tenant read succeeded; no SQL injection; no schema drift; no duplicate e-mails; quiz one-attempt is enforced by a DB constraint; LiveKit webhook signatures verified; no `dangerouslySetInnerHTML`; Poppins and canvas `#EEF0F0` confirmed live.

## Baseline test results

| Check | Result |
|---|---|
| Backend pytest | **613 passed, 6 failed, 8 skipped** (6 min) |
| Frontend `next build` | **FAILS** (18 pages). Passes on a temporary copy with the one-line Suspense fix (58 pages). |
| Frontend tests | **None exist.** No test runner in `package.json`. |
| Frontend lint / types | No ESLint config; `tsc` fails on the installed TypeScript version. Not run as a gate. |
| Knowledge docs | `check-knowledge.mjs` passes (63 files), though the script itself is untracked. |
| `npm audit` (production) | 1 critical, 6 high, mostly `next` 14.2.3. |
| CI | Both repos deploy on push with **no tests, lint or migration checks**. |

**The 6 failing tests:** 3 voice keyword tests are not product bugs (local `.env` has `TOP_K=3`, tests assume 4; PIPE-028). 1 is a real Linux bug (math symbols; PIPE-002). 2 are font-dependent edge cases (PIPE-023). The 8 skips are interview tests, correctly off.

## Untested areas

Zero or near-zero automated coverage, ranked by risk:

1. Tenant isolation on real SQL: every API test mocks the database, so `WHERE tenant_id` filters never run.
2. Login, refresh, logout, reset, activation, OTP (10 of 12 auth routes untested).
3. User and role administration (0 of 16 routes).
4. College provisioning and deactivation cascades.
5. Migrations and deploy boot.
6. Publish flow end to end.
7. Quiz one-attempt under double or concurrent submit.
8. Notification switches.
9. Report and audit exports.
10. Every browser flow, for every role.

About 29 of 137 mounted routes (21%) are reached by a test (static estimate; no coverage tool installed).

## What remains unverified

These are real limits, not skipped work. Each is why a finding may be `suspected` or "confirmed from code".

- **Production was never accessed:** nginx rules, live `.env`, real e-mail delivery, whether the seed account exists, TLS, S3 policy, host backups. These can raise or lower severities: AUTHZ-001 and AUTH-009 especially.
- **No write path was executed** (Phase 1 was GET-only): refresh race, resend-activation, deactivated-tenant login, seat-cap races. Phase 2's regression tests will prove them.
- **Cross-tenant checks ran in one direction:** no second-college login exists.
- **Not exercised:** real quiz attempt screens, a live voice call, a full video generation, real prompt-injection attempts (paid calls were out of scope).
- **Read by pattern, not line by line:** large list pages, slide design modules, some analytics services.
- **Dataset is small** (19 users, 13 jobs), so performance findings are partly extrapolated.
- **Backend CVEs:** `pip-audit` was unavailable.

## Prioritised remediation roadmap

**P0 — before any release (Critical/High, safe fixes)**
1. BUILD-001 Suspense fix, then unblock TEST-005.
2. AUTHZ-001 protect or remove the public file mounts.
3. AUTH-001 enforce token type; AUTH-003 fix refresh race.
4. AUTH-004 scope resend-activation; AUTH-006 block deactivated colleges.
5. AUTHZ-006 permissions fallback; BACKEND-004 allow retry of failed videos.
6. Remove the unauthenticated Next `/api/edu-video/*` routes (AUTHZ-002); upgrade `next` (INFRA-002).

**P1 — foundations**
7. Frontend test runner + Playwright smoke per role (TEST-008); DB-backed backend tests (TEST-001); auth route tests (TEST-002).
8. CI gates: tests, build, migration check before deploy (TEST-003).
9. Secret hygiene: rotate keys, remove the tracked seed password (INFRA-005, AUTH-009).
10. Input crashes, hardening, seat-cap and audit gaps (Medium).

**P2 — quality**
11. Accessibility: muted-text contrast, focus, ARIA, video captions (UX-001).
12. Performance: code-split LiveKit and Recharts; lazy-import the video pipeline.
13. Pipeline fixes: Tamil fonts, math symbols, job deadlines (PIPE-001, 002, 006).

**Needs an owner decision (not code)**
- Orange contrast: white on `#F5821F` is 2.59:1, which fails WCAG but is a standing brand lock (UX-002, UX-003).
- Are deactivated students counted against the seat cap? (DATA-006)
- Should archiving a chapter or programme hide it from students? (DATA-012)
- One video per chapter? One chapter has two published videos today (DATA-028).
- Who gets crisis alerts from the voice tutor? (PIPE-026)
- Video captions: required for launch? (UX-001)
- Production access to verify the items above, and approval to rotate keys.
