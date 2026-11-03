---
type: Flow
title: "Student learning loop"
description: "Home → My subjects (classroom) → watch → tutor → assessment → progress → leaderboard."
tags: [flow, student]
status: stable
sources:
  - resource: "src/lib/student/dashboardModel.js"
  - resource: "src/app/student/(portal)/subjects/page.jsx"
  - resource: "src/app/student/(portal)/home/page.jsx"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# What a student sees
| Route | Job |
|---|---|
| `/student/home` | Next step, semester summary, recent lectures, practice queue, subject progress, assessments, department leaderboard |
| `/student/subjects` | Subject cards → chapter rows (lecture + assessment). Classroom, tutor, and quiz live here. `/student/classroom` **redirects** here |
| `/student/assessment` | Take / results / review for one chapter job (`?job=`) |
| `/student/progress` | Overview + per-subject details (`?tab=details&subject=`) |
| `/student/leaderboard` | Department ranking by MCQ average |
| `/student/notifications` | Alerts + email history |
| `/student/settings` | Profile, security, personal notification switches |

# Loop
1. Published chapters of the student’s college + department (and programme, if set) appear on Home and My subjects. [Content access](/flows/student-content-access.md).
2. Watch the lecture. Heartbeats `PUT /edu_video/student/watch-progress/{job_id}` store counted `percent` and `watch_complete`. Skip-ahead is `limited: true` — the student must keep watching; the server percent may lag the player.
3. [Voice tutor](/flows/voice-tutor.md) on that chapter (voice or type-instead). History is chapter-scoped in the UI.
4. Assessment unlocks only when the set is **approved** and `watch_complete` is true. One attempt. [MCQ](/flows/mcq-approval.md). PDF report after submit.
5. Progress and Home read the same model (`loadStudentHome`). Leaderboard polls (~15–60 s) and refreshes on `BroadcastChannel('quirri-learning')` after a submit.
6. Changing department wipes previous-department watch, quizzes, and tutor chats. [Department change](/flows/student-department-change.md).

# Related
[Student](/roles/student.md) · [Leaderboard API](/api/leaderboard.md) · [watch progress](/tables/video-watch-progress.md)
