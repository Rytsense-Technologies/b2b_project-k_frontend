# 29. User Acceptance Testing (UAT)

**Status: Blocked**

## Scope

UAT needs real users from the client (a college admin, an HOD, faculty and students). None was available, so no UAT was executed and nothing here is reported as passed. Ready-to-run scripts and a sign-off sheet follow.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Nothing executed. Scripts were derived from the product flows in `docs/knowledge/` and the journeys covered by automated tests.

## Results

Executed: 0. Passed: 0. Blocked on: named client users, a staging or production-like environment with real e-mail, and agreed test data. Seed e-mail addresses exist for QA only; the owner holds the password.
### Super Admin

| # | Step | Expected result | Pass / Fail | Tester notes |
|---|---|---|---|---|
| 1 | Sign in with the issued account | Dashboard shows platform totals | | |
| 2 | Create a university, then a college with a student seat cap | Both appear; duplicate code is refused with a clear message | | |
| 3 | Create the College Admin and send the invite | Invite e-mail arrives; activation link works once | | |
| 4 | Open Notifications and switch a non-mandatory rule off | Rule saved; mandatory events cannot be switched off | | |
| 5 | Open Platform health and Reports | Uptime, errors and reports load; export downloads | | |
| 6 | Deactivate a test college | Its users can no longer sign in | | |
| 7 | Sign out, press Back | Protected page is not shown | | |

### College Admin

| # | Step | Expected result | Pass / Fail | Tester notes |
|---|---|---|---|---|
| 1 | Sign in and open the dashboard | Own college data only | | |
| 2 | Create a department, programme, semester and subject | Each saved; archive blocked while students are placed | | |
| 3 | Add one student and bulk-import a small file | Students created; seats counted; bad rows reported | | |
| 4 | Assign a HOD (a user with role HOD) and faculty subjects | Assignment saved; staff e-mailed | | |
| 5 | Promote the year for one programme | Result shown; a second promotion in the year asks for confirmation | | |
| 6 | Try to open another college's data by editing the address | Refused | | |
| 7 | View insights and download a report | Numbers match the visible student list | | |

### HOD

| # | Step | Expected result | Pass / Fail | Tester notes |
|---|---|---|---|---|
| 1 | Sign in and open the review queue | Only own-department chapters | | |
| 2 | Open a chapter sent by faculty, request changes | Status Changes Requested; faculty notified | | |
| 3 | Approve and publish a chapter | Chapter visible to students of the programme; a previous published video is unpublished | | |
| 4 | Review and approve generated quiz questions | Questions marked approved | | |
| 5 | Open staff and students | Department scope only | | |

### Faculty

| # | Step | Expected result | Pass / Fail | Tester notes |
|---|---|---|---|---|
| 1 | Sign in and open assigned subjects | Only assigned subjects | | |
| 2 | Upload a document for a chapter | Render starts and shows progress | | |
| 3 | Send the finished video to the HOD | Status Sent to HOD | | |
| 4 | Regenerate after a change request | Chapter shows Regenerating, then returns for review | | |
| 5 | Open student analytics | Own subjects only | | |

### Student

| # | Step | Expected result | Pass / Fail | Tester notes |
|---|---|---|---|---|
| 1 | Activate the account from the e-mail and sign in | Home shows own subjects | | |
| 2 | Open a subject, then a chapter, and play the video | Video plays; captions toggle available | | |
| 3 | Take the quiz once | Score shown; second attempt refused | | |
| 4 | Ask the tutor a question by typing, then by voice | Answer limited to the lesson; fallback voice acceptable | | |
| 5 | Open Progress and Leaderboard | Own progress; leaderboard updates within a minute | | |
| 6 | Change password in Settings, then sign in again | Old session ended; new password works | | |
| 7 | Use the site on a phone-width screen | Pages usable, no sideways scroll | | |

### Sign-off sheet

| Role | Name | Organisation | Scripts run | Passed | Failed | Open defects (ids) | Signature | Date |
|---|---|---|---|---|---|---|---|---|
| Super Admin | | | | | | | | |
| College Admin | | | | | | | | |
| HOD | | | | | | | | |
| Faculty | | | | | | | | |
| Student | | | | | | | | |

Acceptance statement (client to complete): "The undersigned has run the scripts above and accepts / does not accept the system for production use, subject to the listed open defects."

Client signatory: ____________  Quirri representative: ____________

## Findings

None (not executed).

## Remediation status

Needs real users.

## Evidence

../../knowledge/product.md; this page

## Limits / not done

Entire report: UAT is Blocked. A UAT pass is a condition of sign-off (34).
