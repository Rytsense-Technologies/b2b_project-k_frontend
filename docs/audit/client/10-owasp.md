# 10. OWASP Top 10 (2021) Mapping

**Status: Partial**

## Scope

Findings and checks mapped to the OWASP Top 10 2021 categories.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Mapping of register issues and executed checks; no separate OWASP scanner was run.

## Results

| Category | Findings and checks | State |
|---|---|---|
| A01 Broken access control | AUTHZ-001 (public file mounts), AUTH-004, AUTH-006, AUTHZ-006, AUTHZ-010, APIX-004; 180-case tenant write matrix, 43 routes x 4 roles | Fixed, held |
| A02 Cryptographic failures | AUTH-009 (seed password in history), INFRA-005 / QA-006 (keys in history), JWT moved to PyJWT (QA-001), SHA1 flagged (QA-005) | Code fixed; rotation Blocked on owner |
| A03 Injection | No SQL injection (queries parameterised); CSV formulas neutralised; NUL byte 500s (APIX-003); regex stall on huge fields (APIX-001) | Fixed |
| A04 Insecure design | Sign-out window (APIX-005, denylist adopted), request size (APIX-006, 1 MB), lockout, PERF-006 capacity | Decided; PERF-006 open |
| A05 Security misconfiguration | INFRA-009 headers, INFRA-023/029 production validators, INFRA-004 e-mail config, INT-004 .env.example gaps, INT-010 import crash on empty OPENAI_API_KEY | Mostly Blocked or open |
| A06 Vulnerable and outdated components | QA-001 (77 vulns fixed), QA-002 Next, QA-003 zod (done), QA-004 opentelemetry, COV-003, COV-004 (AGPL) | QA-002, QA-004, COV-004 open |
| A07 Identification and authentication failures | AUTH-001, AUTH-003, AUTH-010, AUTH-011, SEC-002 (voice tokens survived a password change) | Fixed |
| A08 Software and data integrity failures | CI never run on GitHub (TEST-004/005/009), unresolvable lock file (INT-008, Fixed), deploy gates | Open (owner) |
| A09 Security logging and monitoring failures | PRIV-001/002/003 (secrets and addresses in logs, Fixed), no push alerting (INFRA-021) | Fixed / open |
| A10 Server-side request forgery | No finding recorded; not tested as a separate suite | Not assessed |

## Findings

See table; every id resolves in the register.

## Remediation status

See 14.

## Evidence

../FINAL_SECURITY_AUDIT.md; ../ISSUE_REGISTER.md

## Limits / not done

The mapping is the report writer's, from register text. A10 was not specifically assessed.
