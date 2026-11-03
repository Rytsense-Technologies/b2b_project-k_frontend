---
type: API Module
title: "Academics API (/api/v1/academics)"
description: "Programmes, semesters, subjects, chapters, staff-subject assignment."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/academics.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/academics/summary` | all staff | counts (live subjects/chapters only) |
| `GET/POST/PATCH` | `/academics/programs[/{id}]` | write: SA, CA, HOD |  |
| `POST/PATCH` | `/academics/programs/{id}/semesters · /semesters/{id}` |  |  |
| `GET/POST/PATCH` | `/academics/semesters/{id}/subjects · /subjects/{id}` |  | subjects include `staff` |
| `GET/POST/PATCH` | `/academics/subjects/{id}/chapters · /chapters/{id}` |  |  |
| `POST` | `/academics/subjects/{id}/chapters/reorder` |  |  |
| `GET` | `/academics/chapters/{id}` | all staff | full path |
| `GET/PUT` | `/academics/staff/{id}/subjects` | read all staff; write SA, CA, HOD |  |
| `GET` | `/academics/staff-subjects` | all staff | `items`: staff -> subject names; `subjects`: staff -> [{id, name}] |

# Notes
Faculty read-only. See [academic structure](/flows/academic-structure-setup.md).
