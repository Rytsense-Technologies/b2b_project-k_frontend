# 30. Production Readiness

**Status: Complete**

## Scope

Go or no-go for production. **Decision: FAIL.** Production itself was never inspected, so the live environment is NOT VERIFIED.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Closure criteria applied to the register, final test runs and the client-package results.

## Results

| Criterion | Met |
|---|---|
| All Critical resolved | Yes (AUTHZ-001) |
| All High resolved | **No** |
| Actionable Medium and Low fixed or accepted | No |
| No known cross-tenant leakage | Yes |
| No known privilege escalation | Yes |
| Required regression tests pass | Yes, with QA-FLAKE-002 open |
| Production verified | **No** |
| UAT | **No** (Blocked) |

Open High items:

| ID | State | Owner action |
|---|---|---|
| AUTH-009 | Blocked | Rotate the seed Super Admin password still in git history; check production |
| INFRA-005 | Blocked | Rotate API keys in backend git history, plus LiveKit keys (QA-006) |
| INFRA-004 | Blocked | Add e-mail secrets to GitHub and confirm invites and resets are delivered |
| TEST-005 | Blocked | Commit and push, then confirm the first CI run is green |
| QA-002 | Needs Business Decision | Approve the major Next.js upgrade (14 to 15 or 16); 2 production audit findings remain (next critical, postcss high) |
| PERF-006 | Needs Business Decision | One API worker cannot serve realistic load (p95 above 5 s from about 11 users); choose 4+ workers with pool sizing, caching, or moving aggregates off the event loop |

Also open: PRIV-004 (High, no consent, erasure or breach process; owner and legal), COV-004 (AGPL PyMuPDF).

## Findings

See table.

## Remediation status

All six High items need the owner; none can be closed in code from here.

## Evidence

../PRODUCTION_READINESS_REPORT.md; ../FINAL_ISSUE_CLOSURE_REPORT.md; ../evidence/perf/results/summary.json

## Limits / not done

Production (nginx, TLS, live .env, e-mail, S3, backups) never inspected; GitHub CI never run; frontend production image not built from the restored tree.
