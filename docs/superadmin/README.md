# Quirri Super Admin — Backend API Pack

Give these files to backend (Claude) and implement **exactly** these contracts. The frontend already calls them.

## Source of truth

UI: `quirri_super_admin_Final.html` (Quirri Core Module — Super Admin V3).

Frontend base URL: `{API}/api/v1`  
Auth: `httpOnly` cookies (`access_token`, `refresh_token`) + role cookie `pk_role=superadmin`.  
All routes below require authenticated **superadmin**.

## Modules

| Module | Doc | Frontend route |
|---|---|---|
| Conventions | [00-conventions.md](./00-conventions.md) | — |
| Dashboard | [dashboard.md](./dashboard.md) | `/superadmin/dashboard` |
| Colleges | [colleges.md](./colleges.md) | `/superadmin/colleges` |
| Departments | [departments.md](./departments.md) | `/superadmin/departments` |
| AI Skill Courses | [skill-courses.md](./skill-courses.md) | `/superadmin/skills` |
| AI Usage | [ai-usage.md](./ai-usage.md) | `/superadmin/ai-usage` |
| Emails | [emails.md](./emails.md) | `/superadmin/emails` |
| Reports | [reports.md](./reports.md) | `/superadmin/reports` |
| Audit Logs | [audit-logs.md](./audit-logs.md) | `/superadmin/audit` |
| Settings | [settings.md](./settings.md) | `/superadmin/settings` |

## Implementation order

1. Auth guard for `role=superadmin`
2. Colleges + college admins (everything else filters by college)
3. Departments (read-only for super admin)
4. Dashboard aggregations
5. Skill courses (generate + video upload)
6. AI usage metering
7. Emails
8. Reports + file exports
9. Audit log writer (middleware) + list/export
10. Settings

Until an endpoint exists, the frontend falls back to mock data so the UI still works.
