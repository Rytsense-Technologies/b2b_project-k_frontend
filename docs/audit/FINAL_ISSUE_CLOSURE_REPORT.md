# Final Issue Closure Report

**Date:** 3 Nov 2026 · **Source:** [ISSUE_REGISTER.md](ISSUE_REGISTER.md), also copied as UPDATED_ISSUE_REGISTER.md. Each entry carries its root cause, fix, test and evidence.

## Totals (240 issues across all four phases)

| Severity | Fixed | Blocked | Needs Business Decision | In Progress | Total |
|---|---|---|---|---|---|
| Critical | 1 | 0 | 0 | 0 | 1 |
| High | 11 | 4 | 1 | 0 | 16 |
| Medium | 85 | 13 | 15 | 4 | 117 |
| Low | 74 | 11 | 8 | 0 | 93 |
| Informational | 5 | 3 | 5 | 0 | 13 |
| **Total** | **176** | **31** | **29** | **4** | **240** |

By phase: 218 issues from the Phase 1 audit, 15 from Phase 3 execution and 7 from the Phase 4 independent audit. **Nothing is marked Fixed without a test that failed before the fix and passes after it, or a named verification.**

## Open High issues

| ID | Status | Why it is not closed |
|---|---|---|
| AUTH-009 | Blocked | The code is fixed, but the password is still in git history. The owner must rotate it and check production. |
| INFRA-004 | Blocked | The deploy now passes e-mail settings. The owner must add the secrets and verify delivery. |
| INFRA-005 | Blocked | The owner must rotate the keys in git history. |
| TEST-005 | Blocked | Deploying needs the owner to commit and push. |
| QA-002 | Needs Business Decision | The Next.js major upgrade is a breaking change and needs approval. |

## Decisions waiting for the owner

- **Brand and accessibility:**
  - Orange contrast (UX-002, UX-003, UIX-002).
  - Captions (UX-001).
  - Reset-page button wording (FE-011).
- **Roles and access:**
  - Peer College Admin rules (AUTHZ-010).
  - Whether a faculty head of department gets HOD powers (BACKEND-018).
  - The sign-out window (APIX-005).
- **Content:**
  - One video per chapter (DATA-028).
  - Students who attempted a quiz that is later regenerated (BACKEND-006).
  - Confirmation before deleting chapters (BACKEND-021).
  - Background quiz generation (BACKEND-047).
  - Retrying chapters that failed during planning (FUN-002 follow-up).
  - Taken codes: refuse them or reassign (UIX-001).
- **Operations:**
  - Windows Postgres (DATA-003).
  - Crisis alerts (PIPE-026).
  - Quotas and spend (INFRA-016).
  - Sarvam fallback (INFRA-020).
  - Error tracker (INFRA-021).
  - Privacy and retention (INFRA-022).
  - Retention of deleted jobs (PIPE-021).
  - Job fairness (PIPE-006).
  - Request size limit (APIX-006).
- **Cleanup:**
  - Unused OTP routes (AUTH-015).
  - Dead columns (DATA-030).
  - Dead pipeline code (PIPE-027).
  - Bell events, 8 or 15 (BACKEND-035).
  - The zod 4 migration (QA-003).
  - Super Admin promotion across all colleges (FUN-005).
  - Close UX-012 as not a defect.

## Blocked (non-High)

Most of these need infrastructure, fonts or upstream releases:

- **Fonts:** Tamil fonts and shaping (PIPE-001, BACKEND-026).
- **App code, never picked up after the agent file-ownership split:**
  - Security headers (INFRA-009).
  - Production validators (INFRA-023, INFRA-029).
  - Upload limits and model timeouts (INFRA-018, INFRA-019, INFRA-031).
- **CI and branch protection:** TEST-004, TEST-009.
- **Upstream:** the opentelemetry pin (QA-004).
- **Owner rotation:** keys in history (QA-006).
- **Process:** docs paths (TEST-021), git steps at commit time (FE-028, BACKEND-002), and the remaining frontend performance items (UX-023, UX-027, UX-028).

## In Progress

- **BACKEND-028:** paging and a load test on large lists.
- **BACKEND-031:** a durable mail queue.
- **INFRA-012:** the frontend Docker image build.
- **UX-017:** two pages still miss the 2.5 s LCP target.

## Corrected claims

The Phase 4 audit found 2 earlier "Fixed" claims that did not fully hold, and both have now been completed:

- **APIX-002:** the paid voice routes were missed. Completed by SEC-001.
- **UIX-001:** the college half never worked. Completed by FUN-003.
