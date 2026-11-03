---
type: API Module
title: "Analytics API (/api/v1/analytics)"
description: "College / department insights from one read model."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/services/college_insights.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/analytics/college?range&department` | CA | totals, departments, subjects, students, at_risk, score_distribution, score_bands (strong/ok/focus/none counts of students by quiz average, 80/60 cut-offs; none = no quiz yet), qa_demand, interview_cohort (empty `[]` while interviews are disabled), review_queue, active_assignments (0 while disabled) |
| `GET` | `/analytics/department?range` | HOD, Faculty | same payload, department / subject scoped; subject-limited Faculty get no `departments` rows and no `totals.faculty` / `totals.departments` |

# Notes
Ranges: last_7_days, last_30_days (default), last_90_days, this_semester (Jul-Dec / Jan-Jun), all_time. Metrics: [completion](/metrics/completion.md), [average score](/metrics/average-score.md), [pass rate](/metrics/pass-rate.md), [at-risk](/metrics/at-risk.md), [interview ready](/metrics/interview-ready.md).

HOD / Faculty **Analytics** sends the picked range (default last_30_days). Dashboard, Students (Performance / At risk), and Subjects have no picker and copy is “to date”, so they send `range=all_time`. Omitting range used the API default and read as “no quizzes yet” when older attempts existed.
