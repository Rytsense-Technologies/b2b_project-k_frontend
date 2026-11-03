---
type: Postgres Table
title: "mcq_documents"
description: "The generated question set of one chapter video."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/mcq/models/mcq_document.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `edu_video_job_id` | unique - one set per job |
| `title / extracted_text` |  |
| `status` | generation state; ready = usable |
| `generated_count` |  |
| `approved_at / approved_by_user_id` | students see it only when set |

# Notes
Questions in mcq_questions (with answer key).

# Related
[MCQ approval](/flows/mcq-approval.md) · [mcq_attempts](/tables/mcq-attempts.md)
