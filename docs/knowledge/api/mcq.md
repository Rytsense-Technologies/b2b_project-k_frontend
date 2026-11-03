---
type: API Module
title: "MCQ API (/api/v1/mcq)"
description: "Question generation, approval, student attempt, report PDF."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/mcq/api/routes.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `POST` | `/mcq/jobs/{job_id}/generate` | CA, HOD, Faculty (scope), SA |  |
| `GET` | `/mcq/jobs/{job_id}` | reviewers / student | student view gated: published, own college + department, and own programme when the chapter is linked to one (404 otherwise) |
| `GET` | `/mcq/my-attempts` | student (any signed-in user) | own submitted quizzes: job_id, percentage, counts, submitted_at |
| `POST` | `/mcq/jobs/{job_id}/approve` | CA, HOD, Faculty (scope), SA | body `{ set_version }` — 409 if the set changed since review |
| `POST` | `/mcq/jobs/{job_id}/submit` | student | once; 10/min per person (429 + `retry_after`) |
| `PATCH` | `/mcq/jobs/{job_id}/questions/{question_id}` | HOD / Faculty write | optional `?unapprove=true` for a live set |
| `DELETE` | `/mcq/jobs/{job_id}/questions/{question_id}` | HOD / Faculty write | keep 3–100 questions; `?unapprove=true` if live |
| `POST` | `/mcq/jobs/{job_id}/questions` | HOD / Faculty write | add one question; `?unapprove=true` if live |
| `POST` | `/mcq/jobs/{job_id}/attempts/{student_user_id}/reset` | HOD / Faculty | optional `{ reason }` max 300; student GET then returns `not_attempted` |
| `GET` | `/mcq/jobs/{job_id}/report.pdf` | student / staff `?user_id=` |  |

# Notes
Student `GET /mcq/jobs/{job_id}` returns 409 while a set is regenerating (“isn't ready yet”) — show a retry, not an error page. Generate is 5/min per chapter per person.
Watch unlock is `watch_complete` from `PUT /edu_video/student/watch-progress/{job_id}` (counted `percent` may be below what the player sent; `limited: true` means skip-ahead).
Single and multiple questions always need options A–D (true/false is True/False only). Invalid questions return 422. Question text min 3 characters.
[MCQ approval](/flows/mcq-approval.md)
