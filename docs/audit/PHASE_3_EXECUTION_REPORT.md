# Phase 3 Execution Report

**Date:** 3 Nov 2026 · **Results:** [`FINAL_TEST_RESULTS.md`](FINAL_TEST_RESULTS.md) · **Register:** [`UPDATED_ISSUE_REGISTER.md`](UPDATED_ISSUE_REGISTER.md) (a copy of `ISSUE_REGISTER.md`, which is updated too) · **Nothing was committed or pushed.**

## Verdict

**Phase 3 is complete under its own rule.** Every executable test passes, or its failure is classified with a documented reason:

- 1,531 backend tests pass with 0 failed, including 180 cross-college write tests.
- The 8 skipped interview tests pass when the flag is on.
- 294 frontend unit tests pass.
- 192 of 252 end-to-end tests pass. The other 60 are accessibility checks that fail only on the locked brand orange; they are Blocked on your colour decision, with the assertions unchanged.

Phase 3 also found **15 new issues**: 4 High, 5 Medium, 5 Low and 1 Informational.

| Status | Count |
|---|---|
| Fixed and verified | 8 |
| Needs Business Decision | 5 |
| Blocked | 2 |

## What was executed

| Area | Test |
|---|---|
| Unit, integration, API, authentication, authorization and database tests | The full pytest suite on throwaway databases built by the migrations. |
| Multi-tenant isolation | A real-SQL matrix: 43 mutating id routes × 4 roles of college A against college B, plus foreign ids inside request bodies, mass assignment and notification scopes. It also ran live against the QA stack. |
| End-to-end (new suite) | Every sidebar page for all 5 roles at 1440 and 390, checked for console errors, page errors, 5xx, sideways scroll and stuck loaders. Real writes for Super Admin and College Admin flows. Scoping, settings, notifications and resilience: back/forward, deep-link refresh, session loss, double submit. |
| Security | ruff, bandit, pip-audit, npm audit and gitleaks. Exploratory attacks: IDOR, role escalation, mass assignment, session reuse after logout, password change and deactivation, CORS, input fuzzing, races, CSV injection and error leakage. |
| Performance | A load test on 5 routes at 20 concurrent users. |
| Accessibility | axe-core on 92 signed-in page states. |

## New issues fixed in this phase

| ID | Severity | Problem → fix |
|---|---|---|
| QA-001 | High | 77 known vulnerabilities in backend dependencies. Patched pins, and token signing moved from python-jose to PyJWT. pip-audit now shows 1, which is QA-004. |
| APIX-001 | High | One signed-in request with a huge field froze the whole API for about 200 s, because redaction regexes ran on the full text. The text is now cut first; one record dropped from 212 s to under 1 s. |
| APIX-002 | High | Voice routes, including paid text chat, accepted cookies already revoked by a password change or a deactivated college. They now run the same checks as the rest of the API. |
| APIX-003 | Medium | A NUL character in a JSON body caused a 500 on more than 18 write routes. It now returns 422. |
| UIX-001 | Medium | A taken university or college code was silently replaced. The toast now states the code actually saved. |
| UIX-003 | Medium | 56 non-orange contrast failures (green pill, teal student text, grey labels) fixed, with contrast unit tests. |
| APIX-004 | Low | Reactivating a user revived their old access cookie. Deactivation now bumps the token version. |
| QA-005 | Low | Bandit flagged SHA1, which is only used for error grouping. Marked `usedforsecurity=False`. |

## Decisions needed

| ID | Question |
|---|---|
| QA-002 | Approve a **major Next.js upgrade** (14 → 15/16)? 14.x has unpatched critical and high advisories: XSS, cache poisoning, request smuggling and DoS. Until then, put rate and size limits in nginx. |
| UIX-002, with UX-002 and UX-003 | Choose a contrast-compliant treatment for orange (brand lock). This unblocks the 60 accessibility tests. |
| APIX-005 | The access cookie works up to 30 minutes after logout. Add a denylist, shorten its life, or accept the window? |
| APIX-006 | Set a request body size limit (nginx or the app). |
| QA-003 | Migrate forms to zod 4? The advisory only affects the user's own browser. |
| UIX-001 (follow-up) | Should the API refuse a taken code with 409 instead of reassigning it? |

## Blocked

- **QA-004:** the opentelemetry advisory cannot be patched until livekit-agents allows 1.45 or later.
- **QA-006:** keys found in git history (Next preview key, local LiveKit keys). Rotate them along with INFRA-005.

Carried from Phase 2: the 4 owner-blocked High items (AUTH-009, INFRA-004, INFRA-005, TEST-005), and all earlier decisions.

## Honest limits

- The QA API died once. A fuzz request froze it (APIX-001, now fixed), and the agent then ran `kill -9`. It was restarted without data loss, and the affected tests were rerun.
- My `npm audit fix --omit=dev` removed the frontend dev dependencies partway through. I restored them with `npm install`, then reran the unit tests and the build.
- The repo `node_modules` was repaired with `npm install`, not `npm ci`, because a dev server on :3000 holds files open. The lockfile changed only through the audit fix.
- The performance numbers come from a small data set on one worker, with tests running alongside, so they are a floor.
- **Not executed:**
  - Coverage percentage (pytest-cov is not installed).
  - TypeScript type check.
  - GitHub CI.
  - Real account activation and a real bulk promote.
  - Paid video, quiz and voice paths.
  - Anything in production.
- Data left in the throwaway database `quirri_e2e_test`: journey records prefixed "Journey". Drop the database whenever you like.

## Files changed in Phase 3

- **Backend fixes:**
  - `app/services/ops_monitor.py`
  - `app/services/token_service.py`
  - `app/voice_qna/db.py`
  - `app/voice_qna/security.py`
  - `app/api/v1/users.py`
  - `app/utils/request_guard.py`
  - `app/main.py`
  - `requirements.txt`
  - `requirements.lock.txt`
- **Backend tests:**
  - `tests/integration/test_tenant_write_matrix.py`
  - `tests/integration/test_api_abuse.py`
  - `tests/test_ops_monitor_redaction.py`
  - `tests/test_token_signing.py`
- **Frontend fixes:**
  - `src/lib/superadmin/savedCode.js`, used by the universities and colleges pages
  - Contrast tokens in 8 stylesheets
  - `package-lock.json` (audit fixes)
- **Frontend tests:**
  - `e2e/journeys-*.spec.js` (8 specs) and `e2e/journeys-helpers.js`
  - `src/lib/superadmin/savedCode.test.js`
  - New cases in `src/styles/contrast.test.js`
