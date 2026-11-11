# 05. Defect Tracking

**Status: Complete**

## Scope

The issue register, its states and what changed in the client-package work.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Register `docs/audit/ISSUE_REGISTER.md` (copy `UPDATED_ISSUE_REGISTER.md`), one `### ID` entry each with root cause, fix, regression test and evidence.

## Results

| Stage | Fixed | Accepted | Blocked | Needs decision | In Progress | Total |
|---|---|---|---|---|---|---|
| 3 Nov 2026 (after owner decisions) | 196 | 5 | 30 | 5 | 5 | 241 |
| Client-package section (4 to 5 Nov, new) | 28 | 0 | 4 | 7 | 4 (3 In Progress, 1 Open) | 43 |

New section by severity: High 8 (6 Fixed, 2 Needs decision), Medium 18, Low 15, Informational 2. Classification rule: genuine, test defect, environment. Nothing is Fixed without a test that failed first or a named verification.

## Findings

The 3 Nov totals have not been recounted against later status changes.

## Remediation status

Open High items are listed in 30.

## Evidence

../ISSUE_REGISTER.md (section "Client-package issues (4 Nov 2026)"); ../FINAL_ISSUE_CLOSURE_REPORT.md; ../OWNER_DECISIONS.md

## Limits / not done

The register Index table at the top was not extended with the 38 new rows; the new section carries its own table.
