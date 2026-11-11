# Final Regression Report

**Date:** 3 Nov 2026 · **Code:** final working trees of both repositories, after all Phase 4 fixes. Every number below comes from a run executed after the last code change.

| Suite | Executed | Passed | Failed | Skipped | Notes |
|---|---|---|---|---|---|
| Backend: integration, real SQL (chunk 1) | 384 | 384 | 0 | 0 | |
| Backend: tenant matrix, API rules, platform rules (chunk 2) | 407 | 407 | 0 | 0 | |
| Backend: edu_video and MCQ | 388 | 388 | 0 | 0 | |
| Backend: voice tutor and other unit and API tests | 366 | 358 | 0 | 8 | The 8 are interview tests, off by design |
| Backend: interview routers with the flag on | 14 | 14 | 0 | 0 | Covers the 8 skips |
| **Backend total** | **1,545** | **1,537** | **0** | **8** | Each skip is accounted for |
| Frontend unit (vitest) | 304 | 304 | 0 | 0 | |
| End-to-end (Playwright, real API, 5 roles, 1440 and 390) | 252 | 192 | 60 | 0 | All 60 are axe `color-contrast` failures on the locked orange `#F5821F`, Blocked on the UX-002/UX-003 decision. The assertions are unchanged. |
| ESLint | — | 0 errors | — | — | 7 warnings (hook dependencies, one aria attribute) |
| Production build (`next build`) | — | exit 0 | — | — | |
| Load test (20 concurrent, 15 s × 5 routes) | 3,418 requests | 0 errors | — | — | Super Admin dashboard p95 1.3 s; others p95 0.47–0.66 s |

## Regressions found and closed in Phase 4

| ID | What regressed or was incomplete | Result |
|---|---|---|
| FUN-004 | After the BACKEND-004 change, a regenerating chapter still offered "Review edits", and clicking it returned 400. | Fixed; it now shows "Regenerating…" |
| FUN-003 | UIX-001's college half read the wrong response field. | Fixed, with a test |
| SEC-001 | APIX-002 missed the paid voice routes. | Fixed, with 4 tests |

## Unexplained failures

None. Every failure seen in Phases 3 and 4 was reproduced and classified as a genuine defect, a test defect or an environment issue. See [FINAL_TEST_RESULTS.md](FINAL_TEST_RESULTS.md).

## Not executed

- GitHub CI.
- The frontend Docker image build.
- A coverage percentage (pytest-cov is not installed in the app environment).
- TypeScript type checking.
- Paid video, quiz and voice paths.
- Anything in production.
