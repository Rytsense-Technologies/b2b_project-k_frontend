---
type: Postgres Table
title: "chapters"
description: "An ordered unit of a subject; uploaded content links to it."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/models/academic.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `id` |  |
| `subject_id` |  |
| `department_id / college_id` |  |
| `title` |  |
| `position` | order |
| `is_active` |  |

# Notes
`edu_video_jobs.chapter_id` links content; decides Faculty review scope and student programme filtering.

# Related
[edu_video_jobs](/tables/edu-video-jobs.md) · [student content access](/flows/student-content-access.md)
