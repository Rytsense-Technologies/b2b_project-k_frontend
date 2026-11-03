---
type: Metric
title: "Interview ready"
description: "A student whose best AI mock interview score is 70% or more."
tags: [metric, analytics]
status: disabled
sources:
  - resource: "b2b_projectk/app/services/college_insights.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---

> **Disabled (20 Oct 2026).** The owner removed the AI interview module from every portal. The backend keeps the code and data but does not mount the interview routers while `settings.INTERVIEWS_ENABLED` is false (the default). Set it to true to restore.
# Rules
Status: `not_started` (no completed session) · `practising` · `ready` (best overall score >= 70, `READY_SCORE`).
Department "interview ready %" = ready final-year students / final-year students.
"Work on" = most frequent `needs_attention` across reports, else the lowest category average.
