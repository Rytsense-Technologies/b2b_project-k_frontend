# 09. Application Security

**Status: Partial**

## Scope

Security of the code, API, sessions, files and dependencies. Production not inspected.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Independent source review (Phase 4), exploratory attacks (IDOR, role escalation, mass assignment, token reuse after logout and password change, CORS, input fuzzing, races, CSV injection, error leakage), ruff, bandit, pip-audit, npm audit, gitleaks.

## Results

No known authentication bypass, privilege escalation or cross-tenant access in code. 15 Critical and High fixes re-verified. Static: ruff clean; bandit 1 high (fixed, QA-005) and 29 low. Dependencies: pip-audit 1 advisory (opentelemetry-api, QA-004); npm audit production 2 left after the restore (next critical, postcss high; QA-002, coordinator-reported). Secrets: git history still holds the seed password and keys (AUTH-009, INFRA-005, QA-006). Request body limit of 1 MB decided and implemented; API security headers still missing (INFRA-009, Blocked).

## Findings

Critical AUTHZ-001 (Fixed). High: AUTH-001, AUTH-003, AUTH-004, AUTH-006, APIX-001, APIX-002, SEC-001 (Fixed); AUTH-009, INFRA-005 (Blocked, owner); QA-002 (Needs decision). PRIV-001 (High, Fixed).

## Remediation status

Code fixes done; rotation of secrets and the Next upgrade are owner actions (30).

## Evidence

../FINAL_SECURITY_AUDIT.md; ../evidence/sbom/audit-summary.json; ../evidence/privacy/pytest_privacy_final.log

## Limits / not done

No penetration test against production; no DAST scanner; SSRF and upload malware scanning not tested as separate suites; paid-path abuse not tested.
