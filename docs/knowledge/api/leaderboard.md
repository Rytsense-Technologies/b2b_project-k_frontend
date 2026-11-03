---
type: API Module
title: "Leaderboard API (/api/v1/leaderboard)"
description: "Cohort ranking by MCQ average."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/leaderboard.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/leaderboard?limit&job_id` | student, staff | department cohort; `me` always included |

# Notes
Rank by average MCQ %, ties by total correct then earliest; standard competition ranking (1, 2, 2, 4).
