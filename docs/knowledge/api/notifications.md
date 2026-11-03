---
type: API Module
title: "Notifications API (/api/v1/notifications)"
description: "Event catalogue, ON/OFF rules per scope, test sends, email delivery log, and in-app inbox."
tags: [api, fastapi, notifications]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/notifications.py"
  - resource: "b2b_projectk/app/services/notification_catalog.py"
  - resource: "b2b_projectk/app/services/notification_service.py"
  - resource: "b2b_projectk/alembic/versions/0039_notification_rules.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-20T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/notifications/events` | SA | catalogue + provider status + 30-day counts incl. `skipped_30d` (`interview_*` hidden while interviews are disabled) |
| `GET` | `/notifications/deliveries` | SA, CA (own college) | log; `status` filter accepts `sent, failed, log_only, skipped`; rows carry `error` (skip reason) and `test_redirect` |
| `POST` | `/notifications/deliveries/retry-failed` | SA, CA (own college) | email only; rules re-checked (switched-off events become `skipped`) |
| `GET` | `/notifications/mine` | anyone | **email history** for the signed-in person (subject, status, created_at). No `read_at`. Not the bell. There is **no** `/notifications/preferences` route. |
| `GET` | `/notifications/inbox` | anyone | **Alerts bell** rows (`user_notifications`): title, body, resource, `is_read`. Query `page`, `page_size`, `unread_only`. |
| `GET` | `/notifications/inbox/unread-count` | anyone | `{ unread_count }` — full unread total. Bell polls ~45s + tab focus. |
| `POST` | `/notifications/inbox/{id}/read` | owner | mark one read |
| `POST` | `/notifications/inbox/read-all` | owner | optional `{ before }` |
| `GET` | `/notifications/rules?scope=&scope_id=` | everyone (own level) | switches grouped by scenario |
| `PUT` | `/notifications/rules/{event_id}` | everyone (own level) | body `{scope?, scope_id?, enabled}` -> updated event row |
| `POST` | `/notifications/rules/{event_id}/test` | SA, CA, HOD | sends the event's template with sample data to the requester -> delivery row |

# Catalogue
`app/services/notification_catalog.py` is the single source of truth: 15 events in 4 groups (Account & security, People & roles, Content pipeline, Assessments), each with `trigger` ("Sends when ..."), `recipients`, `receivers` (roles), `channels`, `mandatory`, `scopes`. Mandatory: `account_activation`, `password_reset`, `verification_code` (never switchable, shown "Always on").

# Authorization matrix (rules)
| Role | Scope (default) | `scope_id` | Events listed |
|---|---|---|---|
| Super Admin | `platform`, or `tenant` for any college | none / college id (required for tenant) | platform: all; tenant: events with `tenant` scope |
| College Admin | `tenant` | own college only | events with `tenant` scope |
| HOD | `department` | own department only | events with `department` scope |
| Faculty / Student | `personal` | own user id only | events with `personal` scope that their role receives |

Mandatory events are listed at every scope as non-editable. Errors: `403` outside own level or event not switchable at that scope, `409` when switched off above (detail = lock text), `422` mandatory / unknown event / tenant scope without `scope_id`, `404` unknown college or department.

# Response shape (`GET /rules`)
`{scope, scope_id, scope_label, can_edit, groups: [{id, name, description, events: [{id, name, trigger, recipients, channels, mandatory, group, enabled, effective, editable, locked_reason, updated_at}]}]}`. `enabled` = this level's own switch; `effective` = on here and above; `locked_reason` = "Turned off by Quirri" / "Turned off by your college" / "Turned off by your department", or the mandatory text.

# Send path
- `should_send(db, event, user=, tenant_id=, department_id=)` runs once inside `deliver_email` (used by `deliver_email_sync`, `send_email`, `notify_in_background`); effective = mandatory OR no level OFF (missing row = ON). Skipped sends are recorded with status `skipped` and the reason, e.g. "Turned off for VISTAS by College Admin".
- `EMAIL_TEST_RECIPIENT` (backend `.env` only) redirects every email to the QA inbox, subject prefixed `[QA -> original]`; the row keeps the original recipient and a `test_redirect` note.
- Providers: `EMAIL_PROVIDER=ses` (raw MIME), `smtp` (`SMTP_HOST/PORT/USERNAME/PASSWORD/STARTTLS`), else log-only. One MIME builder: `multipart/related` (alternative text + html, inline logo `cid:quirri-logo`).

# In-app / desktop (all 15 catalogue events)
Every portal top bar mounts `SystemNotificationBell`, which polls `GET /notifications/inbox` and `GET /notifications/inbox/unread-count` every 45s (and on tab focus). Read state is on the server (`is_read` / `read_at` on [user_notifications](/tables/user-notifications.md)). Opening a row uses `src/lib/notifications/scenarios.js` (same 15 event ids as email). Browser `Notification` alerts fire for newly arrived rows only after the person clicks **Allow desktop alerts**. WhatsApp rows are hidden. Interview events stay hidden. Clients: `inboxNotificationsApi` (bell), `myNotificationsApi` (email history), `notificationRulesApi` (switches).

Inbox pages: SA/CA **Your alerts** tab · HOD/Faculty **Messages** · Student `/student/notifications`. SA/CA/HOD **Send a test** writes a delivery to the requester and an inbox row for the bell.

# Notes
Portals are **email only** (owner Oct 2026): delivery lists request `channel=email`; WhatsApp filters, labels, and health rows are hidden even if the API still records `channel=whatsapp` (`src/lib/product/whatsappOff.js`).
Tables: [notification_deliveries](/tables/notification-deliveries.md), [user_notifications](/tables/user-notifications.md) (0045), `notification_rules` (event, scope_type platform|tenant|department, scope_id, enabled, updated_by, updated_at) and `notification_preferences` (user_id, event, enabled, updated_at), migration 0039. Every change is also written to `audit_logs` (module `notifications`, action `notification_rule_changed`, old -> new).
