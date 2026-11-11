# 01. Test Strategy

**Status: Complete**

## Scope

How Quirri B2B (Next.js 14 frontend, FastAPI backend, Postgres, LiveKit voice tutor) was tested for the client package: layers, rules, entry and exit criteria. Production was never in scope.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Strategy only; the executed counts are in 04-test-execution.md.

| Layer | Tool | Purpose |
|---|---|---|
| Backend unit, API, auth | pytest on throwaway databases built by the migrations | Rules, permissions, token handling |
| Real-SQL integration and tenant matrix | pytest, real Postgres | Cross-college isolation, constraints, migrations |
| Frontend unit | vitest | Libraries: tokens, permissions, RBAC, dates, contrast |
| End-to-end | Playwright on a production build and a throwaway API, 5 roles | Journeys, scoping, settings, resilience |
| Accessibility | axe-core inside Playwright | Serious and critical violations per page |
| Static analysis | ruff, bandit, ESLint | Code defects |
| Dependencies | pip-audit, npm audit, CycloneDX SBOM, licence scan, gitleaks | Supply chain and secrets |
| Performance | locust, EXPLAIN ANALYZE | Load, stress, scaling, query plans |
| Integration | Mailpit (SMTP sink), moto (S3 stand-in), docker compose rehearsal | E-mail, storage, backup and restore, deploy |
| Privacy | pytest plus a code-derived data inventory | Redaction, hashing, exports, retention |

## Results

Rules applied to every run: no production, no paid calls (Sarvam, LLM, real SES or S3, LiveKit Cloud); only `quirri_<key>_*_test` databases; every failure classified as genuine, test defect or environment; assertions never weakened; no failure hidden. Exit criteria used: no Critical or High unresolved without an owner decision, no unexplained failing test, tenant isolation held, build and lint clean.

## Findings

None specific to the strategy. The first coverage run under-reported async code (default tracing); numbers were re-measured with greenlet-aware tracing (see 06).

## Remediation status

n/a

## Evidence

../FINAL_QA_AUDIT.md; ../PHASE_3_EXECUTION_REPORT.md; ../evidence/coverage/scripts/

## Limits / not done

Production, GitHub CI, paid video/quiz/voice paths and real users were out of reach by design (see 30 and 34).
