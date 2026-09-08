# B2B Project K — Super Admin Frontend

Standalone B2B Super Admin portal for Quirri AI / Project K (Phase 1 B2B).  
Runs separately from any B2C interview product.

## Authoritative guidance

| Priority | Document | Role |
|----------|----------|------|
| **1** | `assets/ProjectK_B2B_SOW_v1.0.pdf` | Contract scope (B2B) |
| **2** | `assets/PROJECT_K_DEVELOPMENT_GUIDE.md` | What to build |
| **3** | `assets/QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md` | How to build (brand, UX, a11y, workflow) |
| **4** | `new_updated_design_four/` | Post-login UI for four portals — `docs/QUIRRI_UI_REFERENCE.md` |
| **4b** | `ProjectK_Client_Demo/` | Legacy static demo — do not modify |

Cursor agents: see `AGENTS.md` and `.cursor/rules/`.

## Tech stack

- Next.js 14 (App Router)
- React 18
- Redux Toolkit
- TanStack Query
- Quirri design tokens (`src/styles/quirri-design.css`)

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit values as needed
npm run dev
```

Default dev URL: http://localhost:3000  
To restart dev on port 3000 with a clean cache: `npm run dev:clean`

Backend API (local): `http://localhost:8000/api/v1` — see `src/lib/apiConfig.js`

## Auth

- Login URL: `/auth/login`
- Backend: `POST /auth/login` or `POST /superadmin/auth/login`
- Use real API login. Keep `NEXT_PUBLIC_DEV_BYPASS_AUTH=false` unless you explicitly need bypass for local UI work.

## Super Admin routes (Phase 1)

| Route | Description |
|---|---|
| `/auth/login` | Super Admin sign-in |
| `/auth/forgot-password` | Request password reset |
| `/auth/reset-password` | Set new password from email token |
| `/superadmin/dashboard` | Platform overview (live counts; learning KPIs empty) |
| `/superadmin/universities` | University onboarding (live API) |
| `/superadmin/colleges` | College management (live API) |
| `/superadmin/users` | Platform users (live API; bulk CSV gated) |
| `/superadmin/reports` | Reports (institution + CSV live; learning types empty) |
| `/superadmin/health` | Platform health (DB/API status live) |
| `/superadmin/audit` | Audit logs (live append-only) |
| `/superadmin/notifications` | Notifications (SOW catalogue live; deliveries empty) |
| `/superadmin/settings` | Settings (live `/auth/me`) |

## Other portals

| Portal | Login | Home |
|---|---|---|
| College Admin | `/admin/login` | `/admin/dashboard` |
| HOD / Faculty | `/faculty/login` | `/faculty/dashboard` |
| Student | `/student/login` | `/student/home` |

Post-login UI follows `new_updated_design_four/` (see `docs/QUIRRI_UI_REFERENCE.md`). Login screens keep the centered Quirri card.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run dev:clean` | Kill port 3000 and start fresh |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Figma (client UI share)

**Current file:** [Quirri Super Admin — Core 7 Modules](https://www.figma.com/design/42gIwLOZaEMZ29LHX7LYIn)

Seven screens for client review: Dashboard, Universities, Colleges, Platform Users, Reports, Notifications, Settings. Capture workflow and share steps: `docs/FIGMA_SUPER_ADMIN.md`.

## Repository

Maintained by [Rytsense Technologies](https://github.com/Rytsense-Technologies).
