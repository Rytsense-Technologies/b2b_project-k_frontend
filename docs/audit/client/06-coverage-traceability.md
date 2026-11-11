# 06. Coverage & Traceability

**Status: Partial**

## Scope

Backend line and branch coverage, frontend coverage, and requirement-to-test traceability.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

pytest 9.1.1 with pytest-cov 7.0.0 (branch, thread and greenlet tracing) over top-level tests, mcq, voice_qna, edu_video and integration; vitest 2.1.9 with coverage-v8; traceability script over 24 knowledge-file requirements.

## Results

Backend: 21,675 statements, **65.3% line, 51.6% branch** (combined 62%). Runs: top level 156 (148 passed, 8 skipped), mcq 73, voice 214, edu_video 341, integration 963 (960 passed, 1 failed = COV-005, 2 skipped), new coverage tests 40/40.

High-risk modules (line / branch): staff_scope 100/100, evaluation_service 96.0/87.5, voice security 97.2/100, roles 96.1/75.0, auth 94.8/77.3, deps 89.4/87.5, users 84.1/70.0, colleges 84.4/53.8, department_service 78.8/50.0, access_denylist 80.0/50.0, edu_video routes 76.1/62.9. Weakest: app/livekit_interview 14.2/0 (module off).

Frontend, measured on the tree WITHOUT the restored work: 2.03% line, 43.43% branch (60 tests, 57 passed, 3 failed = COV-002). Libraries: middleware 98/98, permissions 100/100, rbac 100/95.7, tokens 93.8/84.6.

Traceability: 24 of 24 requirements have linked tests. Thinnest: bulk student import (3 files); the department-change gap was closed by `test_cov_department_change.py`. The method is keyword linkage, evidence not proof.

## Findings

COV-001 and COV-002 (frontend work in a stash; Fixed by restore), COV-003 (Fixed, residual QA-002), COV-005 (Fixed).

## Remediation status

Three coverage test files added; no product code changed by the coverage work.

## Evidence

../evidence/coverage/backend/ (report.txt, coverage.xml, html/, by-module.csv, high-risk.csv); ../evidence/coverage/frontend/; ../evidence/coverage/traceability.csv; ../evidence/coverage/frontend-vitest-results.json

## Limits / not done

Frontend coverage was NOT re-measured after the restore (the 32 restored test files and 380 passing tests have no coverage percentage yet). Branch coverage under 60% for colleges.py, department_service.py, access_denylist.py and job_tracker.py is listed for follow-up. No coverage for tests/perf. Most JSX pages are covered by e2e, not unit tests.
