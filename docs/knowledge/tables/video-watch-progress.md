---
type: Postgres Table
title: "video_watch_progress"
description: "How far a student watched a chapter video."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/models/video_watch_progress.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `user_id / job_id` |  |
| `percent` | 0-100 |
| `max_position_seconds` | furthest point watched |
| `completed_at` | set at 100% |
| `updated_at` |  |

# Notes
Unlocks the assessment when `watch_complete` is true (counted `percent` at 100%). Skip-ahead heartbeats may set `limited: true` without completing. Changing department deletes these rows for the previous department.

# Related
[completion](/metrics/completion.md) · [watch time](/metrics/watch-time.md)
