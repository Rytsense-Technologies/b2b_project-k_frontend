# 12. RBAC

**Status: Complete**

## Scope

Role and permission enforcement for Super Admin, College Admin, HOD, Faculty, Student.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

144-route matrix (Phase 1), mutating-route matrix across 4 roles, Playwright scoping journeys, frontend rbac and permissions unit tests.

## Results

Role and permission dependencies apply on every route; ops and audit routes Super Admin only; College Admins pinned to their college and can assign only faculty, HOD or student; permissions reset on role change; owner rules: only a Super Admin may demote or deactivate a College Admin, only role `hod` can be set head. Coverage: roles.py 96.1/75.0, rbac.js 100/95.7, permissions.js 100/100, staff_scope 100/100.

## Findings

AUTHZ-006, AUTHZ-010, BACKEND-018 Fixed per owner decisions.

## Remediation status

Complete in code.

## Evidence

../FINAL_SECURITY_AUDIT.md; ../OWNER_DECISIONS.md; ../evidence/coverage/traceability.csv

## Limits / not done

Local only; production roles and seed accounts not inspected.
