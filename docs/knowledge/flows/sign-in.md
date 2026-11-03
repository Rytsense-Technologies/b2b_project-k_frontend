---
type: Flow
title: "Sign-in, session, and portal routing"
description: "One login API, frozen login cards, role home, cookies, lockout, sign-out."
tags: [flow, auth]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/auth.py"
  - resource: "src/middleware.js"
  - resource: "src/app/auth/login/page.js"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Steps
1. Person opens `/auth/login` (or `/admin/login`, `/faculty/login`, `/student/login` — same frozen centered card, they redirect here).
2. `POST /auth/login` with email + password. Success sets **httpOnly** access (30 min) and refresh (30 days) cookies. Failure increments `failed_login_count`; lockout uses `locked_until`. About **5 attempts/min** platform-wide for this route — wait ~15s between Playwright portal logins.
3. `GET /auth/me` hydrates the session (`user` plus tenant/university/programme/semester names). Middleware (`src/middleware.js`) sends the role home:
   - `superadmin` → `/superadmin/dashboard`
   - `college_admin` → `/admin/dashboard`
   - `hod` / `faculty` → `/faculty/dashboard` (HOD vs Faculty menu comes from `GET /faculty/me`, not the cookie role alone)
   - `student` → `/student/home`
4. Unsigned or wrong-portal paths bounce back to login. Super Admin cannot use `/admin/*`; a student cannot use `/faculty/*`.
5. Sign-out: `POST /auth/logout`, then clear local session. Settings → Security “sign out of this device” is the same call.
6. Forgot password: `POST /auth/forgot-password` emails a reset link (`password_reset`). Change password while signed in: `POST /auth/change-password` (8–72, upper + lower + digit) and other sessions drop.

# Notes
Login **visuals are frozen**. Auth logic may change. New accounts never log in until [activation](/flows/account-activation.md). Profile edits: `PATCH /auth/me` (Indian mobile 10 digits starting 6–9). Super Admin Security can list recent sign-ins from `GET /audit-logs`.

# Related
[Auth API](/api/auth.md) · [users](/tables/users.md)
