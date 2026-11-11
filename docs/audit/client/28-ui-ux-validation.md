# 28. UI/UX Validation

**Status: Partial**

## Scope

Conformance to the design locks (Poppins 400/500, radii 6/8/16, canvas #EEF0F0, white sidebar, one orange #F5821F, one teal block per page) and basic usability.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Playwright DOM checks over 46 pages x 3 widths (1440, 768, 390) = 138 views on chromium, run on the tree before the 4 Nov restore.

## Results

138 of 138 views clean for fonts, radius, canvas, sidebar, teal-block rule, title tooltips, dates, junk text and sideways scroll. Deviations found and fixed: XB-006 (donut centre total bold at 22/26 px), XB-007 (faculty status-pill dot 8 px instead of 6), XB-009 (success toast covered the main action and blocked it while hovered), XB-003 (short dates read "Sept"). Observation: the topbar bell takes its own row at 768 and 390 by design rule.

## Findings

XB-003, XB-006, XB-007, XB-009 Fixed. UX-017 (two pages miss the 2.5 s LCP target) In Progress. Owner accepted the 2.59:1 orange contrast as brand (OWNER_DECISIONS row 1).

## Remediation status

XB fixes are in the working tree; the restore of 4 Nov merged the frontend work, and the post-restore sweep is covered in 26 (Chromium, Edge and Firefox clean on their latest runs; WebKit and both tablet projects still fail (XB-013, QA-FLAKE-003)).

## Evidence

../evidence/browser/screens/; ../OWNER_DECISIONS.md

## Limits / not done

Chromium only for the sweep; no usability test with real users (UAT Blocked, 29); no live video playback check with captions.
