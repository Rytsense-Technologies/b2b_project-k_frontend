# architecture.md — System map (token-packed)

> **Load when:** locating files, APIs, portals, middleware, or wiring a feature.  
> **Method:** `graphify query` / `path` / `explain` first — then open **only** listed paths.

## Stack

- Next.js App Router · React · Redux (`src/store`) · axios (`src/lib/axios.js`) · RHF + Zod · LiveKit (interview / voice)
- Design tokens: `src/styles/quirri-design.css`
- Config: `src/lib/apiConfig.js` · prefer `/api/v1/...` over legacy `/superadmin/*`

## Four portals

| Role | App path | Shell | Design SoT |
|------|----------|-------|------------|
| Super Admin | `/superadmin/*` | `SuperAdminSidebar` | `new_updated_design_four/SuperAdmin.dc.html` |
| College Admin | `/admin/*` | `CollegeAdminSidebar` | `CollegeAdmin.dc.html` |
| Faculty / HOD | `/faculty/*` | `FacultySidebar` | `HodFaculty.dc.html` |
| Student | `/student/*` | `StudentSidebar` | `Student.dc.html` |

Login (frozen centered card): `/auth/login` (all roles; legacy `/admin/login` etc. redirect). Middleware: `src/middleware.js` — role → home:

- `superadmin` → `/superadmin/dashboard`
- `college_admin` → `/admin/dashboard`
- `faculty` / `hod` → `/faculty/dashboard`
- `student` → `/student/home`

## Folder map (edit here, not elsewhere)

```
src/app/{superadmin,admin,faculty,student,auth}/   # pages
src/components/{superadmin,admin,faculty,student,shared,auth}/
src/lib/api/{superadmin,admin,faculty,student,...} # HTTP clients
src/lib/validation/{fields.js,schemas/}            # FIELD_RULES + Zod
src/lib/india/                                     # India location data
src/hooks/ · src/store/
```

## Local API (Windows + WSL)

Frontend `npm run dev` proxies to `http://localhost:8000`. Backend lives in `E:\b2b\b2b_projectk`.

- Bind: `uvicorn app.main:app --host 127.0.0.1 --port 8000` **without `--reload`** (`/mnt/e` + reload hangs).
- DB: WSL Postgres 18. Alembic head **0045** (`user_notifications`). Never migrate the Windows Postgres instance as if it were the API.
- Hung guest: `wslrelay` can occupy 8000 with no HTTP. `wsl --shutdown`, then start Postgres (`pg_isready`) and uvicorn. `GET /api/v1/health` → **401** means the process is up.
- Full runbook: `docs/agent/HANDOFF.md` § Current.

## API alignment

1. Check `docs/BACKEND_STATUS_REPORT.md` for epic / live surface  
2. Map screen in `docs/FRONTEND_BACKEND_ALIGNMENT.md` if present  
3. Client lives under `src/lib/api/**` — pages call clients, not raw URLs  
4. No API → empty/error UI (`AdminEmptyModule` pattern) — do not invent payloads  

## Symbol-aware navigation (preferred)

```bash
graphify query "<feature or symbol>" --budget 1500
graphify path "<SymbolA>" "<SymbolB>"
graphify explain "<concept>"
```

Backend API code is a separate graph. Pass it when the question is about FastAPI, models, or migrations:

```bash
graphify query "<question>" --budget 1500 --graph "E:/b2b/b2b_projectk/graphify-out/graph.json"
```

Both graphs are also merged in `C:\Users\Arun K\.graphify\global-graph.json` (`b2b_superAdmin_frontend`, `b2b_projectk`). Refresh the backend graph with `graphify update . --no-cluster` inside `E:\b2b\b2b_projectk`, then `graphify global add` that `graph.json` again.

Then Read **symbol hit files only**. Avoid `src/**` blanket Grep.

## High-traffic symbols (examples)

| Concern | Start |
|---------|--------|
| Auth / tokens | `src/lib/api/auth.js` · `src/lib/tokens.js` · `useAuth` |
| SA modules | `src/lib/api/superadmin/modules.js` |
| Forms UI | `src/components/superadmin/quirri-ui.jsx` · `QuirriSelect` · `QuirriCombobox` |
| Interview | Off by default (`INTERVIEWS_ENABLED=false` → 404). Portals have no interview screens. Hide leftovers with `src/lib/product/interviewOff.js`. Voice QnA still uses LiveKit (`src/lib/livekitUrl.js`). |
| Alerts bell | `inboxNotificationsApi` · `SystemNotificationBell` · chrome skill `.cursor/skills/quirri-portal-chrome/SKILL.md` |
| Email history | `myNotificationsApi` (`GET /notifications/mine`) |
| Notification switches | `notificationRulesApi` (`/notifications/rules`) — no `/preferences` |
| Faculty-only 404 | Faculty hitting `/faculty/staff` or `/faculty/reports` → portal not-found. HOD keeps both. |
| Student classroom | `/student/classroom` redirects to My subjects |
| Student department | `ChangeDepartmentModal` · `usersApi.updateUser` · `studentDepartmentChangeSchema` · backend `update_user` → `clear_student_previous_department_records` |
| MCQ | `src/lib/api/mcq.js` · backend `app/mcq/api/routes.py` (assessment stays closed until watch is 100%) |
| Voice QnA | `src/components/student/VoiceQnaPanel.jsx` · voice_qna rewrite |
| Edu video | `src/lib/api/admin/eduVideo.js` · backend `video_watch_progress` |

## Do not

- Edit `ProjectK_Client_Demo/` for product chrome (legacy)  
- Prefer design-pack dark sidebar — product uses **white** sidebar  
- Add second design system or one-off select styles  

Next: `rules.md` · `design.md`.
