---
type: Postgres Table
title: "interview_assignments"
description: "A mock / full AI interview assigned to a cohort."
tags: [table, postgres]
status: disabled
sources:
  - resource: "b2b_projectk/app/models/interview_assignment.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---

> **Disabled (20 Oct 2026).** The owner removed the AI interview module from every portal. The backend keeps the code and data but does not mount the interview routers while `settings.INTERVIEWS_ENABLED` is false (the default). Set it to true to restore.
# Schema
| Column | Meaning |
|---|---|
| `tenant_id / department_id` | scope |
| `title / mode` | mock \| full |
| `final_year_only / year_of_study` | cohort |
| `due_at / notes` |  |
| `status` | active \| closed |
| `created_by` |  |

# Notes


# Related
[interview assignment](/flows/interview-assignment.md) · [interview eligibility](/flows/interview-eligibility.md)
