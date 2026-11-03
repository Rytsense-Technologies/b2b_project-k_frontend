# Log

## 2026-11-03
- Frontend owner decisions (P4 DECF):
  - Orange contrast (decision 1) was rejected by the owner: the brand orange #F5821F stays exactly as design-system.md §2 specifies (white text on orange fills, orange words). e2e/journeys-a11y.spec.js ignores colour-contrast nodes whose pair is #F5821F only.
  - OTP (decision 24): OTPModal, `authApi.sendOtp` / `verifyOtp`, `otpSchema` / `otpField` removed from the frontend.
  - Forms run on zod 4 with @hookform/resolvers 5 (decision 28); `required_error` / `invalid_type_error` became `error`.
  - Reset password button reads "Save password" (decision 29).
  - Regenerate / edit of an approved quiz shows the staff document's `attempt_count` (decision 9).
  - Student classroom player loads `GET /edu_video/captions/{job_id}` as a captions `<track>` with an on/off toggle, hidden when the probe is not 200 WebVTT.
  - DECB wiring: taken university / college code is a 409 shown under the Code field (the "created as … already in use" toast is gone); publish 409 for an open change request and the `unpublished_job_ids` toast; daily-cap 429 sentences verbatim (tutor no longer says "Please wait a moment" for them, no retry); 413 detail shown; College Admin cannot act on College Admin rows (`canManageUser`); head-of-department pickers list HOD accounts only; seat meters use `seats_used`; OTP routes gone from api/auth.md; nothing reads `plan`.

## 2026-11-02
- Phase 2 remediation changed these product facts (full list; the concept files still need folding in):
  - Login lockout: 5 failures per account+address, 50 per account; a lockout looks like a wrong password (401), no 429.
  - Password change or reset ends all access tokens at once (users.token_version) and clears the cookies on change.
  - Common passwords are refused and a new password must differ from the old.
  - Reset and OTP mail: one per account per 120 seconds.
  - Reactivate answers 409 for an account that never activated; use Resend invite.
  - Year promotion moves the semester with the year; a second run in an academic year needs repeat_confirmed.
  - A college move clears department, programme, semester and subject assignments and rechecks the seat cap.
  - Students need a department on POST /users. Non-superadmin accounts need a college.
  - Reports and dashboard rows count active students only; completion follows the student's programme.
  - Faculty no longer read colleagues' email or other staff's subject lists.
  - Audit log: page, page_size, total; ranges today, last_7_days, last_30_days, last_90_days, all_time; unknown range 400 on audit, reports and dashboard.
  - Report dates and term boundaries use IST.
  - Failed one-time-link emails are not stored or retried.
  - /setup/superadmin exists only with ENABLE_BOOTSTRAP=true on a local ENVIRONMENT. Any other ENVIRONMENT value behaves as production.
  - Migrations 0047, 0048 are new; 0048 constraints are NOT VALID until validated per environment.
  - Tutor is student-only: staff get 403 on /voice_qna/conversation and /chat (docs/knowledge/api/voice-qna.md already says so; its 30 s timeout should read 40 s).
  - Voice API bearer tokens live 1 hour, not AUTH_TOKEN_TTL_DAYS; the login cookie takes precedence everywhere.
  - Voice limits are per user, not per IP. A voice call ends at VOICE_MAX_CALL_MINUTES (default 30); new call_ended reason: time_limit.
  - An archived chapter, subject, semester, programme or department hides its content from students everywhere (app/edu_video/visibility.py).
  - Video jobs: a slide that cannot be drawn after 3 tries fails the video. JOB_MAX_RUNTIME_SECONDS (default 3 h) stops a job. job.error_message holds a plain sentence; the raw detail is only in logs.
  - New API field: GET /edu_video/status/{id}.plan_quality; plan_json gains quality. PUT publish and send-to-hod can answer 409 on a race. Upload refuses a file whose content does not match its extension.
  - MCQ: POST generate answers 409 unless the video is DONE, 503 on a database fault. Report bands are 80 and 60. Long documents are sampled across their length. All three features read documents through app/voice_qna/services/parser.py.
  - /edu_video/themes, /designs and /avatars need a login. Slides use the DejaVu fonts shipped with matplotlib on every machine.
  - Voice tutor: the type-instead box and inline conversation rename now exist in the student panel (docs already described them). Not built from the docs: call_ended handling and per-chapter session filtering.
  - Bell desktop alerts: hidden tabs poll every 120 s when permission is granted; clicking a desktop alert opens its deep link.
  - Failed supporting lists: useAsyncResource { lookup } shows a toast; 401/403 stay silent.
  - Quiz drafts live in sessionStorage per chapter and are cleared on submit and sign-out.
  - Login: an unknown role is refused; it no longer falls through to student.
  - Plan state (pk_plan, plan, planSelected) is gone from the client session.
  - Deploy: migrations are a separate step after a pg_dump, not part of container start. A failed health check restores the previous image; the schema is not rolled back.
  - Deploy: API and frontend listen on 127.0.0.1 only; nginx on the same host is the only public path.
  - Interview worker and egress are gone from both compose files and the deploy.
  - Local LiveKit keys now come from .env through LIVEKIT_KEYS; docker/egress.yaml is deleted.
  - CI: ci.yml in both repos gates deploy. Daily backup workflow and 30-minute uptime workflow exist in the backend repo.
  - Muted text --neutral-500 is now #626D71 (AA on canvas); docs/agent/design-system.md section 2 still says #707A7E and needs updating. The frozen login keeps #707A7E through the guard block, so login hints stay at 4.39:1.
  - Card titles (Panel, data-viz cards) are h2 now; design-system.md section 4 can note :is(h2,h3).
  - Every portal shell has a Skip to content link and main#main-content; new shared pattern .skip-link.
  - ColumnChart / TrendChart take a label prop for their text alternative; Recharts lives in data-viz-charts.jsx and must not be imported directly.
  - VoiceQnaPanel must be loaded through next/dynamic; a static import fails bundleSplit.test.js.
  - API docs (/api/docs, /api/openapi.json) exist only when ENVIRONMENT is local; production and staging return 404.
  - Sign-in limits are per account (5/min login, 3/min forgot password and send code, 10/min verify code) with a 300/min per-address ceiling.
  - DATABASE_URL is required; there is no built-in default.
  - Audit log now covers chapter upload, delete, publish and quiz generate, approve, question edits, attempt reset.
  - Video download sends Cache-Control: private, no-cache. API JSON is gzip-compressed above 1 KB.
  - Migrations 0049+: case-insensitive unique indexes; emails are stored lower-case on write.
  - A deleted chapter leaves all reports, leaderboard and analytics numbers. Archived chapters leave completion only.
  - Archiving a department needs force when it has published chapters; a semester cannot be archived while active students are placed in it.
  - Unique-rule conflicts answer 409 everywhere.
  - HOD and Faculty pipeline mail opens /faculty/videos and tells them to ask the College Admin to regenerate a failed video.
  - qna_sessions.last_started_at marks each resumed run. Alembic head is 0050.
  - New settings: DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_TIMEOUT_SECONDS, DB_POOL_RECYCLE_SECONDS (add to .env.example).
  - Voice tutor: the browser uses the login cookie only. No token is kept in localStorage, and any old voiceQnaToken is removed at sign-in and logout.
  - Lesson plan editor shows a warning note listing degraded chapters and slides (not planned, dropped, not fact-checked, missing illustrations, cut at the length limit).
  - Student leaderboard refreshes every 60 s (was 15 s) and on tab focus.
  - pk_role is re-synced from /auth/me where the profile hydrates: always in admin and faculty portals, only on a missing profile in student and superadmin.
- Full product working map for Claude Code: [How Quirri B2B works](/product.md) plus flows for [sign-in](/flows/sign-in.md), [college provisioning](/flows/college-provisioning.md), [student learning](/flows/student-learning.md), [voice tutor](/flows/voice-tutor.md), [notifications lifecycle](/flows/notifications-lifecycle.md), [department change](/flows/student-department-change.md), [analytics and reports](/flows/analytics-and-reports.md). Rules: [unique codes](/rules/unique-codes.md), [off features](/rules/off-features.md). All five role files now list live nav. Publish is HOD/Faculty only.
- Claude Code handoff refreshed: `CLAUDE.md`, `AGENTS.md`, `docs/agent/HANDOFF.md` § Current. Backend runbook (WSL hung / `wslrelay` / uvicorn without `--reload` / WSL Postgres 18 / alembic **0045**). Portal chrome skill for the Alerts bell on all four post-login shells. Windows Application Control blocks `graphify.exe` — use `py -m graphify`. `scripts/check-knowledge.mjs` is in the repo.
- Knowledge aligned to live APIs: bell = `/notifications/inbox*`; `/notifications/mine` is email history; new table [user_notifications](/tables/user-notifications.md). Faculty `/faculty/staff` and `/faculty/reports` are HOD-only (Faculty → portal 404). `/student/classroom` redirects to My subjects. Interview module remains off.

## 2026-10-31
- Faculty hitting `/faculty/staff` or `/faculty/reports` by URL now gets the portal 404 (same as an unknown path). HOD still uses those modules. Super Admin dashboard date range is one QuirriSelect (no duplicate in-flow copy). Collapsed sidebar mark uses `priority` to avoid LCP warning. `/student/classroom` redirects to My subjects.
- Alembic `0045_user_notifications` (was a second `0040`) creates `user_notifications`. Inbox `GET /notifications/inbox*` is live after API restart.
- Bell icon uses the in-app inbox APIs (`GET /notifications/inbox`, `GET /notifications/inbox/unread-count`, `POST …/read`, `POST …/read-all`). `/notifications/mine` stays email history. Rows open from `resource_type` + `resource_id` by role. Seven pipeline/assessment events only.
- HOD / Faculty dashboard, students Performance, and subjects request `GET /analytics/department?range=all_time` so “to date” KPIs match roster quiz scores (API default is last_30_days). Analytics page still has the range picker.
- Product notifications stay email-only: `whatsappOff.js` hides WhatsApp on Super Admin / College Admin deliveries and event chips; lists request `channel=email`. Student chapter/assessment filters use `QuirriSelect` (no OS `<select>`).
- Student dashboard `GET /edu_video/student/videos` 500 and HOD `GET /api/v1/faculty/overview` 500 were WSL Postgres lagging at alembic **0039** while the ORM expected **0044** (`generating_since`, `set_version`, watch-progress tracking columns). Migrated the API DB (`alembic upgrade head` in WSL). Windows Postgres at 0032 is a different instance — do not migrate that thinking it is the API. After migrate: student home loads lectures; HOD queue is “All caught up”; jobs list 200.
- In-app + desktop alerts for all 15 catalogue events, all four portals. Bell polls `GET /notifications/mine`; unread is last-seen in `localStorage`; desktop `Notification` only after in-UI grant. Inbox: SA/CA Your alerts tab, HOD/Faculty Messages, Student `/student/notifications`. Deep links in `src/lib/notifications/scenarios.js`.

## 2026-10-30
- MCQ editor aligned to backend master `check_question`: single/multiple always send options A–D (C/D required); true/false stays True/False only; question text min 3 characters.

## 2026-10-29
- MCQ / assessment: watch gate trusts server `percent` + `watch_complete` (heartbeats until complete; skip-ahead shows “keep watching”); 429 shows `detail` and disables submit/generate for `retry_after`; student GET 409 during regen is “being updated”; approve sends `set_version` and reloads on conflict; staff can edit/add/remove questions (live sets confirm `unapprove=true`) and reset a student’s attempt with a reason.
- Student Voice Q&A: type-instead composer (`POST /voice_qna/chat`) when the mic is blocked, the tutor is slow/fails, or the student prefers typing; conversation rename (`PATCH /voice_qna/conversations/{id}`). LiveKit start/join unchanged. `call_ended` reasons now include `service_error`, `startup_failed`, `invalid_session`.

## 2026-10-27
- Faculty dashboard after sign-in: teal welcome + next-steps (always shown), KPIs for subjects/students/lectures/completion, assigned-subject list, honest empty review/at-risk copy. One orange CTA.
- Full portal QA: student tutor history is chapter-scoped (`document_title` ↔ `source_filename`); silent calls drop from the list when idle; Faculty tab title no longer flashes "HOD / Faculty".
- Voice Q&A: LiveKit `call_ended` (`student_goodbye` / `idle_timeout`) is a normal hang-up — calm "Call ended" copy + Start new conversation. Agent crash still shows the error banner + Retry (`parseCallEndedReason`, `VoiceQnaPanel`).
- Backend remaining pack (`BACKEND_INTEGRATION_NOTES_26OCT2026_REMAINING.md`): applied on master. **No API contract change.** Voice agent now fails fast on a retired Sarvam TTS model / missing key (UI still 502 → "Voice assistant is unavailable"). Health no longer stalls during video renders (`PIPELINE_WORKERS`). New illustrations use `gpt-image-1.5`; existing videos need the existing regenerate action.
- Owner: product notifications are email only. Portals hide WhatsApp (channel filter, labels, inbox meta, health row). Delivery lists request `channel=email`. Helper: `src/lib/product/whatsappOff.js`.

## 2026-10-26
- Portal settings/account chrome: shared `AccountSettings`, `SettingsNotificationsTab`, `syncSessionUser` after PATCH `/auth/me`, `useAccountScope`, tab titles via `usePortalDocumentTitle`. Super Admin / College Admin / HOD Settings → Notifications links to the Notifications Rules tab; Faculty / Student keep personal `/notifications/rules` switches.
- Password catalog is 8–72 with upper, lower, and a digit (`PASSWORD_RULE_MESSAGE`). Phone is Indian 10-digit starting 6–9 (`toIndianMobile`).
- Settings sign-out calls POST `/auth/logout`. Super Admin recent sign-ins read GET `/audit-logs` (Signed in, last 30 days).
- Dev: `reactStrictMode: false` in `next.config.js` (owner) so effects are not doubled. Local-only and **stashed** (not in the product commit): `scripts/preview.mjs`, `scripts/warm-routes.mjs`, package `preview`/`warm`, `.playwright-mcp/` screenshots, `.cursor/skills/quirri-design/SKILL.md`. Restore with `git stash list` if needed. Canonical design law stays in `docs/agent/design-system.md`.

## 2026-10-22
- Backend integration notes: no API contract change; `INTERVIEWS_ENABLED=false` routes stay 404 (feature off). Notification prefs stay on `/notifications/rules`; inbox is `/notifications/mine`; there is no `/preferences` route. Frontend hides leftover interview fields (`src/lib/product/interviewOff.js`).

## 2026-10-20
- AI interview module switched off in the backend (`INTERVIEWS_ENABLED=False`): interview routers unmounted (api/livekit-interview, api/interview-assignments marked disabled); interview report type + column, interview notification events / e-mails, health row and analytics cohort no longer offered; interview scores no longer count in `avg_score` (api/reports, api/analytics, api/faculty, api/health, api/notifications). No tables or data changed.

## 2026-10-14 (QA round)
- Cancel invite (`POST /users/{id}/revoke-invite`) added to api/users.md and flows/account-activation.md; `/edu_video/jobs` items carry `tenant_id` + `college_name`.

## 2026-10-14
- QA fixes (backend): subject-limited Faculty content metrics narrowed to their subjects (rules/staff-scope, metrics completion / watch-time / average-score / pass-rate / qa-demand); Q&A demand label "Not linked to a subject" + off-topic turns excluded; department HOD rule + HOD picker filters (tables/departments, api/users); voice tutor history accepts the login cookie (api/voice-qna); `mcq_status` on the jobs list (api/edu-video); interview `score_range=0-50` (api/livekit-interview); reports label Quizzes (api/reports); new api/health.
- Bundle created (OKF v0.2): access rules, 5 roles, 8 flows, 15 tables, 13 API modules, 8 metrics - from the code as of migration 0037.
