---
type: API Module
title: "Faculty API (/api/v1/faculty)"
description: "HOD / Faculty portal data."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/faculty_directory.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/faculty/me` | HOD, Faculty | scope + capabilities (`can_assign_interviews` false while interviews are disabled) |
| `GET` | `/faculty/overview` | HOD, Faculty | dashboard counts + queue |
| `GET` | `/faculty/students` | HOD, Faculty | search, status, program_id, semester_id, year_of_study, paging, summary; rows carry avg_score, quiz_avg, interview_avg (null while interviews are disabled) |
| `GET` | `/faculty/students/{id}` | HOD, Faculty | record + quizzes (`can_download`) + interviews (`[]` while disabled) |
| `GET` | `/faculty/subjects` | HOD, Faculty | subjects + chapters + unlinked (HOD) |
| `GET` | `/faculty/staff` | HOD only | staff + subjects (Faculty portal URL is 404) |

# Notes
[staff scope](/rules/staff-scope.md). Faculty has no `/faculty/staff` or `/faculty/reports` in the portal (404). HOD reports use [reports](/api/reports.md) with department scope. Dashboard / students / subjects should send analytics `range=all_time`.
