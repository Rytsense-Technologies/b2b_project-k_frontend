---
type: Postgres Table
title: "edu_video_review_events"
description: "Review history of a chapter video (migration 0037)."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/models/ops.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `job_id` | FK edu_video_jobs (cascade) |
| `actor_user_id` |  |
| `action` | sent_for_review \| changes_requested \| regenerated \| changes_dismissed \| published \| comment |
| `note` | max 2000 chars |
| `created_at` |  |

# Notes
Older jobs have upload / sent / published steps synthesised from job columns by `review_log.history`.

# Related
[content review loop](/flows/content-review-loop.md)
