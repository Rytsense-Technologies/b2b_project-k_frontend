---
type: Flow
title: "Change a student’s department"
description: "A student has one department. Changing it wipes previous-department learning records except interview history."
tags: [flow, student, college-admin]
status: stable
sources:
  - resource: "src/app/admin/(portal)/students/page.jsx"
  - resource: "b2b_projectk/app/api/v1/users.py"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Steps
1. College Admin (or Super Admin) opens the student and chooses a new department (`ChangeDepartmentModal` / `PATCH /users/{id}`).
2. Backend `clear_student_previous_department_records` removes, for the **previous** department only: lecture watch progress, chapter assessments, tutor chats.
3. The student starts those again in the new department. Programme / semester may be set in the same placement step.
4. First assignment (no previous department) does not wipe anything. Deactivate keeps records.

# Notes
Interview history would stay if that module were on; it is currently off. Fires `student_placement_changed` email/inbox where rules allow.

# Related
[Student](/roles/student.md) · [users](/tables/users.md) · [Student learning](/flows/student-learning.md)
