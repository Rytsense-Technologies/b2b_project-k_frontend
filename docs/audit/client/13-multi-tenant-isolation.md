# 13. Multi-Tenant Isolation

**Status: Complete**

## Scope

College, university, department and student boundaries, files, caches and AI retrieval.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

`tests/integration/test_tenant_write_matrix.py` (180 cases: 43 mutating id routes x 4 roles of college A against college B, foreign ids in bodies, mass assignment, notification scopes), a live two-college probe, session and deactivation tests, code review of caches and file paths.

## Results

No known cross-tenant leakage. Tenant matrix group 408/408 in the final run. Boundaries held for college, university deactivation, department and subject scope, student programme and semester, tutor retrieval (filtered by lesson, access by college, department and programme), exports and aggregates, files (no anonymous mounts), caches (none without user or tenant).

## Findings

AUTHZ-001, AUTH-004, AUTH-006, APIX-002, SEC-001 Fixed. Open note: the tutor lesson check trusts the lesson's department, not the job's; nothing moves jobs between departments today.

## Remediation status

Complete.

## Evidence

../FINAL_TENANT_ISOLATION_REPORT.md; backend `tests/integration/test_tenant_write_matrix.py`

## Limits / not done

Production data, nginx routing and second-tenant data at scale not verified; tutor retrieval not tested with a live paid call.
