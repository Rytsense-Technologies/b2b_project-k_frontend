---
name: quirri-portal-chrome
description: Align post-login page headers and the Alerts bell on Super Admin, College Admin, Faculty, and Student. Use when changing topbar, SystemNotificationBell, notifications inbox panel, portal shells, or verifying login chrome with Playwright. Frozen login cards stay untouched.
---

# Portal chrome — all four post-login shells

Login **cards** (`/auth/login`, `/admin/login`, `/faculty/login`, `/student/login`) are frozen. This skill covers the **page header after login**.

## Recipe (every portal)

Left: `.topbar-copy` / `.pm-topbar-main` — H1 22/30 Medium + optional Body S subtitle.

Right: `.topbar-right` — non-growing flex row, `align-items: center`, `justify-content: flex-end`, `gap: 12px`, `margin-left: auto`.

1. Optional `.pm-topbar-slot` (ModuleHead date range / page actions). Hidden when `:empty`.
2. `SystemNotificationBell` — 44×44, Teal icon, `--highlight` unread dot, `QuirriTooltip` (never native `title`).

Lifted `QuirriSelect` in the slot is also 44px tall. Do not `flex: 1` `.topbar-right`. Do not `margin-left: auto` on inner `.pm-topbar-actions` (the cluster already sits on the right).

Inbox panel: `position: absolute; top: calc(100% + 8px); right: 0` under the bell at 1440 **and** 390. White 8px card, `--shadow-md`. Never a `position: fixed` viewport overlay.

CSS: `src/styles/system-notifications.css` plus the matching `.topbar` / `.topbar-right` rules in `portal-b2c.css` (SA / CA / Faculty) and `student-b2c.css` (Student). Layouts: SA `src/app/superadmin/layout.jsx`, CA `PageHeader.jsx` `PortalTopbar`, Faculty `src/app/faculty/(portal)/layout.jsx`, Student `src/app/student/(portal)/layout.jsx`.

## Playwright (mandatory after chrome edits)

Shared `user-playwright` browser. Sequential logins only (rate limit ~5/min; wait ~15s between portals). Do not echo passwords in chat.

| Portal | Login | Land |
|---|---|---|
| Super Admin | `/auth/login` | `/superadmin/dashboard` |
| College Admin | `/admin/login` | `/admin/dashboard` |
| Faculty | `/faculty/login` | `/faculty/dashboard` |
| Student | `/student/login` | `/student/home` |

For each portal, 1440 then 390, closed bell then open panel:

1. Title left, cluster on the right edge of the 32px gutter.
2. Date-range trigger (if present) and bell share one 44px row, 12px gap, vertically centred with the title block.
3. One date-range control (ModuleHead must not double-render).
4. Open Alerts: panel drops from the bell, right edges align, no jump to the top of the viewport.
5. 390: cluster `justify-content: flex-end`; lifted date range stays visible in `.topbar-right` (do not `display:none` `--lifted` — ModuleHead no longer renders an in-flow copy). Panel still anchored to the bell. `.topbar` `align-items: center` — never `stretch` / `column` on the student phone header.

Seed emails (the owner holds the password; QA helpers read `QA_PASSWORD` from the environment): `xplain@yopmail.com`, `college1@yopmail.com`, `faculty@yopmail.com`, `student@yopmail.com`.
