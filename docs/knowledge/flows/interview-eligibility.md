---
type: Flow
title: "Mock interview eligibility"
description: "A student may start an AI interview if final-year or covered by an active assignment; otherwise a 403 with a reason."
tags: [flow, interview, student]
status: disabled
sources:
  - resource: "b2b_projectk/app/services/interview_eligibility.py"
  - resource: "b2b_projectk/app/livekit_interview/routes.py"
  - resource: "b2b_projectk/app/services/academic_progression_service.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---

> **Disabled (20 Oct 2026).** The owner removed the AI interview module from every portal. The backend keeps the code and data but does not mount the interview routers while `settings.INTERVIEWS_ENABLED` is false (the default). Set it to true to restore.
# Rule (`interview_eligibility(db, user)`)
- Non-students: always eligible.
- **Final year**: `year_of_study >= course_duration_years` (both set) -> eligible.
- Otherwise eligible only if an **active** [interview assignment](/tables/interview-assignments.md) applies: `final_year_only` -> final years only; `year_of_study` set -> that year; neither -> everyone in scope.
- Not eligible: `GET /api/v1/livekit-interview/eligibility` returns `{eligible:false, reason}`; `POST /livekit-interview/start` answers 403.

# Year of study
Set directly or derived from programme semester: `min(duration, (semester-1)//semesters_per_year + 1)`.

# Related
[interview assignment](/flows/interview-assignment.md) · [interview ready metric](/metrics/interview-ready.md)
