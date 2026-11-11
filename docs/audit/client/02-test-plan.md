# 02. Test Plan

**Status: Complete**

## Scope

What was planned, in what order, against which environment, and what happened to each item.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Environments: Windows 11 host with WSL Postgres 18; throwaway stacks per agent on separate ports (browser 8201/3201, performance 8300 to 8304, integration 8400/3400 with SMTP sink 1025 and S3 stand-in 9000). Roles: Super Admin, College Admin, HOD, Faculty, Student. Seeded data: two colleges for e2e; 30,000 students and 10 colleges for performance.

## Results

| Plan item | Outcome |
|---|---|
| Unit, API, auth, real-SQL backend runs | Executed (04) |
| Tenant isolation matrix | Executed (13) |
| Frontend unit and lint | Executed after the 4 Nov restore, coordinator-reported (04) |
| End-to-end on 5 browsers/viewports | Executed before the restore; post-restore re-run: Chromium, Edge and Firefox clean on their latest runs; WebKit and both tablet projects still fail (XB-013, QA-FLAKE-003) (25) |
| Accessibility, responsive | Executed on the pre-restore tree (26, 27) |
| Security, dependency, SBOM | Executed (09, 14, 15) |
| Performance, load, stress, scaling | Executed on one host shared with other agents (17 to 20) |
| Integration, backup/DR, monitoring | Executed with local stand-ins (21, 23, 24) |
| Privacy | Technical half executed; legal half Blocked (16) |
| UAT | Blocked: no real users (29) |
| Production verification | Not possible; never inspected (30) |

## Findings

Plan deviation: the frontend Phase 2 to 4 work sat in a git stash during the 4 Nov coverage, browser, integration and performance runs (COV-001); every frontend result from those runs is labelled, and the stash was restored later that day.

## Remediation status

COV-001 Fixed by the restore (coordinator-reported).

## Evidence

../PHASE_3_EXECUTION_REPORT.md; ../evidence/integration/INT_SUMMARY.md; ../evidence/perf/; ../evidence/coverage/

## Limits / not done

The host had about 11 GB RAM and up to five agents at once, so performance numbers are a floor, not a capacity figure.
