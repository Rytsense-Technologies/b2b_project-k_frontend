---
type: Flow
title: "What a student can watch"
description: "Students see only published chapters of their own college and department; with a programme set, only that programme's chapters plus unlinked content."
tags: [flow, student, content]
status: stable
sources:
  - resource: "b2b_projectk/app/edu_video/routes.py"
  - resource: "b2b_projectk/app/edu_video/job_tracker.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Rule (`GET /edu_video/student/videos`, `_ensure_student_can_view`)
- `published_at` set, same `tenant_id`, same `department_id` as the student - else 404.
- Student with `program_id`: chapters linked to that programme's subjects **plus** content not linked to any chapter; never another programme's.
- Student without a department sees an empty list.
- Classroom groups videos by subject / semester using the chapter path. The old `/student/classroom` path redirects to My subjects (`/student/subjects`).

# Related
[Student](/roles/student.md) · [chapters](/tables/chapters.md) · [MCQ approval](/flows/mcq-approval.md)
