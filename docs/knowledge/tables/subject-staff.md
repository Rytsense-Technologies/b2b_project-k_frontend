---
type: Postgres Table
title: "subject_staff"
description: "Which Faculty / HOD teach which subject (migration 0036)."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/models/academic.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `subject_id` | FK subjects (cascade) |
| `user_id` | FK users (cascade) |
| `department_id / college_id` |  |
| `unique(subject_id, user_id)` |  |

# Notes
Set by College Admin (`PUT /academics/staff/{id}/subjects`); new assignments need an active programme + semester.

# Related
[staff scope](/rules/staff-scope.md) · [Faculty](/roles/faculty.md)
