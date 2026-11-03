---
type: Metric
title: "Watch time"
description: "Sum of the furthest point watched per video, in minutes, for progress updated in the range."
tags: [metric, analytics]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/reports.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Definition
`sum(video_watch_progress.max_position_seconds) / 60` where `updated_at >= range start`. Displayed as `Xh YYm`.

Subject-limited Faculty (`subject_ids` set, see [staff scope](/rules/staff-scope.md)): only progress rows whose `job_id` is a chapter linked to their subjects.
