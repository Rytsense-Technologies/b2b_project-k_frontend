---
type: Postgres Table
title: "departments"
description: "A department of a college, with its HOD."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/models/department.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `id` | uuid PK |
| `college_id` | tenant |
| `name / code` |  |
| `hod_user_id` | the HOD - must be an active `hod` user of THIS department and college (a faculty user is 422: change their role to HOD first) |
| `is_active` | archive flag |

# Notes
Archive blocked (409) with enrolled students unless forced.

HOD rule (`department_service.assert_hod_eligible`): POST / PATCH `/departments` with any other `hod_user_id` -> 422 with a clear message (not found in this college / only an HOD or Faculty member / account isn't active / belongs to a different department). When a user's department, role or active state changes (`PATCH /users/{id}`, `/users/{id}/role`, `/users/{id}/deactivate`) they are cleared as HOD of any department they no longer qualify for (`release_hod_posts`). List / detail report `hod_user_id` / `hod_name` only while the stored HOD is still valid (`resolve_hod`), else null. HOD picker: HOD accounts only (`GET /users?role=hod`, filtered to this department and active).

# Related
[academic structure](/flows/academic-structure-setup.md) · [HOD](/roles/hod.md)
