# 11. AuthN / AuthZ

**Status: Partial**

## Scope

Sign-in, sessions, tokens, lockout, reset, activation and authorization dependencies.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Backend auth and session tests on real SQL, token tests, `tests/integration/test_owner_decisions_decb.py`, frontend token and route-guard tests, probes for all 5 roles.

## Results

Refresh tokens rejected as access tokens for all 5 roles; one shared refresh per tab with a 30-second grace window and replay detection; cookies httpOnly, SameSite strict, Secure in production; lockout answers 401 per account plus source; logout revokes the access token (denylist); password change ends sessions; deactivated colleges and universities block sign-in. OTP, reset and activation links are single-use and stored hashed. Coverage: auth.py 94.8% line / 77.3% branch, deps.py 89.4 / 87.5, middleware.js 98 / 98.

## Findings

AUTH-001, 003, 004, 006, 010, 011, SEC-002, APIX-004 Fixed. AUTH-009 (seed password in history) Blocked on owner. QA-FLAKE-002 (logout test intermittent, test client). Rate limiting needs uvicorn to trust the proxy, or all users share one address.

## Remediation status

Code complete; AUTH-009 needs password rotation and a check of the production account.

## Evidence

../FINAL_SECURITY_AUDIT.md; ../evidence/coverage/backend/high-risk.csv; ../OWNER_DECISIONS.md (rows 2 and 24)

## Limits / not done

Real e-mailed activation not run end to end; production account existence not checked; the login UI is frozen, so no UI-side change was possible.
