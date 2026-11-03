---
type: API Module
title: "Edu video API (/edu_video)"
description: "Upload, generation, review loop, student playback. Mounted at /edu_video (not /api/v1)."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/edu_video/routes.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `POST` | `/edu_video/upload` | CA, SA (UI); API also HOD / Faculty in scope | 429 over the college's daily upload cap (message shown verbatim) |
| `GET` | `/edu_video/jobs` | CA, HOD, Faculty, SA | scoped list; filters `review_state` (to_review - oldest sent first / changes_requested / in_progress / published), `subject_id`, status, department_id, q; `subject_id`, `subject_name`, `can_review`, `changes_requested_at`, `change_note`, `mcq_status`, `mcq_approved`, `mcq_question_count` |
| `GET/PUT` | `/jobs/{id}/plan` | CA, SA (UI); API also HOD / Faculty in scope | lesson plan |
| `POST` | `/jobs/{id}/submit · /send_to_teacher · /send-to-hod` | CA, SA (UI); API also HOD / Faculty in scope |  |
| `PATCH` | `/jobs/{id}/chapter` | CA, SA (UI); API also HOD / Faculty in scope | link to chapter |
| `POST` | `/jobs/{id}/publish` | HOD, Faculty in scope only (403 for CA/SA since 26 Oct 2026) | needs sent to HOD (400) and a finished video: status DONE + output_path (409) |
| `POST` | `/jobs/{id}/request-changes` | HOD, Faculty (scope) | {plan, note} |
| `POST` | `/jobs/{id}/regenerate · /dismiss-changes` | CA, SA |  |
| `GET/POST` | `/jobs/{id}/history · /comments` | in scope |  |
| `GET` | `/download/{id}` | in scope | video |
| `GET` | `/edu_video/student/videos` | student |  |
| `GET/PUT` | `/student/watch-progress/{job_id}` | student |  |

# Notes
Roles in code: JOB_ROLES = college_admin, faculty, hod, superadmin (every job route; HOD / Faculty further limited by [staff scope](/rules/staff-scope.md), write routes need edit rights); request-changes / publish = HOD, Faculty only; regenerate / dismiss-changes = college_admin, superadmin. See [content review loop](/flows/content-review-loop.md).

`mcq_status` per job (one batched query on [mcq_documents](/tables/mcq-documents.md)): `none` (no set) | `generating` (pending / generating) | `failed` | `awaiting_approval` (ready, not approved) | `approved`. `mcq_approved` = status is `approved`. See [MCQ approval](/flows/mcq-approval.md).

Publish notifications (`content_published`, `assessment_available`) go only to students who can open the chapter: same college + department, and for a chapter linked to a programme only that programme's students (plus students with no programme).
