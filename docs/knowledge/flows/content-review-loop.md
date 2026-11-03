---
type: Flow
title: "Content review loop (upload to publish)"
description: "College Admin uploads and sends a chapter video; HOD / Faculty review, request changes (with a note) or publish; history is recorded."
tags: [flow, content, review, edu-video]
status: stable
sources:
  - resource: "b2b_projectk/app/edu_video/routes.py"
  - resource: "b2b_projectk/app/edu_video/review_log.py"
  - resource: "b2b_projectk/alembic/versions/0037_review_loop.py"
  - resource: "src/components/shared/EduVideoContentStudio.jsx"
  - resource: "src/app/faculty/(portal)/videos/page.jsx"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Steps
1. **Upload** - College Admin `POST /edu_video/upload` (PDF/DOCX/PPTX/TXT, department, optional `chapter_id`). Job goes PENDING -> EXTRACTING -> SCRIPTING -> AWAITING_REVIEW.
2. **Plan review** - CA edits the lesson plan (`PUT /jobs/{id}/plan`) and submits (`POST /jobs/{id}/submit`) -> RENDERING -> DONE.
3. **Link** (optional) - `PATCH /jobs/{id}/chapter` places it under a [chapter](/tables/chapters.md); decides which Faculty can review it.
4. **Send for review** - `POST /jobs/{id}/send-to-hod` (only when DONE) sets `sent_to_hod_at`; history `sent_for_review`; email HOD + that subject's faculty.
5. **Reviewer decides** (HOD, or Faculty for their subjects - [staff scope](/rules/staff-scope.md)):
   - **Publish** `POST /jobs/{id}/publish` -> `published_at`; history `published`; students notified. 409 while a change request is open (regenerate or dismiss first). Returns `unpublished_job_ids`: earlier published videos of the chapter it took offline (history `unpublished`); the reviewer's toast says so.
   - **Request changes** `POST /jobs/{id}/request-changes` `{plan, note}` -> saves edited plan, `changes_requested_at/by`, `change_note`; history `changes_requested`; email College Admin.
6. **College Admin acts** on a change request (Content › "HOD feedback"):
   - **Regenerate** `POST /jobs/{id}/regenerate` -> re-render from the edited plan, clears the request; when DONE it is back in the review queue (`sent_to_hod_at` kept).
   - **Dismiss** `POST /jobs/{id}/dismiss-changes` -> clears the request, chapter stays in review.
7. Anyone in scope can read `GET /jobs/{id}/history` and add `POST /jobs/{id}/comments`.

# States a reviewer sees
Awaiting review (`sent_to_hod_at`, not published) · Changes requested (`changes_requested_at`) · Published (`published_at`).

# Rules
- Slide edits are rejected after publishing (`400 Already published`); the UI hides "Edit slides" on published chapters.
- Read-only Faculty get 403; out-of-department gets 404.
- **Publish is HOD / Faculty in scope only** (CA / SA 403 since 26 Oct 2026). Needs sent-to-HOD and a finished video (`DONE` + `output_path`, else 409). Unlinked chapters in a department with no HOD have no reviewer.

# Related
[edu_video_jobs](/tables/edu-video-jobs.md) · [edu_video_review_events](/tables/edu-video-review-events.md) · [MCQ approval](/flows/mcq-approval.md) · [edu-video API](/api/edu-video.md)
