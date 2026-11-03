---
type: Flow
title: "Account creation and activation"
description: "Admins create accounts in a pending state; the person sets their own password from a 72-hour emailed link."
tags: [flow, auth, onboarding]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/users.py"
  - resource: "b2b_projectk/app/api/v1/auth.py"
  - resource: "b2b_projectk/app/services/auth_token_service.py"
  - resource: "b2b_projectk/app/services/notification_service.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Steps
1. Admin creates the user (`POST /api/v1/users`, bulk `POST /users/bulk-import`, or college creation for College Admins). Row: `is_active=false`, `is_verified=false`, no password.
2. An activation token (TTL **72 h**) is issued and `send_activation_invite` emails `FRONTEND_URL/activate?token=...` (event `account_activation`). Portals are email only.
3. User opens the link -> `POST /api/v1/auth/activate` sets the password, activates and signs them in.
4. Expired / lost link -> admin "Resend invite" (`POST /users/{id}/resend-invite` or `POST /auth/resend-activation`).
5. Wrong person / no longer needed -> admin "Cancel invite" (`POST /users/{id}/revoke-invite`): removes the pending account and its activation links; refused (409) once the person has activated - deactivate instead.

# Status (derived)
`pending_activation` = inactive + never verified · `active` · `deactivated` = inactive + verified (soft delete, restorable via `/reactivate`).

# Notes
Email is delivered through Amazon SES when configured (`EMAIL_PROVIDER=ses`); otherwise recorded as **log-only** in [notification_deliveries](/tables/notification-deliveries.md).
Access token 30 min, refresh token 30 days (httpOnly cookies).
