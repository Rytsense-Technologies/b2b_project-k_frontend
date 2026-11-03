---
type: Flow
title: "Voice tutor (classroom Q&A)"
description: "Student asks about the current lecture in English or Tamil; type-instead when voice is blocked or slow."
tags: [flow, student, voice]
status: stable
sources:
  - resource: "src/components/student/VoiceQnaPanel.jsx"
  - resource: "b2b_projectk/app/voice_qna"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Steps
1. Student is on a chapter in My subjects. `POST /voice_qna/conversation` starts a LiveKit session for that lesson (or `?conversation_id=` to continue).
2. Agent: Sarvam STT/TTS (`bulbul:v3` / speaker `shreya`) with Deepgram / OpenAI fallback. Run the worker on `LIVEKIT_AGENT_HTTP_PORT=8082`. A retired Sarvam model or missing key stops the **agent**; the API then 502s and the panel shows “Voice assistant is unavailable”.
3. Student can hang up. `call_ended` with `student_goodbye` or `idle_timeout` is a normal end. `service_error` / `startup_failed` offers Retry + type-instead.
4. **Type-instead** `POST /voice_qna/chat` `{text}` (1–500 chars) when the mic is blocked, join is slow (~15 s), the call fails, or the student prefers typing. Hidden while a live tutor has joined. Typed turns are not seen by the live agent; a text-started conversation is saved as `ended` and can continue by voice with `conversation_id`.
5. Rename: `PATCH /voice_qna/conversations/{id}`. Empty title restores the automatic name. List is student-wide; the panel shows only this chapter (`document_title` ↔ `source_filename`) and hides silent calls.

# Notes
This is **not** the AI interview module (that is off). Lesson ingestion retries via `ingestion_worker`. Auth: voice bearer **or** the platform login cookie.

# Related
[Voice Q&A API](/api/voice-qna.md) · [Student learning](/flows/student-learning.md) · [Q&A demand](/metrics/qa-demand.md)
