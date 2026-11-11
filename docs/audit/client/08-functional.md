# 08. Functional

**Status: Partial**

## Scope

Business workflows across the five roles.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Phase 4 traced each workflow from page to API client to route, service and database; Playwright journeys for every sidebar page of 5 roles at 1440 and 390; real-SQL integration tests.

## Results

Held: college provisioning, seat cap and deactivation; invite and activation; academic structure and archive; the content loop (upload, render, HOD review, changes, regenerate, publish, watch) after FUN-002 and FUN-004; MCQ approve, attempt once, reset; notification rules and bell; reports, analytics, leaderboard, exports; year promotion (FUN-001); settings. E-mail: all 15 catalogue events reached the SMTP sink with the right recipient, template and link (22/22). Pre-restore e2e: chromium and msedge 352/352.

## Findings

XB-009 (success toast blocked the main action; Fixed), XB-003 (Sept date; Fixed), INT-001 (Verification code event listed but never sent; Needs decision), PERF-008 (unbounded report responses; Needs decision).

## Remediation status

See register entries.

## Evidence

../FINAL_QA_AUDIT.md; ../evidence/integration/email_smtp.junit.xml; ../evidence/browser/runs/

## Limits / not done

Paid steps (video generation, quiz generation, voice) were stubbed or not run. Real activation by e-mailed link, real bulk promote and live video with captions were not run end to end. Browser state: Chromium, Edge and Firefox clean on their latest runs; WebKit and both tablet projects still fail (XB-013, QA-FLAKE-003).
