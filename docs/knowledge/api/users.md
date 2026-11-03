---
type: API Module
title: "Users API (/api/v1/users)"
description: "Admin user management (Super Admin, College Admin)."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/users.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/users` | SA, CA | filters q, role (one or comma-separated, e.g. `hod,faculty`), department_id, program_id, semester_id, year_of_study, status, tenant_id (SA), include_counts (adds counts_by_role / counts_by_status, ignoring role and status filters); items carry `last_login_at` |
| `GET` | `/users/{id}` | SA, CA | incl. `last_login_at` |
| `POST` | `/users` | SA, CA | create pending + invite; CA only faculty/hod/student |
| `PATCH` | `/users/{id}` | SA, CA | incl. program_id / semester_id |
| `PATCH` | `/users/{id}/role` | SA, CA |  |
| `POST` | `/users/{id}/deactivate · /reactivate` | SA, CA | soft delete. Only SA may act on a College Admin (self included): CA gets 403, and the UI hides these actions on College Admin rows. Reactivating a student in a full college is 409. |
| `POST` | `/users/{id}/resend-invite` | SA, CA |  |
| `POST` | `/users/{id}/revoke-invite` | SA, CA | cancel a never-accepted invite: deletes the pending account + its links (409 if they ever activated). CA on a College Admin: 403 |
| `POST` | `/users/bulk-promote-year` | SA, CA | SA must send `tenant_id` (422 without); the UI runs it from the College Admin portal only |
| `POST` | `/users/bulk-import` | SA, CA | [bulk import](/flows/bulk-student-import.md) |

# Notes
[tenant scope](/rules/tenant-scope.md) applies. Changing a user's department / role, or deactivating them, clears them as HOD of departments they no longer qualify for ([departments](/tables/departments.md)). Changing a **student** department also wipes previous-department watch, quizzes, and tutor chats ([department change](/flows/student-department-change.md)).
