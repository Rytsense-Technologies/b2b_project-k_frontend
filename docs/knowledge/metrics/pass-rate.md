---
type: Metric
title: "Pass rate"
description: "Share of MCQ attempts at or above 60% in range."
tags: [metric, analytics]
status: stable
sources:
  - resource: "b2b_projectk/app/services/college_insights.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Definition
`100 * attempts(percentage >= 60) / attempts`. Attempt-level, not student-level. Pass mark constant `PASS_MARK = 60`.

Subject-limited Faculty (`subject_ids` set, see [staff scope](/rules/staff-scope.md)): only attempts on MCQ sets of their subjects' chapters (analytics totals and the student record).
