---
type: Role
title: "Faculty (subject-matter reviewer)"
description: "Reviews and publishes content and approves MCQs for the subjects assigned to them; sees those subjects' students. Read-only until subjects are assigned."
tags: [role, faculty, portal]
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
`/faculty/*` shared with HOD. Interview screens are off. Hitting `/faculty/staff` or `/faculty/reports` by URL returns the portal **404** (HOD-only).

| Nav | Route |
|---|---|
| Dashboard | `/faculty/dashboard` |
| Videos | `/faculty/videos` |
| MCQ | `/faculty/mcq` |
| Subjects | `/faculty/subjects` |
| Students | `/faculty/students` |
| Analytics | `/faculty/analytics` |
| Notifications | `/faculty/notifications` |
| Settings | `/faculty/settings` |

# Can — assigned subjects only ([staff scope](/rules/staff-scope.md))
- Review, edit slides (send changes back with a note), **publish** chapters linked to their subjects.
- Generate / approve MCQs for those chapters.
- See students of those subjects' programmes plus unplaced students; per-student quiz reports for chapters in scope.
- Comment on a chapter's review history.

# Cannot
Create interview assignments (module off). See department staff or department reports (portal 404, not an empty table). Act on content not linked to their subjects (that belongs to the HOD).

# Without subjects
Whole department visible, everything read-only (`ScopeNotice`). Subjects are assigned by the College Admin (Staff › Assign subjects). Without a department: `FacultyAccessGate` — one screen, no modules.
