---
type: Postgres Table
title: "subjects"
description: "A subject taught in one semester of one programme."
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
| `id` |  |
| `semester_id / program_id / department_id / college_id` | denormalised scope |
| `name / code` |  |
| `is_active` |  |

# Notes
Teachers via [subject_staff](/tables/subject-staff.md).

# Related
[chapters](/tables/chapters.md) · [staff scope](/rules/staff-scope.md)
