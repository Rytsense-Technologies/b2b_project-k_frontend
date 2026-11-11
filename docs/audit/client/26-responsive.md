# 26. Responsive

**Status: Partial**

## Scope

Layout at 1440, 768 and 390 pixel widths for all five roles.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Chromium DOM sweep of 46 pages at 1440x900, 768x1024 and 390x844 (138 views) before the restore; desktop e2e journeys at 1440 and 390; tablet journeys (768x1024) in chromium and webkit.

## Results

Pre-restore sweep: 138 of 138 views clean for sideways scroll, fonts, radii, canvas, sidebar and title tooltips (the topbar bell takes its own row at 768 and 390 by design). Tablet journeys on the restored tree:

| Run | chromium-tablet | webkit-tablet |
|---|---|---|
| Post-restore, before fixes | 41 passed, 2 failed, 9 skipped | 35 passed, 3 failed, 14 skipped |
| Rerun A | 29 passed, 1 failed, 3 skipped | 22 passed, 3 failed, 8 skipped |
| Rerun B | 23 passed, 1 failed, 3 skipped | 22 passed, 2 failed, 3 skipped |

The repeatable tablet failure is "back and forward walk the sidebar" (XB-013, both projects, A and B). The webkit-tablet seat-cap and college-create timeouts fit QA-FLAKE-003.

## Findings

XB-013 In Progress; QA-FLAKE-003 Open; XB-006, XB-007, XB-009 Fixed pre-restore.

## Remediation status

Tablet back/forward failure needs diagnosis; nothing is marked passed for the tablets.

## Evidence

../evidence/browser/screens/; ../evidence/browser/final/chromium-tablet.json, webkit-tablet.json; ../evidence/browser/final/rerun2/; ../evidence/browser/final/rerun/

## Limits / not done

The 138-view sweep was not repeated on the restored tree. No real phone or tablet hardware. Landscape and 1024 to 1280 widths not swept.
