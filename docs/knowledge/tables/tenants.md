---
type: Postgres Table
title: "tenants (colleges)"
description: "A college; the tenant boundary of the platform."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/models/tenant.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `id` | uuid PK = users.tenant_id |
| `name / slug / code` | code unique |
| `university_id` | parent university |
| `country / state / district / city / pincode` | India location fields |
| `student_seat_cap` | max students (null = no cap). List / detail also return `seats_used` (active + pending students, deactivated excluded): the cap check, the PATCH cap floor and the UI seat meter use it; `student_count` is the plain student total. No `plan` field (PATCH with `plan` is 422). |
| `is_active` | archive flag |

# Notes
Created by Super Admin together with its College Admin accounts in one transaction ([provisioning](/flows/college-provisioning.md)). `code` is unique and immutable. `student_seat_cap` is capacity, not a plan.

# Related
[College Admin](/roles/college-admin.md) · [departments](/tables/departments.md)
