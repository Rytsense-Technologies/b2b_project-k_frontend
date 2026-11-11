# 04. Test Execution

**Status: Partial**

## Scope

Everything that was executed, with counts. Browser numbers for the restored tree are in 25.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Final backend run (coordinator, 4 Nov 2026) and agent runs.

## Results

| Suite | Executed | Passed | Failed | Skipped | Note |
|---|---|---|---|---|---|
| Backend integration folder | 599 | 560 | 2 | 37 | The 37 skips need Docker, Mailpit or S3 stand-ins (executed earlier by INT, see 21) |
| Tenant matrix group | 408 | 408 | 0 | 0 | |
| Pipeline and MCQ group | 414 | 414 | 0 | 0 | |
| Voice and unit group | 370 | 362 | 0 | 8 | 8 interview tests off by design |
| Interview-flag run | 14 | 14 | 0 | 0 | Covers those 8 skips |
| Frontend vitest (after restore) | 380 | 380 | 0 | 0 | Coordinator-reported |
| ESLint / production build (after restore) | | 0 errors / passes | | | Coordinator-reported |

The two failures: `test_tracked_livekit_files_hold_no_secret_value` (stray empty Docker-created folder, removed; passes) and `test_logout_revokes_the_bearer_on_sync_routes_and_the_tutor` (passes 3/3 alone; intermittent asyncpg event-loop error, QA-FLAKE-002, open).

Agent runs: coverage (see 06), performance regression 8/8, INT files (see 21), privacy 95 of 97 before the INT fix, SBOM and audits (15).

Browser: post-restore before the XB-010 to XB-012 fixes: 1,274 passed, 173 failed, 65 skipped of 1,512. Rerun A (after XB-010/011): firefox 352/0 full suite, msedge 321/0, chromium 320/1 (flake, 15/15 on rerun), webkit 306/5, chromium-tablet 29/1, webkit-tablet 22/3. Rerun B (after XB-012): chromium 177/0, webkit 162/4, chromium-tablet 23/1, webkit-tablet 22/2. Chromium, Edge and Firefox are clean on their latest run; WebKit and the tablets are not (see 25).

## Findings

QA-FLAKE-002 (Low, In Progress); COV-005 (Fixed).

## Remediation status

Both failures accounted for; one is open as a flake.

## Evidence

../FINAL_TEST_RESULTS.md (3 Nov baseline); ../evidence/coverage/scripts/; ../evidence/perf/results/pytest_perf_final.log; ../evidence/integration/*.junit.xml; ../evidence/privacy/pytest_privacy_final.log

## Limits / not done

The group totals are as reported by the coordinator (executed = passed + failed + skipped); the report writer did not re-run suites. GitHub CI has never run. Paid paths and production were not executed.
