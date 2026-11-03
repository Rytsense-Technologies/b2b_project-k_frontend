---
type: Postgres Table
title: "mcq_attempts"
description: "A student's submitted assessment."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/mcq/models/mcq_attempt.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `document_id` |  |
| `user_id` |  |
| `correct_count / total_questions` |  |
| `percentage` | 0-100 |
| `answers` | JSONB incl. question text + options snapshot |
| `submitted_at` |  |

# Notes
One attempt per student per document.

# Related
[average score](/metrics/average-score.md) · [pass rate](/metrics/pass-rate.md)
