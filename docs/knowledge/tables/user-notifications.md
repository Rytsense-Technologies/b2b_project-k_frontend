---
type: Postgres Table
title: "user_notifications"
description: "In-app Alerts inbox rows (bell). Separate from email delivery history."
tags: [table, postgres, notifications]
status: stable
sources:
  - resource: "b2b_projectk/alembic/versions/0045_user_notifications.py"
  - resource: "src/lib/api/notificationRules.js"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Schema
| Column | Meaning |
|---|---|
| `id` | row id |
| `user_id` | recipient |
| `event` | catalogue id (same 15 as email; interview events omitted while the module is off) |
| `title` / `body` | in-app copy |
| `resource_type` / `resource_id` | optional deep-link target |
| `link` | optional path the portal opens |
| `is_read` / `read_at` | server-side read state (unlike `/notifications/mine`) |
| `created_at` | |

# Notes
Created by alembic **0045** (`0045_user_notifications.py`). An earlier draft reused revision id `0040`; keep `0040_qna_session_title.py` and this as 0045. Empty inbox is valid. Windows Postgres is not this table's database.

# Related
[notifications API](/api/notifications.md) · [notification_deliveries](/tables/notification-deliveries.md)
