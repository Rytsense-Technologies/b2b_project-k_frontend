# Quirri · client UI final (static demo)

Static HTML/CSS/JS walkthrough for **client UI/UX review**.  
**No live authentication, no backend APIs, no Next.js.**

Deploy **this folder only** on Vercel (root directory = `client_UI_final`).

## Pages

| File | What clients see |
|------|------------------|
| `index.html` | Centered Quirri login + **4 dummy portal entries** |
| `forgot-password.html` | Forgot password UI |
| `reset-password.html` | Reset password UI |
| `activate-account.html` | Activate account UI |
| `superadmin.html` | Super Admin portal |
| `college-admin.html` | College Admin portal |
| `hod-faculty.html` | HOD / Faculty portal |
| `student.html` | Student portal |
| `scope.html` | Phase 1 scope map |

## Local preview

```bash
cd client_UI_final
npx --yes serve .
```

Open the URL shown (usually `http://localhost:3000`).

## Deploy on Vercel

1. Push this repo (or upload only `client_UI_final`).
2. In Vercel: **New Project** → set **Root Directory** to `client_UI_final`.
3. Framework Preset: **Other** (static).
4. Build Command: leave empty. Output: `.` (default).
5. Deploy.

Or from this folder:

```bash
cd client_UI_final
npx vercel --yes
```

## Notes

- Login has **no email/password API** — use the four portal cards.
- Portal pages use the design-pack runtime (`support.js` + React CDN). They need network once to load React from unpkg, or work after browser cache.
- Sign out on any portal returns to `index.html`.
