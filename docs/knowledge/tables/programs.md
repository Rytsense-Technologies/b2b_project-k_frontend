---
type: Postgres Table
title: "programs"
description: "A programme (e.g. B.E. Computer Science) run by one department."
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
| `college_id / department_id` | scope |
| `name / code` |  |
| `duration_years` | 1-6 |
| `semesters_per_year` | 1-3 |
| `is_active` |  |

# Notes
Drives semester generation.

# Related
[semesters](/tables/semesters.md) · [academic structure](/flows/academic-structure-setup.md)
