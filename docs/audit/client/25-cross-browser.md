# 25. Cross-Browser

**Status: Partial**

## Scope

The Playwright end-to-end suite on Chromium, Microsoft Edge (system channel), Firefox and WebKit at desktop size, plus Chromium and WebKit at tablet size (768x1024).

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Playwright with axe, real API on a throwaway stack (web :3201, API :8201), production build of the restored frontend tree. Three runs are reported separately and never mixed: post-restore before the XB-010 to XB-012 fixes, rerun A (after XB-010 and XB-011) and rerun B (after XB-012). Pre-restore runs are kept for history.

## Results

**1. Post-restore, before the XB-010 to XB-012 fixes** (`evidence/browser/final/*.json`):

| Project | Passed | Failed | Skipped | Total |
|---|---|---|---|---|
| chromium | 341 | 5 | 6 | 352 |
| msedge | 342 | 4 | 6 | 352 |
| firefox | 184 | 149 | 19 | 352 |
| webkit | 331 | 10 | 11 | 352 |
| chromium-tablet | 41 | 2 | 9 | 52 |
| webkit-tablet | 35 | 3 | 14 | 52 |
| **All** | **1,274** | **173** | **65** | **1,512** |

**2. Rerun A, after XB-010 and XB-011** (full Firefox, plus the six previously failing spec files on the other projects; `evidence/browser/final/rerun2/`):

| Project | Passed | Failed | Skipped | Note |
|---|---|---|---|---|
| firefox (full suite) | 352 | 0 | 0 | clean |
| msedge (6 spec files) | 321 | 0 | 0 | clean |
| chromium (6 spec files) | 320 | 1 | 0 | "sidebar offers exactly the expected pages"; passed 15/15 on immediate rerun (flake) |
| webkit (6 spec files) | 306 | 5 | 10 | 3x React #310 on /admin/structure (before XB-012), 2 timeouts |
| chromium-tablet | 29 | 1 | 3 | "back and forward walk the sidebar" timeout |
| webkit-tablet | 22 | 3 | 8 | seat-cap, back/forward and college-create timeouts |

**3. Rerun B, after XB-012** (sidebar, college-admin, super-admin and resilience specs; `evidence/browser/final/rerun/`):

| Project | Passed | Failed | Skipped | Note |
|---|---|---|---|---|
| chromium | 177 | 0 | 0 | clean |
| webkit | 162 | 4 | 11 | 2 timeouts on different tests than in A (semester/subject/chapter; college create), 2 aborted `_rsc` prefetch pageerrors on different pages |
| chromium-tablet | 23 | 1 | 3 | "back and forward walk the sidebar" timeout |
| webkit-tablet | 22 | 2 | 3 | back/forward and seat-cap timeouts |

**Latest state:** Chromium, Edge and Firefox are each clean on their latest run (Chromium 177/0 in B; Edge 321/0 and Firefox 352/0 in A; the one Chromium failure in A passed 15/15 on rerun). **WebKit and both tablet projects are not clean and nothing is marked passed for them.**

**Pre-restore runs (tree WITHOUT the stash; history only):** chromium 352/352; msedge 352/352; firefox 345 of 346; chromium-tablet 47 of 49; webkit full run on an earlier build 339 of 347; webkit-tablet partial 22 of 24.

## Findings

XB-010 (programmes list), XB-011 (Firefox CSP console error on every page) and XB-012 (WebKit React #310 from a page-level redirect) are Fixed. XB-013 (Medium, In Progress): "back and forward walk the sidebar" times out on both tablet projects in A and B; repeatable on tablet, cause not found. QA-FLAKE-003 (Low, Open, test environment): WebKit 60 s timeouts that move between tests from run to run, plus aborted `_rsc` prefetch pageerrors that WebKit reports; the webkit-tablet seat-cap timeout occurred twice (A and B) and is filed under it unless it repeats a third time. Proposed: raise the WebKit timeout and filter aborted `_rsc` prefetch errors in expectHealthyPage. XB-008 (React #310 seen once earlier) stays In Progress; it is probably the same cause as XB-012 but is not closed.

## Remediation status

Fixes applied by the coordinator (unit 380/380, lint clean): XB-010 valid `<ul>`/`<li>` of aria-pressed buttons in AcademicStructureWorkspace.jsx, with the e2e click updated; XB-011 `z.config({ jitless: true })` in `src/lib/validation/fields.js` (zod v4's `Function("")` probe was blocked by the production CSP); XB-012 redirect moved into `next.config.js` redirects().

## Evidence

../evidence/browser/final/*.json; ../evidence/browser/final/rerun2/summary.txt and json; ../evidence/browser/final/rerun/*.json; ../evidence/browser/runs/ (pre-restore logs)

## Limits / not done

Reruns A and B covered only the previously failing spec files on non-Firefox projects, so a full 352-test pass is shown only for Firefox. The unchanged specs were not rerun on the final code. WebKit and tablet failures are open. No real Safari hardware.
