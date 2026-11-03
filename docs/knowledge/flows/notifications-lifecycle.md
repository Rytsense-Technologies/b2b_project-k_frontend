---
type: Flow
title: "Notifications (email, rules, Alerts bell)"
description: "15 catalogue events: email delivery, per-scope switches, and a separate in-app inbox."
tags: [flow, notifications]
status: stable
sources:
  - resource: "src/lib/api/notificationRules.js"
  - resource: "src/lib/notifications/scenarios.js"
  - resource: "b2b_projectk/app/api/v1/notifications.py"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Three surfaces
| Surface | API | Who |
|---|---|---|
| Switches | `GET/PUT /notifications/rules` | SA platform (or any college); CA own college; HOD own department; Faculty/Student personal |
| Email log | `GET /notifications/deliveries` · retry | SA all; CA own college. Status includes `skipped` |
| Email history | `GET /notifications/mine` | anyone (rows emailed **to them**; no `read_at`) |
| Alerts bell | `GET /notifications/inbox*` | anyone; table [user_notifications](/tables/user-notifications.md) (alembic 0045) |

There is **no** `/notifications/preferences` route. Settings → Notifications: SA/CA/HOD link to the Rules tab; Faculty/Student edit personal switches (`SettingsNotificationsTab`).

# Catalogue (15, email)
Account & security: `account_activation`, `password_reset`, `verification_code`, `password_changed`, `account_status_changed`.  
People: `hod_assigned`, `subjects_assigned`, `student_placement_changed`.  
Pipeline: `pipeline_completed`, `content_ready_for_review`, `changes_requested`, `content_published`.  
Assessments: `mcq_ready_for_review`, `assessment_available`, `assessment_result`.  
Mandatory (always on): activation, password reset, verification code. Interview events are hidden.

# Bell (7 pipeline / assessment events)
`pipeline_completed`, `content_ready_for_review`, `changes_requested`, `content_published`, `mcq_ready_for_review`, `assessment_available`, `assessment_result`. Poll unread-count ~45s. Deep links: `src/lib/notifications/scenarios.js`. Desktop `Notification` only after in-UI grant. Empty inbox is valid.

# Channel
Product is **email only**. Lists request `channel=email`. WhatsApp is hidden (`whatsappOff.js`) even if the API stored it.

# Related
[Notifications API](/api/notifications.md) · [notification_deliveries](/tables/notification-deliveries.md)
