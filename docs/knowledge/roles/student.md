---
type: Role
title: "Student"
description: "Learns published chapters of their department (and programme), asks the voice tutor (voice or type-instead), takes approved assessments, sees leaderboard. AI interview is off."
tags: [role, student, portal]
status: stable
sources:
  - resource: "src/app/student/(portal)"
  - resource: "src/components/student/StudentSidebar.jsx"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
updated:
  at: "2026-11-02"
---
# Portal
`/student/*` after [sign-in](/flows/sign-in.md). Interview routes are **off**. `/student/classroom` redirects to My subjects.

| Nav | Route |
|---|---|
| Home | `/student/home` |
| My subjects | `/student/subjects` (classroom, tutor, chapter actions) |
| Leaderboard | `/student/leaderboard` |
| My progress | `/student/progress` |
| Notifications | `/student/notifications` |
| Settings | `/student/settings` (account menu also: security, notifications) |

Assessment is `/student/assessment?job=` (not a sidebar item).

# Can
- Watch published chapters ([content access](/flows/student-content-access.md)); progress saved ([watch progress](/tables/video-watch-progress.md)).
- Ask the AI voice tutor (EN + Tamil) or type instead ([voice tutor](/flows/voice-tutor.md)).
- Take a chapter assessment once when approved **and** watched to 100% ([MCQ](/flows/mcq-approval.md)); download PDF.
- Department leaderboard by average MCQ % ([leaderboard](/api/leaderboard.md)).
- Full loop: [student learning](/flows/student-learning.md).

# Account
Created by an admin; activates via email ([activation](/flows/account-activation.md)). One department at a time ([department change](/flows/student-department-change.md)).
