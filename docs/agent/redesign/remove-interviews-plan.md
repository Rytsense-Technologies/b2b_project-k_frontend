# Remove the AI interview module everywhere (owner, 20 Oct 2026)

Owner: "I don't need the interview module anywhere, not for final year either. Throughout the project remove the interview-based modules and functionalities, without affecting the existing flows."

## What "interview" means here (remove)
- Student: Interviews module (Start / Assigned / History, setup form, device check, role-mismatch dialog, waiting room, live LiveKit room), interview reports list + report detail (hero, question feedback, recording, audio recap, share card), dashboard / progress interview cards, tabs, KPIs, trends, "Start mock interview" CTAs, eligibility gating (`useInterviewAccess`).
- College Admin / HOD / Faculty: Interview assignments module (+ Cohort readiness), sidebar items, dashboard interview KPIs/cards, student-directory interview columns (`interview_avg`), analytics interview tabs/charts, interview report types, interview notification types / filters.
- Super Admin: dashboard interview KPIs and "Interviews" slice of Activity mix, any interview counts on colleges/[id], reports interview types.
- Backend: the interview API routers stop being mounted; interview e-mails / notifications stop firing; interview report types are no longer offered.

## What must NOT change (keep working)
- **AI tutor voice Q&A** (`VoiceQnaPanel`, `src/lib/api/voiceQna.js`, backend `app/voice_qna/**`, LiveKit itself, `/voice_qna/webhooks/livekit`). It uses LiveKit but is NOT the interview module.
- Lectures, assessments (MCQ), leaderboard, progress (non-interview parts), content / video review, MCQ review, academic structure, users, staff, students, reports that are not interview reports, analytics that are not interview analytics, settings, notifications (non-interview), login (frozen).
- Data: **no DB migrations, no table drops, no data deletion.** Models, alembic history and stored interview data stay (reversible).

## Method
1. Remove UI and calls; never leave a dead link, empty card, empty tab, "0 interviews" figure or a heading that mentions interviews.
2. Re-flow layouts so removing a card does not leave a hole (grids, two-column rows, stat clusters).
3. Delete files that become unused only inside your own scope. Shared libraries (`src/lib/api/interview*.js`, `src/lib/constants/interview.js`, `src/lib/validation/schemas/interview*.js`, `src/store/slices/interviewSlice.js`, `src/lib/livekitUrl.js`, `src/lib/livekitSession.js`) are cleaned up by the main session at the end — just stop importing them.
4. Wording: page subtitles, empty states and help text must not mention interviews.
5. Verify with Playwright (GET-only, mutations blocked), 1440 + 390, real logins (password `<seed-password>`): SA `xplain@`, CA `college1@`, HOD `hod@`, Faculty `faculty@`, Student `student@` (all `@yopmail.com`). Login limit ~5/min. Script: `C:/Users/ARUNK~1/AppData/Local/Temp/claude/E--b2b-superAdmin-frontend/900a3a8a-4f26-4ea1-87a3-64f58a5ddfbd/scratchpad/portal-shot.cjs` (`MSYS_NO_PATHCONV=1 node portal-shot.cjs <paths> <tag> <email> 1440,390`; logs CONSOLE / PAGEERR / HSCROLL).
6. Rules: no `next build`, don't restart dev servers, no commits, preserve line endings (`file`; prefer Edit tool; never `sed -i`), no mocks, India formats, follow `docs/agent/task.md`. Grep your scope for `interview|livekit|Interview` at the end and justify anything left.

## Ownership (strict — agents run in parallel)
| Agent | Owns |
|---|---|
| A Student | `src/app/student/**`, `src/components/student/**` (keep VoiceQnaPanel working), `src/lib/student/**`, `src/hooks/useInterviewAccess.js`, `src/styles/student-*.css` |
| B College Admin + HOD/Faculty | `src/app/admin/**`, `src/app/faculty/**`, `src/components/admin/**` except InsightsView.jsx, `src/components/faculty/**`, `src/components/shared/InterviewAssignmentsWorkspace.jsx`, `src/lib/admin/**`, `src/lib/faculty/**`, `src/styles/portal-admin.css`, `src/styles/portal-faculty.css` |
| C Super Admin + shared insights/reports | `src/app/superadmin/**`, `src/components/superadmin/**`, `src/components/shared/ReportsWorkspace.jsx`, `src/components/admin/InsightsView.jsx`, `src/lib/dashboard/**`, `src/lib/superadmin/**`, `src/lib/api/analytics.js`, `src/lib/api/reports.js`, `src/lib/api/admin/reports.js`, `src/styles/portal-superadmin.css`, `src/styles/module-analytics.css` |
| D Backend | `E:\b2b\b2b_projectk\app\**` (not migrations), `requirements*` untouched |
| Main session | everything else (shared libs, store, constants, validation, `RolePortalSidebar`, `portal-b2c.css`, `quirri-*.css`, docs/knowledge, memory), final cross-check + build |

Report: files changed / deleted, what was removed per screen, what was kept on purpose, screenshots, anything you need from another owner.
