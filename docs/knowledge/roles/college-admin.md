---
type: Role
title: "College Admin"
description: "Runs one college: departments, academic structure, students and staff, content upload, analytics, reports."
tags: [role, college-admin, portal]
status: stable
sources:
  - resource: "src/app/admin/(portal)"
  - resource: "src/components/admin/CollegeAdminSidebar.jsx"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
updated:
  at: "2026-11-02"
---
# Portal
`/admin/*` after [sign-in](/flows/sign-in.md). Interview screens are off.

| Nav | Route |
|---|---|
| Dashboard | `/admin/dashboard` |
| Structure | `/admin/structure` (departments, programmes & subjects) |
| Content | `/admin/content` (studio + HOD feedback queue) |
| MCQ | `/admin/mcq` |
| Students | `/admin/students` |
| Staff | `/admin/staff` (assign subjects) |
| Analytics | `/admin/analytics` |
| Reports | `/admin/reports` |
| Notifications | `/admin/notifications` |
| Settings | `/admin/settings` |

# Can
- Departments + HOD; programmes / semesters / subjects / chapters of their college ([academic structure](/flows/academic-structure-setup.md)).
- Add students one by one or CSV ([bulk import](/flows/bulk-student-import.md)); change department ([department change](/flows/student-department-change.md)); add faculty / HOD; assign staff to subjects ([subject_staff](/tables/subject-staff.md)).
- Upload chapter material, review the plan, render, link to a chapter, **send to HOD**, regenerate from reviewer edits, dismiss change requests ([content review](/flows/content-review-loop.md)). **Cannot publish** (403).
- Generate / approve MCQs ([MCQ](/flows/mcq-approval.md)).
- College analytics + reports locked to their college ([analytics](/flows/analytics-and-reports.md)); own college's notification log and tenant-scope rules.

# Cannot
Create Super Admins or other College Admins; see other colleges ([tenant scope](/rules/tenant-scope.md)); publish chapters.
