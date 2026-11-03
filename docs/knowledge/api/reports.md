---
type: API Module
title: "Reports API (/api/v1/reports)"
description: "Preview + CSV / Excel / PDF export."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/reports.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/reports/preview` | SA, CA, HOD | report_type: institution \| department \| student \| qa (`interview` returns 400 while `INTERVIEWS_ENABLED=False`) |
| `GET` | `/reports/download?format=csv\|xlsx\|pdf` | SA, CA, HOD | exactly the previewed rows |

# Notes
CA locked to college, HOD to department; repeated-value columns dropped for them. Same `_activity` aggregate as analytics. Column key `assessments` is labelled **Quizzes**. Interview module off (20 Oct 2026): the `interviews` column is not offered, row keys `interviews` = 0 and `interview_avg` = null stay, and `avg_score` is quizzes only.
