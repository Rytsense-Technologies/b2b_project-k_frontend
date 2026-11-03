---
type: Postgres Table
title: "notification_deliveries"
description: "Every email the platform sent or recorded. Portals hide any leftover WhatsApp rows."
tags: [table, postgres]
status: stable
sources:
  - resource: "b2b_projectk/app/models/ops.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Schema
| Column | Meaning |
|---|---|
| `event` | account_activation, content_ready_for_review, changes_requested, content_published, assessment_available, pipeline_completed, interview_assignment, interview_completed, interview_result, password_reset, verification_code |
| `channel` | email (portals request and display email only; `whatsapp` if present is hidden) |
| `recipient / subject` |  |
| `body` | kept only on failure (for retry) |
| `status` | sent \| failed \| log_only |
| `attempts` |  |
| `user_id / tenant_id` | scope |

# Notes
Super Admin sees all, College Admin their college. Anyone's **email history** is `GET /notifications/mine`. The Alerts bell is a different table: [user_notifications](/tables/user-notifications.md).

# Related
[notifications API](/api/notifications.md)
