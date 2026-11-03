---
okf_version: "0.2"
---
# Quirri B2B knowledge bundle

**Read first:** [How Quirri B2B works](/product.md) — who signs in, the hierarchy, the content→student loop, and what is switched off.

Facts about the product for people and AI agents: who can do what, how the main flows work, the core tables, the APIs and how every metric is calculated. One concept per file; follow the links.
How to work on the code (process, design system, rules) lives in [`docs/agent/`](../agent/README.md); this bundle is **what the product is**. Session memory: [`docs/agent/HANDOFF.md`](../agent/HANDOFF.md) § Current.

## Access rules
- [Tenant (college) scope](/rules/tenant-scope.md)
- [HOD / Faculty scope](/rules/staff-scope.md)
- [Unique institution codes](/rules/unique-codes.md)
- [Switched-off features](/rules/off-features.md)

## Roles
- [Super Admin](/roles/superadmin.md)
- [College Admin](/roles/college-admin.md)
- [HOD](/roles/hod.md)
- [Faculty](/roles/faculty.md)
- [Student](/roles/student.md)

## Flows
**Platform**
- [Sign-in and session](/flows/sign-in.md)
- [University and college provisioning](/flows/college-provisioning.md)
- [Academic structure setup](/flows/academic-structure-setup.md)
- [Account activation](/flows/account-activation.md)
- [Bulk student import](/flows/bulk-student-import.md)
- [Change student department](/flows/student-department-change.md)

**Content and learning**
- [Content review loop](/flows/content-review-loop.md)
- [MCQ approval and attempt](/flows/mcq-approval.md)
- [Student content access](/flows/student-content-access.md)
- [Student learning loop](/flows/student-learning.md)
- [Voice tutor](/flows/voice-tutor.md)

**Ops**
- [Notifications lifecycle](/flows/notifications-lifecycle.md)
- [Analytics and reports](/flows/analytics-and-reports.md)

**Off**
- [Interview eligibility](/flows/interview-eligibility.md)
- [Interview assignment](/flows/interview-assignment.md)

## Tables
- [users](/tables/users.md) · [tenants](/tables/tenants.md) · [departments](/tables/departments.md)
- [programs](/tables/programs.md) · [semesters](/tables/semesters.md) · [subjects](/tables/subjects.md) · [chapters](/tables/chapters.md) · [subject_staff](/tables/subject-staff.md)
- [edu_video_jobs](/tables/edu-video-jobs.md) · [edu_video_review_events](/tables/edu-video-review-events.md)
- [mcq_documents](/tables/mcq-documents.md) · [mcq_attempts](/tables/mcq-attempts.md) · [video_watch_progress](/tables/video-watch-progress.md)
- [interview_assignments](/tables/interview-assignments.md) · [notification_deliveries](/tables/notification-deliveries.md) · [user_notifications](/tables/user-notifications.md)

## APIs
- [Auth](/api/auth.md) · [Users](/api/users.md) · [Academics](/api/academics.md) · [Edu video](/api/edu-video.md) · [MCQ](/api/mcq.md)
- [Faculty](/api/faculty.md) · [Analytics](/api/analytics.md) · [Reports](/api/reports.md) · [Notifications](/api/notifications.md)
- [Interview assignments](/api/interview-assignments.md) · [AI interview](/api/livekit-interview.md) · [Leaderboard](/api/leaderboard.md) · [Voice Q&A](/api/voice-qna.md) · [Platform health](/api/health.md)

## Metrics
- [Completion](/metrics/completion.md) · [Watch time](/metrics/watch-time.md) · [Average score](/metrics/average-score.md) · [Pass rate](/metrics/pass-rate.md)
- [At-risk](/metrics/at-risk.md) · [Interview ready](/metrics/interview-ready.md) · [Score distribution](/metrics/score-distribution.md) · [Q&A demand](/metrics/qa-demand.md)
