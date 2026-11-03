---
type: Postgres Table
title: "users"
description: "Every account: Super Admin, College Admin, HOD, Faculty, Student."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/models/user.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `id` | uuid PK |
| `email` | unique, login |
| `hashed_password` | null until activation |
| `first_name / last_name / phone_number` | profile |
| `role` | superadmin \| college_admin \| hod \| faculty \| student |
| `permissions` | optional override list |
| `tenant_id` | college (null for Super Admin) |
| `department_id` | FK departments |
| `program_id / semester_id` | student placement |
| `course_duration_years / year_of_study` | final-year rule |
| `assigned_years / assigned_semesters` | legacy staff teaching scope (superseded by subject_staff) |
| `is_active / is_verified` | derive pending / active / deactivated |
| `failed_login_count / locked_until` | lockout |
| `last_login_at` | last active |

# Notes
Status is derived, not stored ([account activation](/flows/account-activation.md)). `department` (free text) is legacy — use `department_id`. A student has one `department_id`; changing it wipes previous-department watch, quizzes, and tutor chats ([department change](/flows/student-department-change.md)). People log in with email, not a code.

# Related
[tenant scope](/rules/tenant-scope.md) · [staff scope](/rules/staff-scope.md)
