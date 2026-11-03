---
type: Flow
title: "Analytics and reports"
description: "One read model feeds dashboards, Insights, and CSV/XLSX/PDF exports."
tags: [flow, analytics, reports]
status: stable
sources:
  - resource: "b2b_projectk/app/services/college_insights.py"
  - resource: "src/components/admin/InsightsView.jsx"
  - resource: "src/components/shared/ReportsWorkspace.jsx"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Analytics
- College Admin: `GET /analytics/college?range&department` — totals, departments, subjects, students, at-risk, score bands, Q&A demand, review queue. Interview cohort is empty while interviews are off.
- HOD / Faculty: `GET /analytics/department?range` — same shape, department / subject scoped.
- Ranges: `last_7_days`, `last_30_days` (API default), `last_90_days`, `this_semester`, `all_time`.
- **“To date” screens** (HOD/Faculty dashboard, Students Performance / At risk, Subjects) send `range=all_time`. The Analytics page keeps the picker (default last 30 days). Omitting range used to look like “no quizzes yet”.

# Reports
`GET /reports/preview` and `/reports/download?format=csv|xlsx|pdf`. Types: institution, department, student, qa. `interview` returns 400 while the module is off. SA any college; CA locked to own college; HOD locked to own department. Faculty have **no** reports module (URL 404). Column `assessments` is labelled Quizzes. `avg_score` is quizzes only while interviews are off.

# Metrics
[Completion](/metrics/completion.md) · [watch time](/metrics/watch-time.md) · [average score](/metrics/average-score.md) · [pass rate](/metrics/pass-rate.md) · [at-risk](/metrics/at-risk.md) · [score distribution](/metrics/score-distribution.md) · [Q&A demand](/metrics/qa-demand.md). [Interview ready](/metrics/interview-ready.md) is disabled.

# Related
[Analytics API](/api/analytics.md) · [Reports API](/api/reports.md)
