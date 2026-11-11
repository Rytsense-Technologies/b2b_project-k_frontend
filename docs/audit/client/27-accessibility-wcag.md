# 27. Accessibility (WCAG)

**Status: Partial**

## Scope

Automated WCAG checks (axe-core, serious and critical rules) on every signed-in page, plus keyboard and caption checks. No WCAG conformance claim is made.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

`e2e/a11y.spec.js` and `e2e/journeys-a11y.spec.js` (138 signed-in and 2 public checks per browser) and unit contrast tests.

## Results

Post-restore, before the fixes: the programmes-page axe test failed at three viewports in chromium, msedge and webkit and in firefox (serious `list` on `.sa-acad-list`); no colour-contrast failure was among the chromium failures. After XB-010 (valid list of aria-pressed buttons) the a11y failures no longer appear in the failure lists of reruns A and B (the summaries list none). Pre-restore final build: 0 contrast failures in one run each on chromium, firefox and msedge, and 0 axe failures in the first webkit run; before the fixes contrast failed on 21 of 84 probe page loads. The owner accepted the 2.59:1 white-on-orange shortfall (OWNER_DECISIONS row 1), so that is an accepted gap, not a pass.

## Findings

XB-001, XB-002, XB-004 Fixed pre-restore; XB-010 Fixed (the XB-001 symptom had returned after the restore). A11Y-FLAKE-001 In Progress, flake rate (three runs per browser) not measured. UX-001 captions: WebVTT with a toggle, checked through the text-track API only. UX-002, UX-003, UIX-002 accepted by the owner.

## Remediation status

XB-010 fixed by the coordinator.

## Evidence

../evidence/browser/final/*.json; ../evidence/browser/final/rerun2/; ../evidence/browser/probes/; ../ISSUE_REGISTER.md

## Limits / not done

Automated checks catch only part of WCAG. No screen-reader, zoom or reduced-motion manual audit; no flake rate; the way the specs treat the accepted orange nodes was not re-read; captions not played on a real lecture video; whether rerun B included the a11y spec was not checked.
