---
type: Metric
title: "Q&A demand"
description: "Top 10 questions students asked the voice tutor, per subject."
tags: [metric, analytics]
status: stable
sources:
  - resource: "b2b_projectk/app/services/college_insights.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Definition
Questions from `qna_turns` in range, grouped by subject: the academic subject of the lesson's linked chapter, else **"Not linked to a subject"** (never the lesson's file name). Chapter = chapter title (never a file name).
Only turns where the tutor retrieved lesson material (`retrieved_chunk_ids` not empty) count - small talk and off-topic speech are left out. Subject-limited Faculty: only lessons of chapters linked to their subjects.
Wording variants merged by `_question_key` (punctuation and filler words like "what is" removed). Latest 5000 turns.
