---
type: Flow
title: "MCQ generation, approval and student attempt"
description: "Questions are generated per chapter video, approved by HOD/Faculty/CA, and a student takes them once after watching the full lecture."
tags: [flow, mcq, assessment]
status: stable
sources:
  - resource: "b2b_projectk/app/mcq/api/routes.py"
  - resource: "src/components/shared/McqDocumentReview.jsx"
  - resource: "src/components/shared/McqStudentQuiz.jsx"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Steps
1. **Generate** - `POST /api/v1/mcq/jobs/{job_id}/generate` (CA, HOD, Faculty in scope) -> [mcq_documents](/tables/mcq-documents.md) `status=ready`, questions with answer key. 5/min per chapter per person (429).
2. **Review** - reviewers see the answer key (`GET /mcq/jobs/{job_id}`), including `set_version` and per-question `edited_at`.
3. **Edit (optional)** - PATCH/DELETE/POST `/mcq/jobs/{job_id}/questions…`. A live set needs `?unapprove=true` (confirm in UI); the set is offline until approved again.
4. **Approve** - `POST /mcq/jobs/{job_id}/approve` with `{ set_version }` from the loaded set. 409 if someone else changed it — reload, review, approve again. Regenerating or a live edit clears approval. Before either on an approved set, the confirm dialog shows the staff document's `attempt_count`; students who attempted keep their score and stay locked. Generate answers 429 over the college's daily quiz-generation cap (message shown verbatim).
5. **Student view** (`GET /mcq/jobs/{job_id}` as student):
   - `not_available` - no document yet or **not approved**;
   - 409 while staff are regenerating (“isn't ready yet”) — friendly retry, not an error page;
   - locked until `watch_complete` is true ([watch progress](/tables/video-watch-progress.md)); counted `percent` may lag a skip-ahead;
   - `already_attempted` - **one attempt per student per set**, result shown; staff reset returns this to `not_attempted`.
6. **Submit** - `POST /mcq/jobs/{job_id}/submit` stores an [attempt](/tables/mcq-attempts.md) with a snapshot of question text + options. 10/min per person (429).
7. **Report** - `GET /mcq/jobs/{job_id}/report.pdf` (student: own; staff: `?user_id=` for a student in scope).
8. **Reset attempt (staff)** - `POST /mcq/jobs/{job_id}/attempts/{student_user_id}/reset` with optional `{ reason }`.

# Rules
Pass mark 60% ([pass rate](/metrics/pass-rate.md)). Approval + publish together trigger the "assessment available" email.
