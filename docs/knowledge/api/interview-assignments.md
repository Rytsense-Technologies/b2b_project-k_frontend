---
type: API Module
title: "Interview assignments API (/api/v1/interview-assignments)"
description: "Cohort interview assignments."
tags: [api, fastapi]
status: disabled
sources:
  - resource: "b2b_projectk/app/api/v1/interview_assignments.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
> **Disabled (20 Oct 2026).** The owner removed the AI interview module. With `INTERVIEWS_ENABLED=False` (default, `app/config.py`) these routes are not mounted and return **404**. Frontend treats that 404 as feature off (empty / hidden), not an error. Models, tables and stored data are kept; set `INTERVIEWS_ENABLED=true` to restore.

# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/interview-assignments · /summary` | CA, HOD, Faculty |  |
| `POST` | `/interview-assignments` | CA, HOD |  |
| `PATCH` | `/interview-assignments/{id}` | CA, HOD |  |
| `POST` | `/interview-assignments/{id}/close` | CA, HOD |  |

# Notes
[interview assignment](/flows/interview-assignment.md). While disabled the `interview_assigned` e-mail is not sent.
