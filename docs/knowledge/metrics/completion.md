---
type: Metric
title: "Chapter completion"
description: "Published chapters a student watched to the end / published chapters available to them. Cumulative, not range-limited."
tags: [metric, analytics]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/reports.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Definition
`completion = 100 * done / available` where available = published, non-deleted jobs in the student's (college, department); done = those with `video_watch_progress.completed_at`.
Null when nothing is available. Per subject: completed views / (published chapters x learners).

Subject-limited Faculty (`subject_ids` set, see [staff scope](/rules/staff-scope.md)): available = only published chapters linked (via `chapters.subject_id`) to their subjects.

# Used in
Analytics, dashboards, reports, [at-risk](/metrics/at-risk.md). Source table: [video_watch_progress](/tables/video-watch-progress.md).
