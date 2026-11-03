---
type: Metric
title: "Average score"
description: "Mean of every scored item in range: MCQ percentages and AI interview overall scores (0-100)."
tags: [metric, analytics]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/reports.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Definition
`(sum(mcq_attempts.percentage) + sum(livekit_reports.overall_score)) / (mcq count + interview count)`. Null with nothing scored.

Subject-limited Faculty (`subject_ids` set, see [staff scope](/rules/staff-scope.md)): MCQ attempts only on their subjects' chapters; interview scores stay student-level (interviews are not subject content).
Display bands (ScoreCell): >=75 green, 50-74 teal, <50 orange (never red).
