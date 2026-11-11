# Final Tenant Isolation Report

**Date:** 3 Nov 2026 · **Result: no known cross-tenant data leakage.** This is verified in code, by tests and by live probes on the local QA stack. Production is not verified.

## Isolation boundaries

| Boundary | Enforced by | Verified by |
|---|---|---|
| College (tenant) | `tenant_id` filters on every scoped query. `get_current_user` refuses non-superadmins with no college. College Admins are pinned to their own college. | `tests/integration/test_tenant_write_matrix.py` (180 tests: 43 mutating id routes × 4 roles of college A against college B, foreign ids in bodies, mass assignment, notification scopes); live two-college probe (Phase 3) |
| University | A deactivated university or college blocks sign-in, refresh and every request, including the voice routes. Its sessions are revoked. | `test_sessions.py`, `test_voice_identity_revocation.py` |
| Department (HOD, faculty) | Department and subject scope on content, MCQ, reports and the review queue. | Integration tests; Playwright `journeys-scoping.spec.js` |
| Student (programme, semester) | Publish state, visibility and programme scope on chapters, quizzes and the tutor. | `test_publish_and_access_rules.py`, tutor access tests |
| Voice tutor (AI) | Retrieval is filtered by lesson; lesson access is checked by college, department and programme; each conversation belongs to one user. | Phase 4 code review; `tests/voice_qna` |
| Exports and aggregates | Reports, analytics, leaderboard and CSV are scoped; formulas are neutralised. | Phase 3 live probe; read-model tests |
| Files | No anonymous mounts; server-set paths. | `test_stored_files_are_not_served_anonymously` |
| Caches | None keyed without user or tenant. | Phase 4 code review |

## History

| Issue | Phase | Status |
|---|---|---|
| AUTHZ-001: public file mounts (Critical) | 1 | Fixed, re-verified |
| AUTH-004: resend-activation probing across colleges | 1 | Fixed, re-verified |
| AUTH-006: users of a deactivated college still working | 1 | Fixed, re-verified |
| APIX-002, SEC-001: voice routes accepting ended sessions | 3, 4 | Fixed, re-verified |

## Not covered

- **Production:** data, nginx routing and shared hosts.
- **Second-tenant data at scale:** the test data is small.
- **Paid paths:** the tutor's retrieval is checked in code and tests, but not with a live paid call.
