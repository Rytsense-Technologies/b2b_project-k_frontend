# 03. Test Case Documentation

**Status: Partial**

## Scope

Where the test cases live and how many exist by area. Automated cases are documented by name in the test files; there is no separate manual case repository apart from the UAT scripts in 29.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Counted by file listing (no suite was run for this report).

| Area | Location | Files |
|---|---|---|
| Backend top level (unit, API, auth, ops) | backend `tests/*.py` | 11 |
| Backend real-SQL integration (tenant matrix, API abuse, owner decisions, privacy, INT stand-ins) | `tests/integration/` | 42 |
| Backend video pipeline | `tests/edu_video/` | 25 |
| Backend MCQ | `tests/mcq/` | 4 |
| Backend voice tutor | `tests/voice_qna/` | 7 |
| Backend performance regression | `tests/perf/` | 1 |
| Frontend unit (vitest) | `src/**/*.test.js` | 36, plus `docker-image.int.test.mjs` at the root |
| End-to-end (Playwright) | `e2e/*.spec.js` | 11 specs, plus `roles.js` and `journeys-helpers.js` |

## Results

Case counts from the runs: e2e 352 per desktop browser (pre-restore final build), integration folder 560 passed in the final backend run, tenant group 408, pipeline and MCQ group 414, voice and unit group 362 passed with 8 skipped, privacy 97 cases, SMTP 22, performance regression 8, frontend vitest 380 (after restore). See 04.

## Findings

None.

## Remediation status

n/a

## Evidence

backend `tests/`; frontend `src/**/*.test.js` and `e2e/`; ../evidence/coverage/traceability.csv (24 requirements mapped to tests)

## Limits / not done

No per-case ID catalogue or manual case library exists. The frontend unit file count is from the restored tree.
