# Phase 2 Remediation Report

**Date:** 2 Nov 2026 · **Backlog:** [`ISSUE_REGISTER.md`](ISSUE_REGISTER.md) (each issue carries its status, fix, test and evidence) · **Nothing was committed or pushed.**

## Verdict

**Every Critical and High issue that code can fix is fixed and verified.** Phase 2 is not fully closed: 4 High items are Blocked because only the owner can finish them (below). The code side of AUTH-009, INFRA-004 and TEST-005 is done.

| Status | Issues |
|---|---|
| Fixed | 162 |
| Blocked | 29 |
| Needs Business Decision | 23 |
| In Progress | 4 |
| **Total** | **218** |

| Severity | Fixed | Remaining |
|---|---|---|
| Critical (1) | 1 | 0 |
| High (11) | 7 | 4 Blocked on the owner |

## Test results (final code)

| Check | Phase 1 | Now |
|---|---|---|
| Backend pytest | 613 passed, 6 failed, 8 skipped | **1,325 passed, 0 failed, 8 skipped** |
| Real-database tests | 0 | 593, on a throwaway database built by the migrations |
| Frontend tests | none | **283 passed** (vitest) |
| Playwright smoke | none | 10 of 10 on a production build with a throwaway API; run before the last agent changes, not repeated |
| Production build | fails on 18 pages | **passes** |
| ESLint | no config | **clean** |
| `check-knowledge` | passes | passes |
| CI | deploys with no gates | `ci.yml` added to both repos and `deploy.yml` requires it. **Never run on GitHub**; parsed, actionlinted and rehearsed locally |

The 8 skips are the interview tests, correctly off.

## Critical and High issues

| ID | Status | Result |
|---|---|---|
| AUTHZ-001 | Fixed | Public `/uploads` and `/recordings` mounts removed. |
| AUTH-001 | Fixed | Refresh tokens rejected as access tokens on every route, for all 5 roles. |
| AUTH-003 | Fixed | One shared refresh per tab, plus a 30-second grace window. Real replay still ends every session. |
| AUTH-004 | Fixed | Resend-activation is scoped to the college and cannot revive deactivated accounts. |
| AUTH-006 | Fixed | Deactivating a college or university blocks sign-in and ends sessions. |
| AUTHZ-006 | Fixed | New admins get their role's permissions. |
| BACKEND-004 | Fixed | Failed videos can be retried; a Retry button was added. |
| BUILD-001 | Fixed | Production build passes. |
| AUTH-009 | **Blocked** | Seed credentials now come from the environment and the password is gone from all tracked files. Still in git history: rotate it. |
| INFRA-004 | **Blocked** | Deploy now passes e-mail settings. Secrets must be added and delivery verified. |
| INFRA-005 | **Blocked** | Keys in git history must be rotated. |
| TEST-005 | **Blocked** | Build no longer blocks deploy. Needs a commit and push. |

## Owner actions before deploying

1. **Rotate** the seed password and the keys in git history, and check whether the seed account exists in production.
2. **Set the GitHub secrets:** `EMAIL_PROVIDER`, `EMAIL_FROM`, `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `BACKUP_S3_BUCKET`, `BACKUP_PASSPHRASE`, optionally `REDIS_PASSWORD`.
3. **Check nginx:** the API and frontend now bind to localhost, so nginx must proxy to 127.0.0.1:8100 and :3100 on the same host, or the site breaks. Uvicorn must also trust the proxy (`--forwarded-allow-ips`), or all users share one rate-limit and lockout address.
4. **Migrations 0046 to 0050:** applied locally only. Read the deploy log: 0049 skips a unique index where duplicates exist. 0048 constraints are `NOT VALID`, so run `VALIDATE CONSTRAINT` per environment.
5. **At commit time:** `git rm --cached` the `.tmp-*` files, tracked `.playwright-mcp` files and backend `.idea/`; commit `scripts/check-knowledge.mjs`; commit the 0040 to 0045 rename (BACKEND-002).
6. **Enable branch protection** after the first green CI.
7. **`DATABASE_URL` is now required**; a deployment without it refuses to start.

## Decisions needed

Full wording is in each register entry.

**Accessibility:** white on orange and orange status words are 2.59:1 against the brand lock (UX-002, UX-003). Captions, and whether to backfill (UX-001).

**Roles and access:** peer College Admin rules (AUTHZ-010). Does a faculty head get HOD powers (BACKEND-018)?

**Content:** one published video per chapter (DATA-028). Students who attempted a quiz that is later regenerated (BACKEND-006). Confirmation before deleting published chapters (BACKEND-021). Should a pending change request block publish? It does not today.

**Operations:** Windows Postgres (DATA-003), crisis alerts (PIPE-026), quotas and spend (INFRA-016), Sarvam fallback (INFRA-020), error tracker (INFRA-021), privacy and retention (INFRA-022), retention of deleted jobs (PIPE-021), job fairness and limits (PIPE-006).

**Smaller:** bell events, 8 or 15 (BACKEND-035). Remove the unused OTP routes (AUTH-015). Reset button wording on a frozen page (FE-011). Drop dead columns (DATA-030). Delete dead pipeline code (PIPE-027). Background quiz generation (BACKEND-047). Close UX-012 as not a defect.

**Raised while fixing:** do pending or deactivated students hold a seat (DATA-006)? Should an unset `ENVIRONMENT` default to production (AUTH-008)? Must college names be unique? Should a job fail when most chapters are degraded?

## Behaviour changes to review

- **Built without a decision:** the type-instead tutor (FE-006) was added because docs already call it product. It can be removed if unwanted.
- 37 unreachable frontend modules were deleted, including `PortalLoginPage.jsx`, which `quirri-login-freeze.mdc` still lists. Recoverable from git.
- Plan state was removed from the frontend.
- Lockouts answer 401, not 429, per account plus source address. The frontend's server-lock notice no longer fires.
- Changing a password ends the current session too.
- Non-superadmin users with no college get 403.
- `POST /users` requires a department for students.
- Reports and the dashboard count active students only.
- A second year promotion in an academic year answers 409. The UI shows the error but does not yet offer `repeat_confirmed`.
- Unknown `range` values answer 400. Semester archive answers 409 while students are placed in it.
- API docs are local only. Leaderboard refreshes every 60 s, so a new score can take up to a minute.
- The muted grey token changed to `#626D71` for contrast; login keeps its old value. `design-system.md` §2 still lists the old value.
- A change request now stays open while a regenerate renders, so the job stays in the Changes Requested tab until it succeeds.

## Not verified

- **Production was never touched**, so nginx, e-mail delivery and the seed account remain unknown.
- **GitHub workflows have not run.** Expect first-run fixes. The frontend Docker image never finished building here because npm timed out (INFRA-012, In Progress).
- **Not exercised live:** a real video generation, voice call, paid LLM call, load test or S3 backup upload. Browser checks used mocked APIs on the UI paths they covered.
- **A full sign-in through the new local API was not run**, because the password is no longer available to this session. The API restart is checked only by its alive response.
- `alembic check` is not a gate: about 60 database-only indexes and constraints still differ from the models.
- `docs/knowledge/log.md` holds all 55 product-fact changes, but the individual concept files still need them folded in.
- `axe` left 367 colour-contrast items as "incomplete", and some green and teal contrast sits outside the assigned issues.
- Some tests only exercise extracted logic, not the React hook. The register says which.
- AUTH-022 was already fixed by AUTH-003, so its guard test did not fail first.

## Open work

- **In Progress (4):** BACKEND-028 (paging and load), BACKEND-031 (durable mail queue), INFRA-012 (frontend image build), UX-017 (dashboard and content pages still miss the 2.5 s LCP target on mocked data).
- **Blocked (25 beyond the High items):** mainly Tamil fonts and shaping (PIPE-001, BACKEND-026), `app/main.py` security middleware (INFRA-009), production validators (INFRA-023, INFRA-029), upload limits and LLM timeouts (INFRA-018, INFRA-019, INFRA-031), and docs paths (TEST-021). Several are now only blocked on stale ownership, since all agents have finished, and need one more pass. Exact changes are in each entry.

## Secrets note

The seed password appeared in this session's tool output once, through my masking mistake, and a fragment of it in one of my scripts. It was not written to any deliverable, and it is one more reason to rotate it. `CLAUDE.md`, `HANDOFF.md` and the portal skill now say the owner holds it and QA helpers read `QA_PASSWORD` from the environment.
