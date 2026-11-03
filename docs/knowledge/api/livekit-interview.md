---
type: API Module
title: "AI interview API (/api/v1/livekit-interview, /api/v1/reports/livekit) - disabled"
description: "Student AI mock interviews and their reports."
tags: [api, fastapi]
status: disabled
sources:
  - resource: "b2b_projectk/app/livekit_interview/routes.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
> **Disabled (20 Oct 2026).** The owner removed the AI interview module. With `INTERVIEWS_ENABLED=False` (default, `app/config.py`) these routes (plus `/interview-profile/*` and `/interviews/livekit/*`) are not mounted and return **404**. Frontend treats that 404 as feature off (empty / hidden), not an error. Models, tables and stored data are kept; set `INTERVIEWS_ENABLED=true` to restore.

# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/livekit-interview/eligibility` | student |  |
| `POST` | `/livekit-interview/start` | eligible student | 403 otherwise |
| `POST` | `/livekit-interview/{session_id}/abort` | student |  |
| `GET` | `/reports/livekit[/{session_id}]` | student | report, status, audio summary; list filter `score_range` = `0-60` (needs focus) \| `60-80` (on track) \| `80-100` (strong); legacy `0-50` \| `50-80` still accepted, `date` = today \| week \| month |

# Notes
[interview eligibility](/flows/interview-eligibility.md). While disabled no interview e-mails are sent (`emails_adapter.send_transactional` returns early). Voice Q&A (`/voice_qna/*`, `/voice_qna/webhooks/livekit`) is separate and stays on.
