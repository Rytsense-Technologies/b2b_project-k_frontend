---
type: Flow
title: "Interview assignment to a cohort"
description: "College Admin or HOD assigns a mock / full AI interview to a cohort; students are emailed and unlocked; completion is tracked."
tags: [flow, interview, cohort]
status: disabled
sources:
  - resource: "b2b_projectk/app/api/v1/interview_assignments.py"
  - resource: "src/components/shared/InterviewAssignmentsWorkspace.jsx"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---

> **Disabled (20 Oct 2026).** The owner removed the AI interview module from every portal. The backend keeps the code and data but does not mount the interview routers while `settings.INTERVIEWS_ENABLED` is false (the default). Set it to true to restore.
# Steps
1. `POST /api/v1/interview-assignments` (College Admin, HOD) - title, mode `mock|full`, `final_year_only` or `year_of_study`, optional due date + notes. HOD/Faculty scope = own department (400 without one).
2. Matching students are emailed (`interview_assignment`) and become [eligible](/flows/interview-eligibility.md).
3. List / summary (`GET`, `GET /summary`) shows eligible vs completed; Faculty see these **read-only**.
4. `POST /{id}/close` ends it.

# Related
[interview_assignments](/tables/interview-assignments.md) · [interview ready](/metrics/interview-ready.md)
