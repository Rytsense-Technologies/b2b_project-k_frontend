---
type: Metric
title: "At-risk student"
description: "A student flagged for attention: low scores, behind on chapters, or no activity in the period."
tags: [metric, analytics]
status: stable
sources:
  - resource: "b2b_projectk/app/services/college_insights.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Rules (`at_risk_reasons`)
- quiz average < 40 -> "Low quiz scores"; with no quiz yet, mock interview average < 40 -> "Low mock interview scores" (**does not fire** while interviews are off);
- completion < 25% with at least 2 chapters available -> "Behind on chapters";
- no watch time, Q&A, quizzes or interviews in the range -> "No learning activity".
Sorted by number of reasons, then lowest score.
