---
type: API Module
title: "Voice Q&A API (/voice_qna)"
description: "AI voice tutor conversations per lesson, including typed fallback and rename."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/voice_qna/api/simple.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
updated:
  at: "2026-10-29"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `POST` | `/voice_qna/conversation` | student | start a LiveKit tutor session for a lesson (or `?conversation_id=` to continue) |
| `POST` | `/voice_qna/chat` | student | type-instead turn; `conversation_id` or `lesson_id`/`job_id`; body `{text}` 1–500 chars. `/chat` and `/conversation` answer 429 "Your college has reached today's limit of N tutor questions. Try again tomorrow." over the daily cap; the panel shows it verbatim with no retry |
| `GET` | `/voice_qna/conversations[/{id}]` | student | history + transcript; custom `title` when set |
| `PATCH` | `/voice_qna/conversations/{id}` | student | rename; `{title}` up to 120 chars, empty/null restores the automatic name |
| `DELETE` | `/voice_qna/conversations/{id}` | student |  |

# Notes
Agent: Sarvam STT/TTS (`SARVAM_TTS_MODEL=bulbul:v3`, `SARVAM_TTS_SPEAKER=shreya`) with Deepgram / OpenAI fallback. The worker validates voice at startup (`validate_voice_config`): a retired model, unknown speaker, or empty `SARVAM_API_KEY` stops the **agent** (not the API). `POST /voice_qna/conversation` then 502s; the portal shows "Voice assistant is unavailable" with Retry. Turns feed [Q&A demand](/metrics/qa-demand.md).
Deliberate hang-up: the agent publishes a LiveKit data packet `topic=call_ended` with `{type:"call_ended",reason}` then leaves. Reasons: `student_goodbye` (normal end), `idle_timeout` (quiet — offer reconnect), `service_error` / `startup_failed` (offer type-instead + reconnect), `invalid_session` (start a new conversation). A tutor leave without that packet is treated as `service_error`.
Type-instead: `POST /voice_qna/chat` answers in the same conversation (30s timeout, 20 messages/min per student). The live tutor does not see typed messages; the box is hidden while a voice call is connected and the tutor has joined, and offered when the mic is blocked, the join is slow (~15s), the call fails, or the student prefers typing. A conversation started by text is saved as `ended`; continue by voice with `POST /voice_qna/conversation?conversation_id=`.
History list is student-wide (no `job_id` on the row). Empty finished conversations are omitted by the API. The student tutor panel shows only this chapter’s sessions (match `document_title` to the chapter `source_filename`) and hides silent calls (`has_questions: false`) once idle. Rename is inline (Enter/blur save, Esc cancel, empty = reset).
Auth (`voice_qna.security.get_current_user_id`): a valid voice_qna `Authorization: Bearer` token, else the normal platform login cookie (`access_token`, active user) - a stale bearer token falls back to the cookie. 401 when neither works.
Lesson ingestion is retried by `voice_qna/services/ingestion_worker.py` using `lessons.ingestion_started_at` / `ingestion_attempts` (migration 0031).
