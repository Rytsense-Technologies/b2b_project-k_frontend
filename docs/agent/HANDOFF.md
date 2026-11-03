# HANDOFF.md — session context for Claude Code

> Read this after `AGENTS.md` / `CLAUDE.md`. **§ Current (2 Nov 2026) is live memory.**
> Sections below it are historical (6 Oct – 31 Oct). If they disagree with § Current,
> `prod.md`, or `design-system.md`, follow those — not the older narrative.

---

## Current (2 Nov 2026) — start here

Claude Code / Cursor: load this block, then **`docs/knowledge/product.md`** (how the product works) and the one file in `docs/knowledge/` the task needs. Do not re-ask settled items.

### Workspace

| What | Where | Notes |
|---|---|---|
| Frontend | `E:\b2b_superAdmin_frontend` | Next.js 14 App Router (JSX). Branch **`main_backup_working`**. Last product commits: `99ecaf7` bell · `08597f5` QA · `2560b07` in-app alerts. |
| Uncommitted (2 Nov) | chrome CSS + skill | `src/styles/{system-notifications,portal-b2c,portal-modules,quirri-design,student-b2c,student-portal,data-viz}.css` and `.cursor/skills/quirri-portal-chrome/`. **Do not commit unless asked.** |
| Backend | `E:\b2b\b2b_projectk` | FastAPI. Python env `E:\b2b\b2b_env`. Alembic head **0045** `user_notifications`. |
| Dev URL | `http://localhost:3000` | Rewrites `/api/v1` → `API_PROXY_TARGET=http://localhost:8000`. Unified `/auth/login`. |
| Code graphs | this repo `graphify-out/graph.json` · API `E:/b2b/b2b_projectk/graphify-out/graph.json` | Join: `C:\Users\Arun K\.graphify\global-graph.json`. Windows Application Control **blocks `graphify.exe`** — always `py -m graphify query|update …`. Claude Code hook in `.claude/settings.json` uses the Python module. |

**Secrets:** never paste `.env`, tokens, cookies, or the seed password. The owner holds the password; it is no longer in the repo, and QA helpers read `QA_PASSWORD` from the environment. Seed emails: `xplain@yopmail.com` (SA) · `college1@yopmail.com` (CA) · `hod@yopmail.com` · `faculty@yopmail.com` · `student@yopmail.com`. Login rate limit ~5/min — wait ~15s between Playwright portal logins.

### Backend runbook (API not answering)

1. Windows can show port 8000 open via **`wslrelay`** while the guest is hung. Probe `http://127.0.0.1:8000/api/v1/health`. Timeout = dead. **401** = alive (route needs a session). `/docs` and `/openapi.json` are 404.
2. `wsl -l -v` can still say Ubuntu Running. If `wsl -e bash` times out (`Wsl/Service/0x8007274c`), run `wsl --shutdown` (~60s), wait, then `wsl -e bash -c "echo wsl-ok"`.
3. API database is **WSL Postgres 18** on 5432. Windows Postgres is a **different** instance (was at 0032) — do not migrate it. Avoid `sudo service postgresql` (hangs on password). Use `pg_isready`.
4. Start **without `--reload`**: `/mnt/e` + reload goes D-state and can take ~2 min just to bind.

```bash
wsl -e bash -c "cd /mnt/e/b2b/b2b_projectk && exec /mnt/e/b2b/b2b_env/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000"
```

Keep that process in a persistent foreground session (nohup+disown from a short bash died). Last known good: Application startup complete, ingestion worker + job recovery started.

Student home `GET /edu_video/student/videos` 500 and HOD `GET /faculty/overview` 500 meant WSL DB lagging at 0039 while ORM expected 0044+. Fix: `alembic upgrade head` **in WSL** on the API DB.

### Product facts that override older HANDOFF sections

- **AI interview is off** (`INTERVIEWS_ENABLED=false`). No interview nav, screens, or KPIs. Those APIs 404. Voice QnA (LiveKit) stays. Ignore §4 interview wizard / reports tables as current work.
- **Font is Poppins** everywhere (Brand v1.0). Do not switch portals to DM Sans even if older student-b2c notes say so. Class names `.q-student` / `.q-app-shell` stay.
- **Notifications**
  - Bell / Alerts: `GET /notifications/inbox`, `GET /notifications/inbox/unread-count` (poll 45s), `POST /inbox/{id}/read`, `POST /inbox/read-all`. Table `user_notifications` (alembic **0045**; was a duplicate `0040` — keep `0040_qna_session_title.py`). Empty inbox is valid.
  - Email history: `GET /notifications/mine` (no `read_at`).
  - Switches: `GET/PUT /notifications/rules`. **No** `/notifications/preferences`.
  - Email only. WhatsApp hidden (`src/lib/product/whatsappOff.js`). Lists request `channel=email`.
  - 15 catalogue events. Deep links: `src/lib/notifications/scenarios.js`.
- **Faculty URL leak:** Faculty hitting `/faculty/staff` or `/faculty/reports` gets the portal 404. HOD still has those modules.
- **Super Admin dashboard:** one date-range `QuirriSelect` in `.topbar-right` (ModuleHead must not also render an in-flow copy). Do not `display:none` `--lifted` at 1023px.
- **`/student/classroom`** redirects to My subjects.
- **HOD/Faculty dashboard, students Performance, subjects:** `GET /analytics/department?range=all_time` so “to date” matches roster scores. Analytics page keeps the range picker.
- **Voice QnA:** type-instead `POST /voice_qna/chat` when mic blocked / tutor slow / student prefers typing. Rename `PATCH /voice_qna/conversations/{id}`.
- **MCQ:** watch gate trusts server `percent` + `watch_complete`; approve sends `set_version`; single/multiple always A–D; question text min 3 chars. Aligned to backend `8fe4bc6` era.
- **Student department:** one at a time. Changing it wipes previous-department watch progress, chapter assessments, and tutor chats. Interview history would stay if the module were on.
- **Unique IDs** on institution/user create are in product (do not invent a second scheme).

### Portal chrome (Alerts bell) — 2 Nov 2026

Skill: `.cursor/skills/quirri-portal-chrome/SKILL.md`. Frozen **login cards** are out of scope.

Right cluster `.topbar-right`: `flex: 0 0 auto`, `align-items: center`, `justify-content: flex-end`, `gap: 12px`, `margin-left: auto`. 44px bell + 44px lifted select. Inbox panel `position: absolute; top: calc(100% + 8px); right: 0` at 1440 **and** 390 — never `position: fixed`. Student phone header: wrap + center, never `align-items: stretch` / column. Playwright verified SA / CA / Faculty / Student at 1440 and 390 (subagent `93176011-d266-4eae-a5a5-2cfc8776e24e`).

### Open / do not do

- Do **not** commit or push unless asked. Chrome CSS is still dirty.
- Do **not** restyle `/auth/login` (or portal login wrappers).
- Do **not** add plan / licence / upgrade UI.
- P2 leftovers (not this request): `PremiumFeatureGate`, toaster slate hex, `IconButton` without a Quirri tip.
- `docs/BACKEND_STATUS_REPORT.md` / `docs/FRONTEND_BACKEND_ALIGNMENT.md` are referenced by the pack but are **not** in this repo — use backend code + `docs/knowledge/` instead.

---


## 1. Workspace

| What | Where | Notes |
|---|---|---|
| Frontend (this repo) | `E:\b2b_superAdmin_frontend` | Next.js 14 App Router (JSX). Branch **`main_backup_working`**, last commit `f89be45` (7 Oct). Many student files are **uncommitted** (see §6). |
| Backend | `E:\b2b\b2b_projectk` | FastAPI + SQLAlchemy + Alembic + LiveKit. Branch `arun_master_24082026`, uncommitted work (assignments, watch progress, analytics, leaderboard, faculty directory). Python env: `E:\b2b\b2b_env`. |
| Dev URL | `http://localhost:3000` | Unauthenticated routes redirect to `/auth/login`. |
| Code graph | `graphify-out/graph.json` | Refreshed 8 Oct 2026 (1,379 nodes). |
| Browser automation | Playwright MCP (`@playwright/mcp`) in Claude Desktop config | Connected 9 Oct; needs a student login to test portal pages. |

**Secrets:** never paste or commit `.env`, tokens or cookies. Backend has untracked
`scripts/_cookie*.txt` and `scripts/_login.json` — **do not commit them** (add to `.gitignore` if asked).

---

## 2. Standing rules (owner — do not re-ask)

- **Commit / push only when the owner asks.** No force-push, no `--no-verify`, no git config changes.
- **Login UI is frozen** (centred Quirri card) until the owner unfreezes it.
- **No mocks in `src/`** — live APIs only; missing data → loading / empty / error states.
- **No plan / licence / subscription / upgrade UI** (B2B). Backend interviews are *ungated*
  (`app/livekit_interview/entitlements.py` always allows) — never show quotas like "0/1 used".
- **India-only** location formats; `en-IN` number/date formatting.
- **Never native `title=` tooltips** — use `QuirriTooltip` / `useQuirriTip`.
- **Do not rewrite working backend logic**; no unnecessary dependencies.
- **Preserve line endings** — mixed repo. CRLF: `home/page.jsx`, `InterviewsClient.jsx`, `lib/api/interview.js`,
  `lib/constants/interview.js`, `lib/livekitSession.js`, `docs/agent/*.md`. LF: `dashboardModel.js`, `pageMeta.js`,
  `subjects/page.jsx`, `progress/page.jsx`, `live/page.jsx`, new CSS files. Check with `file <path>` and match it.
- **Other people edit the same files.** Before writing, re-read the current file (compare with your
  last known version); build on their changes, never overwrite them.
- **Reference images are structure guides**, not pixel copies — unless the owner says "same as image".
  When the owner is unhappy they ask for a **revert first**, then a fresh attempt.
- **Card heights are content-driven** (no fixed heights). Cards in the same row match each other
  (grid `align-items: stretch`), all rows share one column grid, consistent gaps (20px desktop / 16px phone).

### Colour roles (final)
- **Teal `#0E5C6B`** (`--teal-500` / `--surface-brand`): banners, side panels, filter bars, links, icons,
  active nav text, teal secondary buttons.
- **One orange `#F5821F`**: `--accent` = the ONE main button per view (white text) and orange words;
  `--highlight` = small marks (chart points, dots, rings, 4px title rule).
  **`#AC5B16` is never used** (survives only on the frozen login card).
- **Green `#5CB414`** (`--progress`) for progress / strong scores.
- Categorical `--cat-1…6` for subjects / skills / series only.
- **Low scores are orange, never red.** Score bands: ≥75 strong (green) · 50–74 on track (teal) · <50 needs revision (orange).

### Type & shape (design-system §2, §7 — easy to get wrong)
- Poppins **400 / 500 only; 700 only at ≥28px**. **Never 600/800.**
- Scale only: 11 (overline) · 12 · 14 · 15 (buttons) · 16 · 18 · 22 · 28 · 36. **No 13, 17, 24.**
- Radii **6** controls · **8** cards · **16** modals · full pills. No gradients on brand colours.
- Borderless cards on canvas `#EEF0F0` with `--shadow-card`; numbers right-aligned in tables.

---

## 3. Workflow protocol (every change)

Source: `docs/agent/task.md`, `memory.md`, `.cursor/rules/*.mdc`. Summary:

**BEFORE**
1. **Scope** — map the request to the SOW (`assets/ProjectK_B2B_SOW_v1.0.pdf`, extract in
   `assets/_pdf_extract/`) and `prod.md`. Out of scope / unclear → ask the owner, stop.
2. **Graph** — `graphify query "<intent>" --budget 1500` (then `path` / `explain`). Read/Grep only the hit files.
3. **Pack** — load only the needed slices: `architecture.md` (code/API), `rules.md` (UI/forms/auth),
   `design.md` + `design-system.md` §0, §0b, §2b, needed §4 rows, **§6 BEFORE checklist**.
4. **API truth** — check the backend code in `E:\b2b\b2b_projectk` (routes / schemas) before using data.
   (`docs/BACKEND_STATUS_REPORT.md` is referenced by the pack but not present in this repo.)
5. **Plan** — files to touch + components to reuse (PortalHero, QuirriModal, QuirriSelect,
   QuirriRHFField, SectionState, useAsyncResource, useUrlState …).
6. **Concurrent edits** — compare the file on disk with your last known version before editing.

**DURING** — tokens only · one orange action per view · forms via `FIELD_RULES` + `QuirriRHFField` ·
India location via `IndiaLocationFields` · dropdowns `QuirriSelect` · smallest diff that satisfies the request.

**AFTER**
1. `graphify update . --no-cluster` (fast when run natively; ~7s).
2. Lint / sanity on touched files.
3. UI: Playwright at **1440 and 390** (+ collapsed sidebar for shell work); **§7 AFTER checklist**
   (grep diff for raw hex, weight 600, off-scale sizes, radii, gradients, `title=`; exactly one orange CTA;
   no horizontal scroll; empty/loading/error states).
4. Scope recheck (no plan UI, login untouched).
5. Update `design-system.md` §8 file map if a shared pattern/file was added.
6. Short report: what / files / decisions / blockers. Commit only if asked.

**Optional Claude Code hook** (`.claude/settings.json`) to keep the graph fresh after edits —
enable only once `graphify` is on PATH in your shell:
```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "graphify update . --no-cluster" }] }
    ]
  }
}
```
Install graphify with `pip install graphifyy` (CLI is `graphify`).

---

## 4. Historical student portal notes (6–9 Oct 2026)

> Interview routes in this table were **removed 20 Oct**. Font is Poppins. For live state use § Current.

| Route | File(s) | State |
|---|---|---|
| `/student/home` Dashboard | `app/student/(portal)/home/page.jsx`, `styles/student-dashboard.css` (`.sh-*`) | **Current version = owner's earlier layout + alignment fix (8 Oct):** next-step hero + "This semester summary"; Learning workspace (tabs) + Study focus; then **paired rows** Recent lectures + Practice queue · Subject progress + Assessments available · Department leaderboard + Interview history; Continue learning full width. All rows share `minmax(0,2fr) minmax(360px,1fr)`; heights content-driven. Two redesign attempts (charts dashboard; Prep "interview performance" dashboard) were **rejected and reverted** — do not reintroduce without being asked. |
| `/student/subjects` My subjects | `app/student/(portal)/subjects/page.jsx`, `styles/student-learning.css` (`.sl-*`, overview `.sl-ov-*`), `lib/student/learning.js` | **Redesigned 8 Oct** (reference image used as structure only): breadcrumb + subject title, Ask AI tutor + "How learning works" (QuirriModal), subject switcher (`?s=`) when >1 subject, 3-stat summary card, ONE recommended next step (orange CTA; priority: resume → take unlocked → review lowest <75 → start → up to date), chapters table (lecture status, assessment status, two row actions), unlock note. Classroom / tutor / assessment views unchanged. URL: `?s=` overview subject; `?subject=&chapter=&tab=` classroom; `/student/assessment?job=&title=&subject=&view=overview|review|study&filter=`. |
| `/student/progress` My progress | `app/student/(portal)/progress/page.jsx`, `styles/student-progress.css` (`.spg-*` — `.sp-*` is taken by student-portal.css) | Overview + Details tabs (`?tab=details&subject=`), KPI strip, learning record, recommended next step, interview strip; Details: per-subject metrics, chapter table, chronological learning record, assessment review, interview practice. |
| `/student/interviews` Start Interview | `interviews/InterviewsClient.jsx`, `styles/student-interview.css` (`.siv-*`), `lib/constants/interview.js`, `lib/api/interview.js`, `lib/livekitSession.js` | 3-step wizard + Interview Summary panel. Step 2 guidelines shown **only before the first interview** (`pk_hide_interview_dos_donts_v2` or any past report). Someone else has since edited this file — build on their version. |
| `/student/interviews/live` | `interviews/live/page.jsx` | Waiting room → interview room latch per the Quirri interview flow guide (below). |
| `/student/reports` · `/student/reports/view?session=` | `app/student/(portal)/reports/`, `components/student/reports/*`, `styles/student-reports.css` (`.srp-*`) | **Separate Reports module (9 Oct)** with its own sidebar item, built from the owner's Quirri Prep "My Reports" reference + `Report-Module-Quick-Reference` md (no plan gates — B2B shows everything). Verified live at 1440/390. Old `/student/interviews/report(s)` routes redirect here; all report links point here. |
| `/student/leaderboard` | `leaderboard/page.jsx`, `styles/student-leaderboard.css` (`.slb-*`), backend `app/api/v1/leaderboard.py` | **Rebuilt 9 Oct (SOW §6.4.4):** competition ranking on correct scores (avg %, tie-break correct answers then earliest), cohort = department, `me` shown even outside top list, per-assessment filter (`?job=`), search (`?q=`), live refresh (60 s + tab focus), podium, KPIs (participation, class avg, top score, last submission), "How ranking works" modal. |
| Assessment / AI tutor | `assessment/page.jsx`, `components/shared/McqStudentQuiz.jsx`, `components/student/VoiceQnaPanel.jsx` | Done earlier (take → results → review). |

`lib/student/dashboardModel.js` → `loadStudentHome()` is the shared student data model
(`chapterRows` carry `subjectKey`, `duration`, `publishedAt`, `submittedAt`; `trend` items carry `jobId`, `subjectKey`).
`styles/student-home.css` and `lib/student/interviewDashboard.js` were created then **deleted** (reverted).

### Interview connection flow (keep this order)
1. Steps 1–3 run with **no LiveKit**; devices checked locally (`getUserMedia`).
2. Start: re-check devices → clear old session → `POST /interview-profile/interview-prepare`
   (role mismatch → dialog, retry with `acknowledged_role_mismatch`) → `POST /livekit-interview/start`.
   Lock the button (409 on double start = already starting). 402 no credits · 409 mismatch/duplicate · 422 bad payload · 429 rate limit.
3. Persist session in sessionStorage, `markFreshStart`, push `/student/interviews/live`.
4. Live page connects immediately, shows **waiting room with remote audio muted**.
5. Latch into the room once: mock / voice-only full → on agent status/audio/speech;
   premium full (`record_session: true`) → only on avatar video **or** student accepting voice-only
   (`avatar_unavailable` → reply `{type:'avatar_fallback_choice', choice}`; backup popup if talking with no video).
6. On enter: unmute, `markReachedLive`. Leaving from the waiting room → `POST /livekit-interview/{id}/abort`
   (200/quota_reversed refunded · 409/404 silent · 503 error). Ending from the room → **no abort**, go to report.

### Backend facts worth knowing
- Reports: `GET /reports/livekit` (list + `kpi{total_reports, avg_score, highest_score}`, filters `type`, `score_range`, `date`);
  `GET /reports/livekit/{id}` → `overall_score`, `technical_score`, `soft_skill_score`, `score_breakdown{technical_knowledge,
  communication, confidence, answer_structure, problem_solving, behavioral_readiness}`, `best_area`, `needs_attention`,
  `action_plan[{step,description}]`, `key_insights`, `recommended_next_practice`, `turn_scores`.
- Interview access is ungated in B2B (no credit/quota API) — handle 402 with a message only.
- Assignments: `GET /interview-assignments`, `/summary`, `POST`, `POST /{id}/close`.
- Leaderboard: `GET /leaderboard?limit=`; MCQ: `GET /mcq/jobs/{id}` states `already_attempted | not_attempted | watch_required`.

---

## 4b. Super Admin portal — SOW completion (Oct 2026)

All SOW §5.1 / §6.2 / §6.5.1 / §7 Super Admin items are implemented (uncommitted, frontend + backend):

- **Academic structure** `/superadmin/academics` — Programme > Semester > Subject > Chapter under a Department. Backend `app/api/v1/academics.py`, models `app/models/academic.py`, migration `0034`. Semesters auto-generate from duration × terms/year and stay editable (rename / add / deactivate; shrinking never drops a semester with subjects). RBAC: SA all, CA own college, HOD own dept, Faculty read-only (404 outside scope). Content uploads take an optional `chapter_id` (cascading picker in `EduVideoContentStudio`).
- **Platform health** — `app/services/ops_monitor.py`: per-minute health checks (uptime %), request timing (API p95), error capture (middleware + ERROR log handler, PII-redacted, grouped by fingerprint). Job status events (`edu_video_job_events`) give per-stage pipeline latency. Migration `0033`.
- **Notifications** — `app/services/notification_service.py` (Amazon SES API; `EMAIL_PROVIDER=log` records log-only), `notification_events.py` triggers: activation, password reset, OTP, content ready for HOD, chapter published, pipeline finished/failed, interview assignment, interview completed + result. Every send is a `notification_deliveries` row; retry re-sends failed emails. Portals are **email only** (owner Oct 2026); WhatsApp is not shown even if the API still records it.
- **Analytics** — completion rate (published chapters fully watched / available, cumulative), real top Q&A questions (grouped), avg assessment score; reports have 5 types with CSV/XLSX/PDF.
- **To go live:** set the SES values in the API `.env` (see `.env.example`), run `alembic upgrade head` (0033, 0034), restart the API and `npm run dev`.
- Known stale tests (not from this work): `tests/edu_video/test_scene_pipeline.py` (imports a removed `LLMCallResult`), `tests/voice_qna/test_smoke.py` (patches a removed `IngestionService`, no auth).

## 4c. Student portal — SOW completion (Oct 2026)

- **Phone nav:** shared `src/components/shared/MobileNav.jsx` (drawer) used by the Student and Super Admin layouts.
- **Settings:** `/student/settings` → shared `src/components/shared/AccountSettings.jsx` (also SA settings).
- **MCQ approval (SOW §6.1.4):** `mcq_documents.approved_at`; `POST /mcq/jobs/{id}/approve` (HOD/Faculty "Approve for students" in `McqDocumentReview`). Students get `status:"not_available"` until approved; regenerating clears approval. "Assessment available" email on approve (published chapter) or on publish (approved set). Migration `0035` marked pre-existing ready sets approved.
- **Assessment PDF (SOW §6.4.3):** `GET /mcq/jobs/{id}/report.pdf`; "Download PDF report" on the results screen. Attempts now snapshot question + option text, so results survive a regenerated set.
- **Final-year gate (SOW §5.3):** `app/services/interview_eligibility.py`; `GET /livekit-interview/eligibility`; `/start` returns 403 unless final year or an active assignment covers the student. Interviews page shows a locked state; home hides self-start prompts.
- **Programme / semester:** `users.program_id`, `users.semester_id`; set from SA user create / "Set programme" (`StudentPlacementFields`). Year of study is derived from the semester. Student classroom groups by Subject (Semester order) and hides other programmes' chapters. Existing content can be re-linked: `PATCH /edu_video/jobs/{id}/chapter` (content table tree icon → `ChapterLinkModal`).
- **Leaderboard:** 15 s polling + instant refresh via `BroadcastChannel('quirri-learning')` on submit.
- **Voice tutor:** Sarvam → Deepgram/OpenAI fallback with a cached credit probe (no 45 s stall when Sarvam is out). Agent: `LIVEKIT_AGENT_HTTP_PORT=8082 python -m app.voice_qna.agents.qna_agent start`. Sarvam `bulbul:v2` is retired — use `bulbul:v3` / speaker `shreya`. Remaining 26 Oct pack is on master (env example, gitignore, no `config.py` copy). **No FE contract change.** If the tutor says unavailable, check the agent container logs first (stale `SARVAM_TTS_MODEL` will refuse to start).

## 4d. College Admin portal — SOW completion (Oct 2026)

- **Profile / shell:** layout uses `useHydrateProfile({ always: true })` (old code overwrote the profile with blanks because `/auth/me` answers `{ user }`); `/auth/me` now also returns `university_name`. Settings re-exports the shared `AccountSettings` (fixed the CA/AK hydration error). Phone drawer via `MobileNav` + `PortalTopbar leading`.
- **Academic structure:** `/admin/structure/departments` + `/admin/structure/programmes` (tabs: `StructureTabs`). The SA academics page is now the shared `AcademicStructureWorkspace` (`collegeId` fixes the college for CA). Subject cards show "Taught by". Department detail shows live counts (`academics/summary?department_id`), "Manage" deep-links with `?department=`.
- **Staff ↔ subjects:** migration **0036** `subject_staff`; `GET/PUT /academics/staff/{id}/subjects`, `GET /academics/staff-subjects`; only subjects of the staff member's department in an active programme + semester can be newly assigned. UI: `StaffSubjectsModal`, Subjects column, row action + drawer section.
- **Students:** programme/semester on create + "Set programme" (shared `StudentPlacementModal`, also used by SA Users); Programme column; paging (25); KPI counts come from the server per status; account state from `src/lib/admin/userStatus.js` (a pending invite is is_active=false — never label it Deactivated).
- **Bulk import:** `POST /users/bulk-import` (≤100 rows, `dry_run`, rows = spreadsheet line numbers, header aliases, India phone normalisation, seat cap) — `app/services/student_import.py`; UI `StudentBulkImport` (template, check, create valid rows, download rows to fix).
- **Analytics / dashboard / interviews:** `GET /analytics/college?range&department` → `app/services/college_insights.py` (totals, departments, subjects, students, at-risk, score bands, Q&A top 10 per subject, interview cohort with weak area, review queue). Same `_activity` aggregate as Reports, so numbers match exports. Interviews page has a Cohort results panel (`InterviewCohortPanel`).
- **Reports:** `/reports/preview|download` accept `college_admin` (locked to own college, optional `department`). SA reports page is now the shared `ReportsWorkspace` (`scope="college"` for CA).
- **MCQ review:** `/admin/mcq` (shared `McqReviewWorkspace`, also the faculty page). **Notifications:** `/admin/notifications` — `GET /notifications/deliveries` + retry scoped to the CA's college; "Resend invite" on activation rows.
- **Content:** studio has a Programme filter (linked / not linked).
- Tests: `tests/test_college_admin.py`. Verified live in Playwright at 1440 and 390 (no page overflow). Kept demo data: VISTAS "B.E. Computer Science (BECSE)" programme, subject "Data Structures (CS201)" assigned to faculty@yopmail.com.

## 4e. HOD / Faculty portal — SOW completion (Oct 2026)

- **Roles (from the SOW-derived UX table):** HOD = whole department (review, edit, publish, approve MCQs, assign interviews, staff, reports). Faculty = SME for the subjects the College Admin assigned (`subject_staff`): review / edit / publish / approve MCQs for content linked to those subjects; students = those subjects' programmes; interviews read-only. Faculty with **no subjects** = whole department **read-only** (owner decision). Content not linked to a chapter belongs to the HOD.
- **Backend rule:** `app/services/staff_scope.py` (`build_scope`, `ensure_staff_job_sync/async`). Fixed the leak where HOD/Faculty could see and act on other departments' chapters: applied in `edu_video/routes.py` (`_ensure_job_in_scope` + write checks on plan/submit/send/chapter/publish/request-changes/delete, list scoped with `subject_ids`, `can_review` per job), `mcq/api/routes.py` (generate/approve write, get/report read), interview assignments (`WRITE_ROLES` CA + HOD; staff without department → 400). Review emails go to the HOD + the subject's faculty only.
- **API:** `/faculty/me` (scope + capabilities), `/faculty/overview`, `/faculty/students` (search/status/paging, completion/interviews), `/faculty/students/{id}`, `/faculty/subjects` (academic structure + unlinked for HOD), `/faculty/staff` (HOD). `/analytics/department` now returns the college_insights payload scoped to department (+ faculty programmes/subjects). `/reports/*` accept `hod` (locked to their department). `/notifications/mine` for any role.
- **Frontend:** layout has `useHydrateProfile({always:true})` + MobileNav; sidebar is role-aware (`useFacultyScope`, HOD adds Department staff + Reports; all get Notifications + Settings). Live dashboard; `ScopeNotice` banner; Video/MCQ review hide actions when `can_review` is false (no slide edit on published chapters — the API rejects it); Subjects (real subjects, chapters, status); Students (+ drawer with quizzes/interviews/work-on); Analytics = shared `InsightsView` (CA analytics uses it too); Interviews read-only for faculty + cohort panel; HOD Staff and Reports (`ReportsWorkspace scope="department"`); Notifications; Settings.
- Tests: `tests/test_hod_faculty.py`; staff fixtures in `tests/edu_video/test_routes.py` now carry a department (old "no department = whole college" behaviour was the leak). Full suite 310 passed (stale `test_scene_pipeline.py` / `voice_qna` excluded as before).
- Demo data kept: chapter "AC generator basics" under VISTAS › BECSE › Sem 1 › Data Structures, linked to the CS "AC generator" video; faculty@yopmail.com teaches Data Structures.
- **Review loop (round 2):** migration **0037** — `edu_video_jobs.changes_requested_at/_by_user_id/change_note` + table `edu_video_review_events` (`app/edu_video/review_log.py`). request-changes stores the note + emails the College Admin (`changes_requested` event); regenerate / publish / `POST /jobs/{id}/dismiss-changes` clear it; `GET /jobs/{id}/history`, `POST /jobs/{id}/comments`. CA "HOD feedback" queue reads `changes_requested_at` (no timestamp guessing, no Next bridge store) and shows who + note; slide editor has a reviewer note field and shows the note to the CA; `ReviewHistoryModal` on CA feedback rows and faculty video rows. Faculty with subjects also see students not placed in a programme; MCQ report for staff checks the student is in scope; per-quiz report download (only when the chapter is in scope); Students KPIs are whole-list; dashboard items deep-link (`?job=`); `FacultyAccessGate` shows one screen for accounts without a department; reports drop always-identical columns for CA / HOD.
- Playwright note: a plain `viewport: 390` context in this MCP browser renders at 487px (even the login page) — use `isMobile: true` (or CDP `setDeviceMetricsOverride` mobile) for real 390 checks.

## 4f. All-portal redesign (14–15 Oct 2026)

Owner: the portals looked "AI-generated" and used only two colours; no product Figma exists. Plan:
`docs/agent/REDESIGN_PLAN.md`; per-role audits + specs: `docs/agent/redesign/*.md`; writer rules: `docs/agent/redesign/BUILD_BRIEF.md`.

- **Design rules:** design-system.md §0c (data colours: categorical series, 80/60 score bands, rank colours, KPI tiles)
  and §4a (module recipe v2: title once in the top bar, `ModuleHead` (lede only if it adds to the subtitle; actions-only = compact row),
  one tab system, filters inside the panel, Clear on every list).
- **Shared kit (main session owns):** `components/shared/data-viz.jsx` + `styles/data-viz.css` (BarList, RankList, Distribution,
  Column/Trend/Donut, BandPill, ScoreMeter, touch-target and skeleton rules); `module-ui.jsx` (ModuleHead, HeadChip, ModuleTabs,
  Panel `toolbar`, TabNav/SegTabs with arrow keys + active tab in view); `hooks/useUrlState.js` (`useTabParam` optimistic,
  `useUrlSearch` debounced, URL writes via native history, no server round trip); portal layouts wrap pages in `<Suspense>`
  (required for `next build`).
- **Backend added:** `/users` program/semester/year filters + `include_counts`; `/faculty/students` filters + quiz_avg/interview_avg;
  `/edu_video/jobs` `review_state` (to_review oldest first) + `subject_id` filter and row field; `/mcq/my-attempts`;
  `staff-subjects` ids; `score_bands` + at-risk reasons by quiz average; subject-limited Faculty get no department rows;
  dashboard top Q&A = real questions + chapter titles; interview report `score_range` 0-60/60-80/80-100.
- **Verification:** independent verifiers per role (`.playwright-mcp/verify-*`, `final-*`); production build passes (63 pages).
- **Not built (needs data / out of scope):** trend charts needing time series, university detail page, bulk set programme,
  notification → chapter deep link (needs migration), retry for failed video jobs.

## 5. Testing approach used

- Pages were verified with an **esbuild + Playwright harness** that bundles the real page files with stubbed
  `next/navigation`, `axios`, `livekit-client`, eduVideo and MCQ APIs (fixtures: one chapter at 25%,
  multi-subject, empty). This lived outside the repo. **Not yet verified against the live backend** —
  next step is a real student login via Playwright MCP.
- Checks run each time: equal row heights / shared edges, no horizontal scroll at 390,
  one orange CTA, deep links (classroom chapter, tutor tab, assessment review), empty states, no page errors.

---

## 6. Open items / next steps

1. **Live verification** with Playwright MCP + a test student account: Dashboard, My subjects, My progress,
   Interviews (start → waiting room → room → report).
2. **Commit** the student work when the owner asks (frontend branch `main_backup_working`; check
   `git status` — includes other people's edits too, so review the diff together).
3. `styles/student-dashboard.css` still contains unused My-progress-era classes (`.sh-kpi`, `.sh-scale`,
   `.sh-insight`, `.sh-row--kpi/--hist`) — safe to prune later.
4. Interview report page restyle — only if requested.
5. Pages built before the type-scale rule was enforced (progress, interview) use weight 600 / 13 / 24px in
   places — bring into §7 compliance when those files are next touched.

---

## 7. Owner preferences (working style)

- Wants **production-grade, clean, simple, professional** UI; dislikes over-designed pages.
- Gives reference screenshots; follow the structure, keep the Quirri palette and design system.
- Prefers seeing screenshots (desktop + phone) with a short report.
- Expects the agent to follow the pack (`task.md`) and graphify **before and after** every change.

## Student portal on the quirri-b2c-student-ui skill (15 Oct 2026)

The signed-in student portal follows the owner's claude.ai skill `quirri-b2c-student-ui` (brief: `docs/agent/redesign/student-b2c-brief.md`). Shell + shared patterns: `src/styles/student-b2c.css` (scoped `.app.q-student`, DM Sans via `src/lib/student/fonts.js`): grey canvas `#efefef`, teal `#14606e` active nav / tabs / scores, orange `#f5821f` one primary per region, white 6px cards, teal filter bar above lists, stacked white rows, pager under lists, live room without sidebar. Student selected tabs are teal (owner asked for the skill there); the other portals keep the neutral grey select. Not applied on purpose: login (frozen), plans / upgrade / job board / plan meters (SOW).

Same day, owner extended the skill to Super Admin / College Admin / HOD / Faculty: `src/styles/portal-b2c.css` (scoped `.app.q-app-shell:not(.q-student)`, loaded last in `src/app/layout.js`, DM Sans on `<html>`). `Panel` with a `toolbar` now renders the filters as a teal `.pm-filterbar` band above the card (`.pm-panel-stack`). Admin tables stay, lighter. This replaces the neutral grey selected state with teal everywhere.

## AI interview module removed (20 Oct 2026)

Owner: no interview module anywhere (not even final year). Frontend interview routes, nav, cards, KPIs, report types, workspaces and shared interview libs are deleted; backend `settings.INTERVIEWS_ENABLED=False` unmounts the interview routers and switches off interview mail/notifications/report types (data and migrations untouched). The AI tutor voice Q&A (LiveKit) is kept. Plan: `docs/agent/redesign/remove-interviews-plan.md`. To restore: flag True + recover frontend files from git.

## Full QA + clean & spacious pass (20 Oct 2026)

All five portals tested end to end by six agents (design system, SA, CA, HOD/Faculty, Student, backend). Global spacing tokens `--qs-*` in `portal-b2c.css` / `student-b2c.css`; one solid teal block per screen; status as text + dot; no duplicate ledes/chips. Bugs fixed include the chapter pager, video-review stale rows after tab switch, malformed-id 500s (backend now 404), `/notifications/deliveries` 500 (misplaced decorator), bad deep links, staff table, notifications empty states. Final: 90 page views clean, build 55 pages, backend tests 35 pass. Plan: `docs/agent/redesign/qa-clean-pass-plan.md`. Open product question: Faculty accounts can be created without a department (only HOD requires one).

## Notification rules + e-mail templates (20 Oct 2026)

15 notification events in 4 scenario groups with real switches: SA platform (+ any college), CA own college, HOD own department, Faculty/Student personal; activation, password reset and verification code are always on. Backend enforces it (`/api/v1/notifications/rules`, 403/409/422), blocked sends are logged as `skipped` with the reason, changes are audited. E-mails use the owner's quirri-email-template-ui layout (inline PNG logo). Providers: ses | smtp | log (currently log). A QA-inbox redirect is configured only in the backend `.env` (`EMAIL_TEST_RECIPIENT`) — remove it before go-live. New public `/activate` page for invite links. Plan: `docs/agent/redesign/notifications-plan.md`.

## Horizontal bars → modern donut cards (21 Oct 2026)

Every horizontal data bar in all five portals was replaced (owner reference: HOD Coverage / Publication Status cards). Composition → `ModernDonutCard`/`ModernDonut` (Total chip, legend with tinted % pills, note strip, compact dashboard widget); per-item metrics → `MetricList`; single meters → `ScoreRing`. Old BarList/RankList/Distribution/DonutChart/ScoreMeter/Legend/SkillBar removed. Functional progress bars kept. Status colours unified (donut = table). Five agents + supervisor review; 90 page views clean; build 56 pages. Plan: `docs/agent/redesign/modern-cards-plan.md`.

## Student My subjects redesign (21 Oct 2026)

Subject-card overview → subject page (header card, Up next, chapter rows with one status chip + one action button). Same chip vocabulary in the classroom; dashboard links to `?s=`; assessments counted as done ÷ total chapters everywhere. Brief: `docs/agent/redesign/student-subjects-redesign.md`. Implementer + reviewer agents; checked at 1440/1024/768/390 and in Chrome.

## Settings module rebuilt per role (22 Oct 2026)

Profile (personal details + role-specific "Your access"), Security (password with real rules and honest sign-out wording, sign out of this device, SA recent sign-ins), Notifications (personal rules for Faculty/Student, link to Rules for SA/CA/HOD). Strict Indian mobile validation everywhere; `/auth/me` treats HOD as B2B. Plan: `docs/agent/redesign/settings-plan.md`. Backend tests: teammate commit eb46dfc dropped `tests/test_notification_rules.py` and turned interview-assignment tests into skips (26 passed, 8 skipped).

## Navigation speed (26 Oct 2026)

Measured: slow module switching was the dev server (on-demand compile + unminified JS: 0.5–4.8 s first click); the production build switches in 0.06–0.3 s, sign-in ~0.9 s, sign-out ~0.2 s. Added `npm run warm` (pre-compiles all routes after `npm run dev`), `npm run preview` (production build into `.next-preview`, :3100, safe while dev runs), and `reactStrictMode: false` (no double API calls in dev). Turbopack in Next 14.2.3 does not work for this app.

## Chapter publish + student access locked down (26 Oct 2026)

Publish is HOD/Faculty only (CA/SA 403) and needs a finished video (409); publish/assessment alerts and student quiz access follow the same programme rule as the student chapter list. Backend tests `tests/test_publish_and_access_rules.py` (13). Open: no reviewer for unlinked chapters in a department without an HOD; students see all semesters. `scripts/check-knowledge.mjs` was added 2 Nov 2026 (`node scripts/check-knowledge.mjs`).

## Voice tutor working (26 Oct 2026)

Verified end to end (student AI tutor voice session answered from the chapter, turns saved). Fix: `qna_agent.py` AgentServer `initialize_process_timeout` 120 s (env `VOICE_AGENT_INIT_TIMEOUT_S`) + one warm process (`VOICE_AGENT_IDLE_PROCESSES`), because LiveKit's 10 s default failed every job on this machine. Sarvam key moved from `.env.example` into `.env`; Sarvam returns 402 (no credits) so sessions use the Deepgram/OpenAI fallback until credits are added. Run the agent on `LIVEKIT_AGENT_HTTP_PORT=8082` while the old interview agent still holds 8081.
