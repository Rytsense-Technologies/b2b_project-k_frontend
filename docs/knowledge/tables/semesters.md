---
type: Postgres Table
title: "semesters"
description: "Semester N of a programme."
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
| `program_id` |  |
| `college_id` |  |
| `number` | 1..N |
| `name` | editable, default "Semester N" |
| `is_active` |  |

# Notes
Student `semester_id` points here; year of study derives from it.

# Related
[programs](/tables/programs.md) · [subjects](/tables/subjects.md)
