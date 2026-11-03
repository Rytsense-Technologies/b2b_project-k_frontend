---
type: Role
title: "Head of Department (HOD)"
description: "Owns quality for one department: reviews and publishes chapters, approves MCQs, sees staff, students, analytics and reports."
tags: [role, hod, portal]
status: stable
sources:
  - resource: "src/app/faculty/(portal)"
  - resource: "b2b_projectk/app/services/staff_scope.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
updated:
  at: "2026-11-02"
---
# Portal
`/faculty/*` shared with Faculty. HOD vs Faculty menu is `GET /faculty/me` (`scope.is_hod`), not the cookie role alone. Interview screens are off.

| Nav | Route |
|---|---|
| Dashboard | `/faculty/dashboard` (KPIs `range=all_time`) |
| Videos | `/faculty/videos` |
| MCQ | `/faculty/mcq` |
| Subjects | `/faculty/subjects` |
| Students | `/faculty/students` |
| Department staff | `/faculty/staff` |
| Department analytics | `/faculty/analytics` |
| Reports | `/faculty/reports` |
| Notifications | `/faculty/notifications` |
| Settings | `/faculty/settings` |

# Can (whole department — [staff scope](/rules/staff-scope.md))
- Review chapter videos the College Admin sent; edit slides and send changes back with a note; **publish** to students ([content review](/flows/content-review-loop.md)).
- Generate / approve MCQ sets ([MCQ](/flows/mcq-approval.md)).
- Department staff + which subjects each teaches; department reports (CSV / Excel / PDF).
- Student records: completion, quizzes (report PDF), tutor questions.
- Unlinked-to-chapter content belongs to the HOD.

# Gets notified
“Chapter ready for your review” and the seven in-app pipeline/assessment events ([notifications](/flows/notifications-lifecycle.md)).
