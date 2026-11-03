---
type: Postgres Table
title: "edu_video_jobs"
description: "One uploaded chapter and its generated video through review to publish."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/edu_video/job_tracker.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `id` |  |
| `status` | PENDING, EXTRACTING, SCRIPTING, AWAITING_REVIEW, AWAITING_TEACHER_REVIEW, RENDERING, DONE, FAILED |
| `tenant_id / department_id / chapter_id` | scope + placement |
| `chapter_title / source_filename` |  |
| `plan_json` | lesson plan (slides) |
| `sent_to_hod_at / _by` | sent for review |
| `published_at / _by` | live for students |
| `changes_requested_at / _by_user_id / change_note` | open change request (0037) |
| `output_path / storage_*` | video |
| `deleted_at` | soft delete |

# Notes
Review state is derived from the timestamp columns, not `status`.

# Related
[content review loop](/flows/content-review-loop.md) · [edu_video_review_events](/tables/edu-video-review-events.md)
