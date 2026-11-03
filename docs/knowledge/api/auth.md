---
type: API Module
title: "Auth API (/api/v1/auth)"
description: "Login, tokens, activation, password, profile."
tags: [api, fastapi]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/auth.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `POST` | `/auth/login` | any | cookies: access (30 min) + refresh (30 d) |
| `POST` | `/auth/refresh-token` | any |  |
| `POST` | `/auth/logout` | any |  |
| `POST` | `/auth/forgot-password · /auth/reset-password` | any | email link |
| `POST` | `/auth/change-password` | signed in | signs out other sessions |
| `POST` | `/auth/activate` | invitee | set password, sign in |
| `POST` | `/auth/resend-activation` | SA, CA |  |
| `GET / PATCH` | `/auth/me` | signed in | profile incl. tenant_name, university_name, programme, semester |

# Notes
Login UI is frozen (centered Quirri card). Unified login for all roles; portal `/admin/login` etc. redirect here. ~5 logins/min. See [sign-in](/flows/sign-in.md) and [account activation](/flows/account-activation.md).
