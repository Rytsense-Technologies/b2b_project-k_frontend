# Quirri B2B: client QA report package

Build: Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

Only executed results are reported. Overall production readiness decision: **FAIL** (see 30). QA sign-off: **not signed** (see 34). Status values: Complete (done as planned, findings may still be open), Partial (some parts not executed or not re-verified), Blocked (cannot proceed without the owner or real users). Browser results (25, 26, 27) are the post-restore runs plus reruns A and B after the XB-010 to XB-012 fixes; WebKit and tablet failures remain open.

| # | Report | Status | Headline |
|---|---|---|---|
| 1 | [Test Strategy](01-test-strategy.md) | Complete | Layers, rules, exit criteria |
| 2 | [Test Plan](02-test-plan.md) | Complete | Plan items and what happened to each |
| 3 | [Test Case Documentation](03-test-case-documentation.md) | Partial | 90 backend test files, 36 vitest files, 11 e2e specs; no manual case library |
| 4 | [Test Execution](04-test-execution.md) | Partial | Backend groups 560/408/414/362 passed, 2 failed (explained), 45 skipped; vitest 380/380 |
| 5 | [Defect Tracking](05-defect-tracking.md) | Complete | 241 issues at 3 Nov plus 43 new; High open items listed |
| 6 | [Coverage & Traceability](06-coverage-traceability.md) | Partial | Backend 65.3% line / 51.6% branch; frontend % not re-measured after restore |
| 7 | [Regression](07-regression.md) | Partial | Backend and vitest green after restore; browser regression per 25 |
| 8 | [Functional](08-functional.md) | Partial | Workflows held; paid and live steps not run |
| 9 | [Application Security](09-application-security.md) | Partial | No known bypass in code; secrets and Next upgrade open |
| 10 | [OWASP Top 10 (2021) Mapping](10-owasp.md) | Partial | A01 to A09 mapped; A10 not assessed |
| 11 | [AuthN / AuthZ](11-authn-authz.md) | Partial | Tokens, lockout, logout revocation tested; AUTH-009 Blocked |
| 12 | [RBAC](12-rbac.md) | Complete | Role enforcement held (local) |
| 13 | [Multi-Tenant Isolation](13-multi-tenant-isolation.md) | Complete | 180-case matrix, no known leakage |
| 14 | [Vulnerability Remediation](14-vulnerability-remediation.md) | Partial | QA-001/003/005 fixed; QA-002, 004, 006 open |
| 15 | [Dependency & SBOM](15-dependency-sbom.md) | Complete | 200 + 140 components; PyMuPDF AGPL needs decision |
| 16 | [Data Privacy & Compliance (technical)](16-data-privacy-compliance.md) | Partial | Technical half done; 0 of 14 DPDP duties fully implemented; legal Blocked |
| 17 | [Performance](17-performance.md) | Partial | Read paths 1.5 to 2.6x faster; large aggregates still 3 to 10 s |
| 18 | [Load](18-load.md) | Complete | p95 limit of 5 s missed at every step on 1 worker (7 s at 10 users) |
| 19 | [Stress](19-stress.md) | Partial | Breaks above about 11 users (p95); 500s at 50+; recovers in 1 s |
| 20 | [Scalability](20-scalability.md) | Partial | 4 workers: 4.4x throughput, p95 6.0 s at 50 users |
| 21 | [API & Integration](21-api-integration.md) | Partial | SMTP 22/22, S3 6/6, contract 110/159 (49 dead calls); LiveKit server checks skipped |
| 22 | [Database Integrity](22-database-integrity.md) | Partial | DR restore matched 45 tables; no production check |
| 23 | [Backup & DR](23-backup-dr.md) | Partial | RTO 39 s, RPO up to 24 h; media not rehearsed |
| 24 | [Monitoring & Reliability](24-monitoring-reliability.md) | Partial | Health and redaction tested; no push alerting exists |
| 25 | [Cross-Browser](25-cross-browser.md) | Partial | Chromium, Edge, Firefox clean on latest run; WebKit and tablets still fail (XB-013, QA-FLAKE-003) |
| 26 | [Responsive](26-responsive.md) | Partial | Tablet back/forward fails repeatably (XB-013); sweep clean pre-restore |
| 27 | [Accessibility (WCAG)](27-accessibility-wcag.md) | Partial | Programmes-list axe failure fixed (XB-010); no WCAG claim |
| 28 | [UI/UX Validation](28-ui-ux-validation.md) | Partial | 138 views clean on chromium (pre-restore tree) |
| 29 | [User Acceptance Testing (UAT)](29-uat.md) | Blocked | Blocked: no real users; scripts and sign-off sheet ready |
| 30 | [Production Readiness](30-production-readiness.md) | Complete | FAIL; 6 High items need the owner |
| 31 | [Deployment & Release](31-deployment-release.md) | Partial | Local compose rehearsal only; no production deploy |
| 32 | [Release Notes / Change Log](32-release-notes-change-log.md) | Complete | Phase 2 to 4, owner decisions and client-package changes |
| 33 | [Environment Configuration](33-environment-configuration.md) | Partial | 136 settings; 66 missing from .env.example; names only |
| 34 | [Final QA Sign-off](34-final-qa-sign-off.md) | Blocked | Not signed; 7 conditions |

Register: [ISSUE_REGISTER.md](../ISSUE_REGISTER.md) (section "Client-package issues (4 Nov 2026)", 43 issues; copy in UPDATED_ISSUE_REGISTER.md). Evidence: [../evidence/](../evidence/).
