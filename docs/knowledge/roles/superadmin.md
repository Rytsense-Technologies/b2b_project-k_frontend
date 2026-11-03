---
type: Role
title: "Super Admin (Knotopian)"
description: "Platform owner: universities, colleges, platform users, academic structure, content oversight, health, notifications, reports."
tags: [role, superadmin, portal]
status: stable
sources:
  - resource: "src/app/superadmin"
  - resource: "src/components/superadmin/SuperAdminSidebar.jsx"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
updated:
  at: "2026-11-02"
---
# Portal
`/superadmin/*` after [sign-in](/flows/sign-in.md).

| Nav | Route |
|---|---|
| Dashboard | `/superadmin/dashboard` (one date-range control in the top bar) |
| Universities | `/superadmin/universities` |
| Colleges | `/superadmin/colleges` |
| Departments | `/superadmin/departments` |
| Academics | `/superadmin/academics` |
| Users | `/superadmin/users` |
| Content | `/superadmin/content` |
| Reports | `/superadmin/reports` |
| Health | `/superadmin/health` |
| Notifications | `/superadmin/notifications` (Rules, deliveries, Your alerts) |
| Settings | `/superadmin/settings` |

# Can
- Create / edit / deactivate universities and colleges (college creation provisions College Admin accounts; seat cap `tenants.student_seat_cap`; unique [codes](/rules/unique-codes.md)). [Provisioning](/flows/college-provisioning.md).
- Manage any user; create any role including another Super Admin ([users API](/api/users.md)).
- Manage academic structure of any college ([academic structure](/flows/academic-structure-setup.md)).
- See every college's content, reports and analytics; export CSV / Excel / PDF ([reports](/flows/analytics-and-reports.md)).
- [Platform health](/api/health.md) and the notification delivery log with retry ([notifications](/flows/notifications-lifecycle.md)).

# Cannot
Publish chapter videos (HOD/Faculty only). Restyle login. Add plans.

# Scope
Unrestricted ([tenant scope](/rules/tenant-scope.md)). First Super Admin comes from seed (`xplain@yopmail.com` locally).
