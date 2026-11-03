---
type: Access Rule
title: "HOD / Faculty scope"
description: "HOD = whole department; Faculty = assigned subjects (or whole department read-only with none). Single source: app/services/staff_scope.py."
tags: [rbac, security, hod, faculty]
status: stable
sources:
  - resource: "b2b_projectk/app/services/staff_scope.py"
  - resource: "b2b_projectk/tests/test_hod_faculty.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Rule
| Caller | Sees | Can change (publish, edit slides, approve MCQs, comment) |
|---|---|---|
| HOD | everything in their department | everything in their department |
| Faculty **with** subjects ([subject_staff](/tables/subject-staff.md)) | content linked to those subjects; students of those subjects' programmes **plus students not placed in a programme** | content linked to those subjects |
| Faculty **without** subjects | whole department | nothing (read-only) - 403 with "assigns you subjects" |
| HOD / Faculty without a department | nothing - 400 "no department yet" | nothing |

- Content **not linked to a chapter** belongs to the HOD (Faculty with subjects don't see it).
- Interview assignments: module **off** ([off features](/rules/off-features.md)); those APIs 404.
- Department staff list and department reports: **HOD only**. Faculty hitting `/faculty/staff` or `/faculty/reports` gets the portal 404.
- Numbers for a subject-limited Faculty (`/analytics/department`, `/faculty/students`, `/faculty/students/{id}`): content metrics - [completion](/metrics/completion.md), [watch time](/metrics/watch-time.md), quiz count / [average score](/metrics/average-score.md) MCQ part, [pass rate](/metrics/pass-rate.md), Q&A turns and [Q&A demand](/metrics/qa-demand.md) - count only chapters linked to their subjects; the student record lists only those quizzes. Interview numbers stay student-level. HOD: unchanged (whole department).

# Implementation
- Content metrics: `reports._activity(..., subject_ids=)` + `reports.subject_jobs_select(subject_ids)` (used by `college_insights.college_overview` and `faculty_directory`).
- `build_scope(user, subject_rows)` -> `StaffScope(role, tenant_id, department_id, subject_ids|None, program_ids|None, read_only)`.
- `ensure_staff_job_sync/async(db, job, user, write=)` - department check first (no DB for HOD), then subject check for Faculty.
- Applied in: edu-video job routes (read gate in `_ensure_job_in_scope`, write gate on plan/submit/send/chapter/publish/request-changes/delete/comments), MCQ routes (generate/approve write, get/report read), `GET /edu_video/jobs` list (`subject_ids` filter + `can_review` per job), `/faculty/*`, `/analytics/department`.
- Frontend reads `GET /api/v1/faculty/me` (`useFacultyScope`) to hide actions; the server is the authority.

# Related
[HOD](/roles/hod.md) · [Faculty](/roles/faculty.md) · [content review loop](/flows/content-review-loop.md)
