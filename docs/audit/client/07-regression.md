# 07. Regression

**Status: Partial**

## Scope

Did earlier fixes hold, and did later changes break anything.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Full backend re-runs after each phase, frontend vitest, a failing regression test written first for every fix, and an independent Phase 4 re-verification of Critical and High fixes.

## Results

Final backend groups (4 Nov): 560 + 408 + 414 + 362 passed, 2 failed (both explained), 45 skipped (37 stand-in tests run earlier by INT, 8 interview tests covered by the 14/14 flag run). Frontend vitest 380/380, lint 0 errors, build passes after the restore (coordinator-reported). Regressions found earlier and closed: FUN-004, FUN-003, SEC-001 (Phase 4); the Phase 4 sample found 2 claimed fixes that did not fully hold (APIX-002, UIX-001), both completed. The restore of 4 Nov merged 12 conflicted files; the suites above ran after it.

Browser regression: post-restore before the XB-010 to XB-012 fixes: 1,274 passed, 173 failed, 65 skipped of 1,512. Rerun A (after XB-010/011): firefox 352/0 full suite, msedge 321/0, chromium 320/1 (flake, 15/15 on rerun), webkit 306/5, chromium-tablet 29/1, webkit-tablet 22/3. Rerun B (after XB-012): chromium 177/0, webkit 162/4, chromium-tablet 23/1, webkit-tablet 22/2. Chromium, Edge and Firefox are clean on their latest run; WebKit and the tablets are not (see 25).

## Findings

QA-FLAKE-002 (open), A11Y-FLAKE-001 (open, not marked passed), XB-008 (React #310 once in WebKit, not reproduced in 32 tries).

## Remediation status

See register.

## Evidence

../FINAL_REGRESSION_REPORT.md; ../evidence/coverage/frontend-vitest-results.json; ../evidence/browser/

## Limits / not done

Not every Low fix was re-verified. The post-restore state of the XB fixes depends on the browser re-run: Chromium, Edge and Firefox clean on their latest runs; WebKit and both tablet projects still fail (XB-013, QA-FLAKE-003).
