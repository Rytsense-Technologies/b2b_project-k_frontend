---
type: Access Rule
title: "Tenant (college) scope"
description: "Every non-Super-Admin request is limited to the caller's own college; out-of-scope records answer 404."
tags: [rbac, security, multi-tenant]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/users.py"
  - resource: "b2b_projectk/app/api/v1/reports.py"
  - resource: "b2b_projectk/app/edu_video/routes.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Rule
- Super Admin: every college (may filter with `college` / `tenant_id`).
- College Admin, HOD, Faculty, Student: forced to `users.tenant_id` - a `college`/`tenant_id` query param is **ignored**, never used to widen scope.
- Anything outside scope answers **404, not 403** (no existence disclosure). A rule the caller simply may not perform answers 403 with a reason.

# Where it is enforced
- Users: `_scope_query_to_caller`, `_get_user_in_scope` ([users API](/api/users.md)).
- Reports: `_scope()` - CA locked to college, HOD to department ([reports API](/api/reports.md)).
- Content: `_ensure_job_in_scope` ([edu-video API](/api/edu-video.md)), plus [staff scope](/rules/staff-scope.md) for HOD / Faculty.

# Related
[Super Admin](/roles/superadmin.md) · [College Admin](/roles/college-admin.md) · [users table](/tables/users.md)
