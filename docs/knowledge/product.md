---
type: Overview
title: "How Quirri B2B works"
description: "End-to-end product: who signs in where, how content reaches a student, and what is switched off."
tags: [product, overview]
status: stable
sources:
  - resource: "assets/ProjectK_B2B_SOW_v1.0.pdf"
  - resource: "docs/agent/prod.md"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# What it is
Quirri Phase 1 is a **B2B institutional** learning product for Indian colleges. Knotopian Super Admin provisions universities and colleges. Each college has a College Admin, Heads of Department, Faculty, and Students. There is **no** plan, licence, subscription, or student billing UI. Colleges have a **student seat cap** only.

Desktop web. English for generated video. Tamil (and English) for the voice tutor. No mobile apps, no offline downloads, no live faculty↔student classes, no third-party LMS.

# Who signs in where
Unified login `POST /auth/login` (frozen centered card at `/auth/login`; `/admin/login`, `/faculty/login`, `/student/login` redirect). Middleware sends:

| Role | Home | Shell |
|---|---|---|
| Super Admin | `/superadmin/dashboard` | [Super Admin](/roles/superadmin.md) |
| College Admin | `/admin/dashboard` | [College Admin](/roles/college-admin.md) |
| HOD / Faculty | `/faculty/dashboard` | [HOD](/roles/hod.md) · [Faculty](/roles/faculty.md) |
| Student | `/student/home` | [Student](/roles/student.md) |

Session: access cookie 30 min, refresh 30 days. Sign-out `POST /auth/logout`. ~5 logins/min. Detail: [sign-in](/flows/sign-in.md).

# Hierarchy
University → College (`tenants`, seat cap) → Department (one HOD) → Programme → Semesters (auto from duration × terms/year) → Subject → Chapter. Faculty are assigned subjects ([subject_staff](/tables/subject-staff.md)). A student has **one department** (and optional programme + semester).

Codes (`FIELD_RULES.code`, 2–32, A–Z 0–9 _ -) uniquely identify universities and colleges (immutable after create). Department / programme / subject codes are optional. [Unique codes](/rules/unique-codes.md). India-only address. [Academic setup](/flows/academic-structure-setup.md) · [College provisioning](/flows/college-provisioning.md).

# The main working loop
1. Super Admin creates the university and college (with College Admin accounts). [College provisioning](/flows/college-provisioning.md).
2. College Admin builds departments, programmes, subjects, chapters; adds HOD / Faculty / Students (or CSV). [Account activation](/flows/account-activation.md) · [Bulk import](/flows/bulk-student-import.md).
3. College Admin uploads notes → AI lesson plan → render → link to a chapter → **send to HOD**. [Content review](/flows/content-review-loop.md).
4. HOD (or Faculty for assigned subjects) review, request changes, or **publish**. Only HOD/Faculty publish (CA/SA 403). Students in that department (and programme, if the chapter is linked) can watch.
5. Staff generate / edit / **approve** the chapter MCQ set. [MCQ](/flows/mcq-approval.md).
6. Student watches to **100%** (`watch_complete`), then takes the quiz **once**. Voice tutor (EN + Tamil, or type-instead) sits on the lecture. [Student learning](/flows/student-learning.md) · [Voice tutor](/flows/voice-tutor.md).
7. Leaderboard ranks the department by MCQ average. Analytics / reports for SA, CA, HOD. [Analytics](/flows/analytics-and-reports.md).
8. Email + in-app Alerts for catalogue events. [Notifications](/flows/notifications-lifecycle.md).

# What each portal is for
- **Super Admin** — platform: universities, colleges, departments, academics of any college, platform users, content oversight, reports, health, notification rules + deliveries.
- **College Admin** — one college: structure, content studio, MCQ review, students (incl. department change and bulk import), staff ↔ subjects, analytics, reports, notification log + rules.
- **HOD** — one department: video review + publish, MCQ approve, subjects, students, **staff**, department analytics + **reports**, notifications.
- **Faculty** — assigned subjects (or whole department read-only if none): video/MCQ review for those subjects, students of those programmes, analytics. `/faculty/staff` and `/faculty/reports` are **404**.
- **Student** — home, My subjects (classroom lives here), assessment, leaderboard, progress, notifications, settings. `/student/classroom` redirects to subjects.

# Switched off (do not rebuild)
[Off features](/rules/off-features.md): AI interview module (`INTERVIEWS_ENABLED=false`, APIs 404), WhatsApp in the UI, plans/billing, Skill Courses, Email CRUD, AI Usage ₹.

# Access
- [Tenant scope](/rules/tenant-scope.md) — non-SA stays in own college; out of scope = **404**.
- [Staff scope](/rules/staff-scope.md) — HOD = department; Faculty = assigned subjects.

# Truth for agents
Start here, then open **one** linked file. Process, brand, and UI rules stay in [`docs/agent/`](../agent/README.md). Session memory: [`docs/agent/HANDOFF.md`](../agent/HANDOFF.md) § Current.
