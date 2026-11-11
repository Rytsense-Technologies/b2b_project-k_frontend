# Quirri B2B — Issue Register

Central backlog from the Phase 1 audit (2 Nov 2026), updated with Phase 2 results; see [PHASE_2_REMEDIATION_REPORT.md](PHASE_2_REMEDIATION_REPORT.md). Covers the frontend and backend repositories. Status values: Open · In Progress · Fixed · Blocked · Needs Business Decision.

**218 issues:** 1 Critical · 11 High · 109 Medium · 86 Low · 11 Informational. 286 raw findings from 9 audit areas plus the build check; 64 duplicates merged, 4 withdrawn. Every Critical/High finding was re-checked by an independent verifier; final severities reflect that.

Evidence notes: "confirmed" means reproduced or established from code. Write paths were read, not executed (Phase 1 was GET-only). Production hosts were not probed. No secret values appear here.

## Summary by category

| Category | Issues |
|---|---|
| Functional bug | 35 |
| Configuration/deployment | 28 |
| Performance | 23 |
| Backend defect | 22 |
| Security | 20 |
| Test coverage | 14 |
| Accessibility | 14 |
| Database integrity | 11 |
| Frontend defect | 10 |
| API defect | 10 |
| Authentication | 9 |
| Integration | 8 |
| Role/permission | 5 |
| Authorization | 5 |
| Cross-tenant leakage | 3 |
| Informational | 1 |

## Index

| ID | Severity | Status | Module | Title |
|---|---|---|---|---|
| [AUTHZ-001](#authz-001) | Critical | Fixed | Static mounts /uploads, /recordings | Resumes and interview recordings are served with no login |
| [AUTH-001](#auth-001) | High | Fixed | app/api/deps.py, app/api/deps_sync.py, app/servi | Refresh token is accepted as an access token, which defeats revocation for 30 days |
| [AUTH-003](#auth-003) | High | Fixed | app/api/v1/auth.py refresh_token; src/lib/axios. | Concurrent refresh calls trigger false reuse detection and sign the user out everywhere |
| [AUTH-004](#auth-004) | High | Fixed | app/api/v1/auth.py resend_activation, app/servic | /auth/resend-activation has no tenant scope and can revive deactivated accounts |
| [AUTH-006](#auth-006) | High | Fixed | app/api/v1/auth.py, app/api/deps.py, app/api/dep | Users of a deactivated college or university can still sign in and keep working |
| [AUTH-009](#auth-009) | High | Blocked | scripts/seed_superadmin.py, app/api/v1/setup.py | Superadmin seed uses a tracked password and a public disposable mailbox |
| [AUTHZ-006](#authz-006) | High | Fixed | RBAC | require_permission reads the raw column, so new admins are locked out of Users and Roles |
| [BACKEND-004](#backend-004) | High | Fixed | edu_video / regenerate | A failed video cannot be retried: the error says 'Press Regenerate', the API refuses |
| [BUILD-001](#build-001) | High | Fixed | Frontend build / RolePortalSidebar / Faculty + S | Production build fails: 18 Faculty and Student pages use useSearchParams outside Suspense |
| [INFRA-004](#infra-004) | High | Blocked | deploy.yml / notification_service | Production deploy omits all e-mail settings, so invites and password resets are never sent |
| [INFRA-005](#infra-005) | High | Blocked | Backend repository history | Historic API key values remain in backend git history |
| [TEST-005](#test-005) | High | Blocked | frontend CI / release | Frontend production deploy is stale since 28 Sep; last two deploys did not complete |
| [AUTH-002](#auth-002) | Medium | Fixed | app/api/v1/auth.py logout, app/services/token_se | Logout never revokes the refresh token because the cookie is not sent to /auth/logout |
| [AUTH-005](#auth-005) | Medium | Fixed | app/api/v1/auth.py activate_account, app/api/v1/ | /auth/activate ignores deactivation, and deactivating a user leaves their tokens live |
| [AUTH-007](#auth-007) | Medium | Fixed | app/config.py | JWT_SECRET_KEY has a public default and no production startup check |
| [AUTH-008](#auth-008) | Medium | Accepted | app/api/v1/setup.py, app/main.py, app/config.py | Unauthenticated superadmin bootstrap is open in every environment not named exactly 'production' |
| [AUTH-010](#auth-010) | Medium | Fixed | src/lib/api/voiceQna.js, src/hooks/useAuth.js, s | 30-day voice bearer token stays in localStorage after logout and can expose the previous student's history |
| [AUTH-011](#auth-011) | Medium | Fixed | app/api/v1/auth.py, app/voice_qna/rate_limiter.p | Per-IP login limit of 5/minute will block whole campuses behind one address |
| [AUTH-012](#auth-012) | Medium | Fixed | app/api/v1/auth.py login | Login leaks which accounts exist and allows anyone to keep any account locked |
| [AUTHZ-002](#authz-002) | Medium | Fixed | Frontend route handlers /api/edu-video/* | Next.js pending-changes routes have no auth and hold all tenants in one file |
| [AUTHZ-008](#authz-008) | Medium | Fixed | edu_video upload, PATCH chapter | Upload and chapter link skip the staff write rules |
| [AUTHZ-010](#authz-010) | Medium | Fixed | Users | College Admin can demote, deactivate or cancel a peer College Admin, or demote themselves |
| [AUTHZ-012](#authz-012) | Medium | Fixed | Scoping helpers across routers | Tenant filters fail open for a non-superadmin account with no tenant_id |
| [AUTHZ-013](#authz-013) | Medium | Fixed | Reports, Audit export | Report exports allow spreadsheet formula injection |
| [AUTHZ-014](#authz-014) | Medium | Fixed | Audit | Audit log misses most authorization-relevant actions |
| [AUTHZ-023](#authz-023) | Medium | Fixed | tests/ | No route-wide authorization test exists |
| [BACKEND-005](#backend-005) | Medium | Fixed | voice_qna | Students can reach unpublished, deleted and other-programme chapters through the voice tutor |
| [BACKEND-006](#backend-006) | Medium | Fixed | mcq | Regenerating or editing a quiz leaves old attempts in place, so 'one attempt per set' is really one per chapter |
| [BACKEND-007](#backend-007) | Medium | Fixed | colleges / users | Student seat cap can be exceeded by role change, college move, cap edits and concurrent requests |
| [BACKEND-010](#backend-010) | Medium | Fixed | users / activation | Deactivate does not stop a pending invite, and Reactivate on a pending user leaves a stuck 'active' account |
| [BACKEND-011](#backend-011) | Medium | Fixed | all list endpoints | A NUL byte in any search box gives HTTP 500 on most list routes |
| [BACKEND-012](#backend-012) | Medium | Fixed | all paged endpoints | Very large page or offset values give HTTP 500 |
| [BACKEND-013](#backend-013) | Medium | Fixed | users | Bad filter values on GET /users give HTTP 500 |
| [BACKEND-014](#backend-014) | Medium | Fixed | colleges / universities / departments | PATCH with an explicit null crashes on required columns |
| [BACKEND-015](#backend-015) | Medium | Fixed | roles | System roles can be deactivated, and any role emptied, through PATCH /roles/{code} |
| [BACKEND-016](#backend-016) | Medium | Fixed | users / promotion | Year promotion leaves the semester behind, cannot be undone and is not idempotent |
| [BACKEND-017](#backend-017) | Medium | Fixed | users / staff_scope | Faculty moved to another department keep their old subject assignments |
| [BACKEND-018](#backend-018) | Medium | Fixed | departments / staff_scope | A department head who keeps role 'faculty' gets no HOD powers |
| [BACKEND-019](#backend-019) | Medium | Fixed | edu_video bridge | /api/edu-video/pending-changes reports every sent chapter and ignores staff scope |
| [BACKEND-020](#backend-020) | Medium | Fixed | edu_video / upload | Upload route reads unlimited files into memory and blocks the event loop |
| [BACKEND-021](#backend-021) | Medium | Needs Business Decision | edu_video / delete | Soft-deleting a chapter does not cascade and has no guard for published content |
| [BACKEND-022](#backend-022) | Medium | Fixed | academics / edu_video | Archiving a chapter, subject, programme or department does not hide published videos; department archive ignores content |
| [BACKEND-023](#backend-023) | Medium | Fixed | reports / analytics | Completion ignores the student's programme, so it can never reach 100% in a multi-programme department |
| [BACKEND-024](#backend-024) | Medium | Fixed | reports / college_insights / dashboard | Reports and analytics disagree although both claim one aggregate |
| [BACKEND-025](#backend-025) | Medium | Fixed | health | uptime_24h ignores downtime at the start of the window |
| [BACKEND-026](#backend-026) | Medium | Blocked | mcq / reports PDF | Quiz report PDF crashes for Tamil chapter names and prints Tamil as blocks |
| [BACKEND-028](#backend-028) | Medium | In Progress | reports / analytics / academics | Reports and dashboards load every student per request and will fail at large IN lists |
| [BACKEND-029](#backend-029) | Medium | Fixed | voice_qna / rate limiter | Per-IP limits on voice endpoints throttle whole classes, and may be platform-wide behind a proxy |
| [BACKEND-030](#backend-030) | Medium | Fixed | audit_logs | Audit list stops at 200 rows with no paging; unknown ranges silently mean 30 days |
| [BACKEND-031](#backend-031) | Medium | In Progress | notifications / workers | Bulk emails run on daemon threads with no queue; a restart loses them with no record |
| [BACKEND-032](#backend-032) | Medium | Fixed | notifications / review loop | Reviewers are not told when a regenerated chapter returns, and the uploader's bell is suppressed |
| [DATA-002](#data-002) | Medium | Fixed | alembic/versions/0045_user_notifications.py | Migration 0045 is not safe on a database that already ran the old 0040_user_notifications |
| [DATA-003](#data-003) | Medium | Needs Business Decision | Local environment / DATABASE_URL | Windows Postgres runs on 0.0.0.0:5432 while the API DB URL is localhost:5432 |
| [DATA-004](#data-004) | Medium | Fixed | alembic/env.py | alembic/env.py sees only 31 of 41 tables, so autogenerate would propose dropping live tables |
| [DATA-007](#data-007) | Medium | Fixed | users | Moving a user to another college keeps department, programme, semester and subject assignments from the old college |
| [DATA-009](#data-009) | Medium | Fixed | edu_video | Publish and send-to-HOD are check-then-write across several commits |
| [DATA-013](#data-013) | Medium | Fixed | Schema | Only one CHECK constraint exists in the whole database |
| [DATA-014](#data-014) | Medium | Fixed | Schema | 21 id columns have no foreign key, and the denormalised hierarchy ids are unguarded |
| [DATA-015](#data-015) | Medium | Fixed | users / academics / departments / mcq | Uniqueness is case-insensitive in code but case-sensitive in the DB; races and case variants give 500s or duplicates |
| [DATA-017](#data-017) | Medium | Fixed | app/db, app/voice_qna/db.py | Three separate connection pools can exceed max_connections |
| [DATA-018](#data-018) | Medium | Fixed | edu_video upload / mcq | Sync database calls run on the event loop in async routes |
| [FE-003](#fe-003) | Medium | Fixed | src/middleware.js | Middleware redirects ignore Host and X-Forwarded-Host and point to localhost:3100 |
| [FE-004](#fe-004) | Medium | Fixed | src/hooks/useSystemNotifications.js | Desktop alerts can effectively never fire |
| [FE-006](#fe-006) | Medium | Fixed | src/components/student/VoiceQnaPanel.jsx, src/li | Documented type-instead tutor and conversation rename do not exist in the frontend |
| [FE-007](#fe-007) | Medium | Fixed | FacultySidebar, faculty dashboard, useFacultySco | When GET /faculty/me fails, the HOD/Faculty sidebar is empty and the dashboard says Loading your scope forever |
| [FE-008](#fe-008) | Medium | Fixed | src/hooks/useAsyncResource.js (all list pages) | useAsyncResource has no stale-response guard, so an older slow response can overwrite a newer one |
| [INFRA-002](#infra-002) | Medium | Fixed | Frontend dependencies | Next.js 14.2.3 middleware authorisation bypass is reproducible; npm audit reports 1 critical and 6 high |
| [INFRA-007](#infra-007) | Medium | Blocked | docker-compose.deploy.yml / operations | No backup, restore or disaster-recovery provision |
| [INFRA-008](#infra-008) | Medium | Blocked | Edge / reverse proxy | nginx configuration is not versioned, so HTTPS and routing cannot be reviewed |
| [INFRA-009](#infra-009) | Medium | Blocked | app/main.py, next.config.js | No security headers on the API or the Next.js app |
| [INFRA-011](#infra-011) | Medium | Fixed | docker-compose.deploy.yml, deploy.yml | Services bind on all host interfaces; Redis has no password |
| [INFRA-012](#infra-012) | Medium | In Progress | Dockerfile (both repos) | Containers run as root |
| [INFRA-013](#infra-013) | Medium | Fixed | docker-compose.deploy.yml | No resource limits, app healthchecks or log rotation in production compose |
| [INFRA-014](#infra-014) | Medium | Fixed | Dockerfile:39 | Migrations run in the backend container CMD without backup or failure handling |
| [INFRA-015](#infra-015) | Medium | Fixed | docker-compose.deploy.yml, deploy.yml | Removed interview stack still deployed and it can fail a deploy |
| [INFRA-016](#infra-016) | Medium | Fixed | edu_video routes, voice tutor | No upload throttling, usage metering or spend cap on paid AI work |
| [INFRA-018](#infra-018) | Medium | Blocked | app/edu_video/routes.py, document_merger.py, ext | Upload validation checks only extension; no parser limits; oversize files are read fully first |
| [INFRA-019](#infra-019) | Medium | Blocked | app/edu_video/llm | LLM clients in the video pipeline use the SDK default 10-minute timeout |
| [INFRA-020](#infra-020) | Medium | Accepted | voice tutor, narrator | Sarvam is a single point of failure with no credit or key alert |
| [INFRA-021](#infra-021) | Medium | Needs Business Decision | app/services/ops_monitor.py | Monitoring is in-app only: no external alerting or error tracking |
| [INFRA-022](#infra-022) | Medium | Needs Business Decision | Whole product | No DPDP-style consent, retention or erasure for personal data |
| [INFRA-023](#infra-023) | Medium | Blocked | app/config.py, notification_service.py | Debug mode has no production guard and exposes reset links and provider errors |
| [INFRA-025](#infra-025) | Medium | Blocked | src/lib/apiConfig.js, src/lib/livekitUrl.js, nex | Hardcoded test IP over plain HTTP, stale domains, unused build argument |
| [INFRA-026](#infra-026) | Medium | Blocked | livekit.prod.yaml (generated in deploy.yml) | No TURN or TLS fallback for voice on restricted college networks |
| [PIPE-001](#pipe-001) | Medium | Blocked | edu_video / slide rendering | Every Tamil word on a slide is drawn as question marks in the deployed image |
| [PIPE-002](#pipe-002) | Medium | Fixed | edu_video / slide rendering | Math and science symbols become empty boxes on Linux because text is measured in one font and drawn in another |
| [PIPE-003](#pipe-003) | Medium | Fixed | edu_video / coverage, scripter | Tamil video of an English document: coverage logic sees nothing covered, drops illustrations and can lose whole chapters |
| [PIPE-004](#pipe-004) | Medium | Fixed | edu_video / planning | A degraded plan looks the same as a good one: outages produce raw-sentence or unverified videos marked DONE |
| [PIPE-005](#pipe-005) | Medium | Fixed | edu_video / visual_renderer, pipeline | Slide render failures are invisible and the retry loop never runs for them |
| [PIPE-006](#pipe-006) | Medium | Fixed | edu_video / pipeline_executor, job_recovery | One hung or long job stops all video generation for every college |
| [PIPE-007](#pipe-007) | Medium | Fixed | edu_video / structurer | Long .docx, .txt and merged documents are not chunked, and structuring output is not validated |
| [PIPE-008](#pipe-008) | Medium | Fixed | edu_video / verifier, scripter prompt | Fact-check covers spoken narration only: slide text and chart numbers are never checked, and a removed claim stays on the slide |
| [PIPE-009](#pipe-009) | Medium | Fixed | mcq / openai_service | A cut-off MCQ response fails the whole generation; the code comment says otherwise |
| [PIPE-010](#pipe-010) | Medium | Fixed | mcq / openai_service | Quiz questions silently come only from the first 20,000 characters of a document |
| [PIPE-011](#pipe-011) | Medium | Fixed | edu_video extractor, mcq parser, voice_qna parse | The three document parsers disagree: video and quiz lose tables, and UTF-16 text becomes junk |
| [PIPE-012](#pipe-012) | Medium | Fixed | voice_qna / qna_agent | Preemptive voice generation is always thrown away, so each turn can pay for LLM and TTS twice |
| [PIPE-013](#pipe-013) | Medium | Fixed | voice_qna / tutor_text | Crisis detection fires on ordinary lesson questions and the tutor refuses to teach |
| [PIPE-022](#pipe-022) | Medium | Fixed | edu_video / job_tracker, pipeline | Late workers are not fenced: a job deleted near the end still gets a video and a 'ready' email |
| [TEST-001](#test-001) | Medium | Fixed | backend tests / multi-tenancy | No DB-backed tests: SQL and tenant filters are never executed |
| [TEST-002](#test-002) | Medium | Fixed | app/api/v1/auth.py | Login, refresh, reset, activation and OTP endpoints have no tests |
| [TEST-003](#test-003) | Medium | Fixed | CI (.github/workflows/deploy.yml, both repos) | CI runs no tests, lint or migration check before deploying to production |
| [TEST-004](#test-004) | Medium | Blocked | GitHub repo settings | Production branches are not protected |
| [TEST-007](#test-007) | Medium | Fixed | app/api/v1/users.py, roles.py, colleges.py, univ | User, role and college administration has no route tests |
| [TEST-008](#test-008) | Medium | Fixed | frontend | Frontend has no test runner and no tests |
| [TEST-009](#test-009) | Medium | Blocked | alembic/ | No Alembic checks despite repeated migration incidents |
| [TEST-010](#test-010) | Medium | Fixed | app/api/v1/notifications.py, notification_servic | Notification rules tests never reached git; switches untested at route level |
| [TEST-011](#test-011) | Medium | Fixed | app/mcq/api/routes.py submit_answers | Quiz one-attempt rule has no test |
| [TEST-012](#test-012) | Medium | Fixed | app/edu_video/routes.py | Publish workflow covered only at the final step, with mocks |
| [TEST-013](#test-013) | Medium | Fixed | backend test setup | No coverage tooling or pytest config |
| [TEST-014](#test-014) | Medium | Fixed | frontend | No ESLint config: npm run lint is not a working gate |
| [TEST-017](#test-017) | Medium | Fixed | deploy.yml, docker-compose.deploy.yml | Deploy has no rollback, no timeout, floating tags and no DB backup |
| [UX-001](#ux-001) | Medium | Fixed | Student classroom / edu-video pipeline | Classroom videos have no captions or transcript |
| [UX-002](#ux-002) | Medium | Accepted | All portals: primary buttons | White text on the primary orange button is 2.59:1 |
| [UX-003](#ux-003) | Medium | Accepted | Faculty/admin status text, data-viz bands | Orange text on white is 2.59:1 (status words, "Needs focus", reasons) |
| [UX-004](#ux-004) | Medium | Fixed | All portals: secondary text | Muted grey #707A7E fails contrast on white and on the canvas, on every page |
| [UX-006](#ux-006) | Medium | Fixed | College admin: Programmes & subjects | Programmes list has invalid listbox markup |
| [UX-015](#ux-015) | Medium | Fixed | Student portal bundle | LiveKit (536 KB) is downloaded on the student home and subjects pages, with no code splitting anywhere |
| [UX-016](#ux-016) | Medium | Fixed | Shared data-viz | Recharts ships on 30 routes but only 2 files draw with it |
| [UX-017](#ux-017) | Medium | In Progress | Student home, admin dashboard, content | LCP is about 3.7-4.6 s on throttled mobile |
| [UX-022](#ux-022) | Medium | Fixed | Backend startup | API startup takes about 2 minutes because the video pipeline is imported eagerly |
| [UX-023](#ux-023) | Medium | Blocked | Deployment | Production container runs a single uvicorn worker |
| [AUTH-014](#auth-014) | Low | Fixed | app/api/v1/auth.py reset_password, src/app/auth/ | Password reset does not clear a lockout, though the login page says it will; the client lock is misleading |
| [AUTH-015](#auth-015) | Low | Fixed | app/api/v1/auth.py forgot_password, send_otp, ve | No per-account limit on reset and OTP mail; public OTP endpoints serve no flow |
| [AUTH-017](#auth-017) | Low | Fixed | app/api/v1/auth.py | Security events are not audited |
| [AUTH-020](#auth-020) | Low | Fixed | app/api/v1/auth.py change_password, reset_passwo | Sessions linger after credential changes, and password change leaves the access cookie behind |
| [AUTH-022](#auth-022) | Low | Fixed | src/lib/axios.js, src/lib/api/admin/eduVideo.js | Queued requests never settle when refresh fails |
| [AUTH-023](#auth-023) | Low | Fixed | app/api/v1/auth.py reset_password, activate_acco | Single-use token checks are not atomic |
| [AUTHZ-015](#authz-015) | Low | Fixed | Academics | Faculty can read staff data that docs reserve for HOD |
| [AUTHZ-016](#authz-016) | Low | Fixed | Leaderboard, Academics summary | Accounts with no department fall back to college-wide numbers |
| [AUTHZ-021](#authz-021) | Low | Fixed | voice_qna | Voice lesson check answers 403, so it discloses other tenants' lesson ids |
| [BACKEND-002](#backend-002) | Low | Blocked | alembic / deployment | Committed migrations are broken: two revision 0040 files, and the fix (0045) is uncommitted |
| [BACKEND-034](#backend-034) | Low | Fixed | notifications | Failed email rows keep one-time links in plain text, retries resend stale ones, retry runs inside the request |
| [BACKEND-035](#backend-035) | Low | Accepted | notifications | In-app docs promise all 15 events and an inbox row for test sends; code delivers 8 events and none for tests |
| [BACKEND-036](#backend-036) | Low | Fixed | edu_video / notifications | Provider error text is shown to users and emailed |
| [BACKEND-037](#backend-037) | Low | Fixed | reports | Report PDF subtitle is not escaped for institution names |
| [BACKEND-038](#backend-038) | Low | Fixed | reports / dashboard | Invalid range values are accepted silently on reports and dashboard |
| [BACKEND-039](#backend-039) | Low | Fixed | reports / audit | Date logic uses UTC, not IST |
| [BACKEND-041](#backend-041) | Low | Fixed | faculty_directory | student_detail pass_rate covers only the latest 20 attempts |
| [BACKEND-042](#backend-042) | Low | Fixed | voice_qna / ingestion_worker | Ingestion reconciliation sees only the newest 200 jobs, and work on deleted jobs continues |
| [BACKEND-043](#backend-043) | Low | Fixed | edu_video / job_recovery | Recovery counter is lifetime, and legacy pre-render endpoints stay live |
| [BACKEND-046](#backend-046) | Low | Fixed | academics | Academic edge cases: resize re-enables semesters, reactivation skips checks |
| [BACKEND-047](#backend-047) | Low | Accepted | mcq | MCQ generate: database errors return 400, runs on non-DONE jobs and holds the HTTP request |
| [BACKEND-048](#backend-048) | Low | Fixed | voice_qna | Voice API docs differ from code |
| [BACKEND-049](#backend-049) | Low | Fixed | main | Swagger and OpenAPI are public; some edu_video metadata routes have no auth |
| [BACKEND-050](#backend-050) | Low | Fixed | users | create_user and update_user accept inconsistent placement |
| [BACKEND-051](#backend-051) | Low | Fixed | users / departments / academics | Uncaught unique-violation races |
| [BACKEND-052](#backend-052) | Low | Fixed | mcq | Quiz PDF bands do not match the pass mark |
| [DATA-019](#data-019) | Low | Fixed | users, academics, colleges, universities, depart | N+1 queries and unpaginated list endpoints |
| [DATA-020](#data-020) | Low | Fixed | edu_video watch progress | Watch progress first write race and lost update |
| [DATA-021](#data-021) | Low | Blocked | alembic/versions | Migration downgrades are unsafe or impossible |
| [DATA-023](#data-023) | Low | Fixed | auth tokens / ops_monitor | No purge for expired tokens; error table has no flood control |
| [DATA-024](#data-024) | Low | Fixed | Schema | Missing indexes on foreign keys and frequent filters |
| [DATA-025](#data-025) | Low | Fixed | app/config.py, app/db/async_session.py, app/voic | Hard-coded credentialed DATABASE_URL default, and URL echoed in exceptions |
| [DATA-027](#data-027) | Low | Fixed | mcq | attempt reset has no lock; double submit returns 500 |
| [DATA-028](#data-028) | Low | Fixed | edu_video | Two published videos on one chapter; no rule in the schema |
| [FE-009](#fe-009) | Low | Fixed | Admin/SA list pages, ChapterLinkModal, StudentPl | Failures of supporting lookups are silent; some cards stay on Loading forever |
| [FE-011](#fe-011) | Low | Fixed | src/app/auth/reset-password/page.js | Reset password button says Save & sign in but does not sign in |
| [FE-012](#fe-012) | Low | Fixed | department detail, college detail, academics, fa | Raw validator messages are shown to users on malformed URLs |
| [FE-013](#fe-013) | Low | Fixed | src/components/shared/McqReviewWorkspace.jsx | MCQ deep links to a missing or removed chapter fail silently |
| [FE-014](#fe-014) | Low | Fixed | src/lib/notifications/scenarios.js | Bell deep links ignore the per-event map for jobs, so some alerts open the wrong page |
| [FE-015](#fe-015) | Low | Fixed | SystemNotificationInbox | Bell actions do not refresh an open inbox page |
| [FE-016](#fe-016) | Low | Fixed | src/lib/product/interviewOff.js, useSystemNotifi | Interview filter hides legitimate alerts containing the word mock while the badge still counts them |
| [FE-017](#fe-017) | Low | Fixed | AccountSettings.jsx, useAuth.js | Faculty scope cache survives the password-change sign-out |
| [FE-019](#fe-019) | Low | Fixed | src/lib/auth/rbac.js | Unknown backend roles default to student |
| [FE-020](#fe-020) | Low | Fixed | all filter and picker lookups | Dropdown lookups fetch one page of 100 with no paging |
| [FE-021](#fe-021) | Low | Fixed | src/components/shared/McqStudentQuiz.jsx | In-progress quiz answers are lost on reload |
| [FE-022](#fe-022) | Low | Fixed | all logout paths | Sign-out reports success even when the server call failed |
| [FE-023](#fe-023) | Low | Fixed | src/hooks/useLiveRefresh.js | useLiveRefresh fires two refreshes when a tab regains focus |
| [FE-024](#fe-024) | Low | Fixed | src/app/layout.js, src/lib/student/fonts.js | DM Sans still loads on every page, and Poppins 300 is loaded, against the font lock |
| [INFRA-028](#infra-028) | Low | Fixed | docker/egress.yaml, docker/livekit.yaml, .env.ex | LiveKit dev credentials tracked; production key name is the literal devkey |
| [INFRA-029](#infra-029) | Low | Blocked | app/services/notification_service.py:273 | EMAIL_TEST_RECIPIENT has no production guard |
| [INFRA-031](#infra-031) | Low | Blocked | app/mcq/services/openai_service.py, app/edu_vide | Document text reaches the planner and MCQ prompts without an untrusted-data boundary |
| [INFRA-035](#infra-035) | Low | Blocked | Both repos | Repository and image hygiene |
| [PIPE-014](#pipe-014) | Low | Fixed | mcq / openai_service, validation | Quiz generator accepts questions that the reviewer rules reject |
| [PIPE-015](#pipe-015) | Low | Fixed | voice_qna / tutor_text, qna_agent, text_chat_ser | Document-controlled text reaches the tutor's system prompt, and the material delimiter can be spoofed |
| [PIPE-016](#pipe-016) | Low | Fixed | voice_qna / retrieval_service | Tutor keyword fallback does not work for Tamil questions |
| [PIPE-017](#pipe-017) | Low | Fixed | voice_qna / api/simple.py, text_chat_service | Text chat can hold a database connection during the model call |
| [PIPE-018](#pipe-018) | Low | Fixed | voice_qna / qna_agent | No maximum length for a voice call |
| [PIPE-019](#pipe-019) | Low | Fixed | voice_qna / qna_agent, session_reaper, qna_sessi | A resumed call can be marked ended while it is live |
| [PIPE-020](#pipe-020) | Low | Fixed | edu_video / asset_storage, storage | S3 upload failures break the 'never raises' promise in asset_storage |
| [PIPE-021](#pipe-021) | Low | Fixed | edu_video / storage layers | Local disk grows without a bound: orphan temp files, source images and a count-limited audio cache |
| [PIPE-023](#pipe-023) | Low | Fixed | edu_video / svg_renderer, tests | Slide layouts are tuned on Windows Arial, but production measures with the wider DejaVu |
| [PIPE-024](#pipe-024) | Low | Fixed | edu_video / scripter | English lines are spoken inside Tamil videos |
| [PIPE-025](#pipe-025) | Low | Fixed | services / notification_events, email_templates | Pipeline and assessment emails: wrong page for some uploaders, conflicting advice, repeat sends, unactivated recipients |
| [PIPE-028](#pipe-028) | Low | Fixed | tests/voice_qna | Three voice tests depend on the developer's .env, which differs from the code default |
| [TEST-015](#test-015) | Low | Fixed | frontend | No type-check; tsc rejects jsconfig, TypeScript is only transitive |
| [TEST-020](#test-020) | Low | Fixed | frontend tooling | Preview scripts missing while config and docs still describe them |
| [TEST-021](#test-021) | Low | Blocked | AGENTS.md, CLAUDE.md, docs/knowledge/log.md | Docs reference missing files; log claims check-knowledge is in the repo |
| [TEST-022](#test-022) | Low | Fixed | tests/test_teaching_portal_routers.py, tests/voi | Disabled and environment-conditional tests hide coverage; 8 of 14 in one file never run |
| [TEST-023](#test-023) | Low | Blocked | tests/edu_video, tests/voice_qna | Timing-based tests are likely flaky on slow disks |
| [UX-005](#ux-005) | Low | Fixed | data-viz .mdc-pill | Tinted status pills miss 4.5:1 by a small margin |
| [UX-007](#ux-007) | Low | Fixed | Student progress, college insights | Line and column charts have no text alternative |
| [UX-008](#ux-008) | Low | Fixed | All portal layouts | No skip link on any page |
| [UX-009](#ux-009) | Low | Fixed | All portal layouts | Page h1 sits outside all landmarks |
| [UX-010](#ux-010) | Low | Fixed | Module cards across portals | Heading levels skip from h1 to h3 |
| [UX-011](#ux-011) | Low | Fixed | Dashboards | Two unnamed complementary landmarks on dashboards |
| [UX-012](#ux-012) | Low | Accepted | Student subjects | Focus indicator not detected on student subject-card title links |
| [UX-013](#ux-013) | Low | Fixed | Auth pages | Generic document title on three public auth pages |
| [UX-014](#ux-014) | Low | Fixed | Frozen login (report only) | Login field error is not tied to its input |
| [UX-018](#ux-018) | Low | Fixed | Superadmin lists | Layout shift above 0.1 on superadmin list pages |
| [UX-019](#ux-019) | Low | Fixed | Settings, student subjects | Duplicate API calls on a few pages |
| [UX-020](#ux-020) | Low | Fixed | Student leaderboard | Leaderboard polls 100 rows every 15 s and ranks in Python without a cache |
| [UX-025](#ux-025) | Low | Fixed | Analytics | College analytics runs one pass-rate query per department |
| [UX-026](#ux-026) | Low | Fixed | Backend | API has no response compression of its own |
| [UX-027](#ux-027) | Low | Blocked | Root layout | Global CSS for all portals loads on every route |
| [UX-028](#ux-028) | Low | Blocked | Static assets | Oversized logo SVG and missing favicon |
| [UX-033](#ux-033) | Low | Fixed | CI | No automated accessibility or bundle checks in CI |
| [AUTH-025](#auth-025) | Informational | Fixed | app/utils/security.py, app/schemas/auth.py | Password policy is minimal, with a byte-truncation edge |
| [AUTH-027](#auth-027) | Informational | Fixed | src/middleware.js, src/lib/tokens.js | Middleware trusts client-writable pk_ cookies, for page shell routing only |
| [BACKEND-053](#backend-053) | Informational | Blocked | docs | Documentation and label drift |
| [DATA-030](#data-030) | Informational | Fixed | Models | Model and schema drift, and dead columns |
| [FE-026](#fe-026) | Informational | Fixed | components/*, lib/* | Dead code from B2C, plans, payments, jobs, OTP and old portals is still in src (38 unreachable modules) |
| [FE-028](#fe-028) | Informational | Blocked | repo root, apiConfig.js, next.config.js | Repository housekeeping: tracked temp files, hard-coded test IP, client-side auth bypass flag |
| [INFRA-037](#infra-037) | Informational | Fixed | app/edu_video/stages/visualizer.py, requirements | Dead code and unused dependencies, including an LLM-code runner |
| [PIPE-026](#pipe-026) | Informational | Fixed | voice_qna | A crisis message alerts nobody |
| [PIPE-027](#pipe-027) | Informational | Fixed | edu_video | Dead pipeline code and stale comments mislead readers |
| [UX-031](#ux-031) | Informational | Fixed | Edu-video download | Observation: video delivery works; no Cache-Control and a single rendition |
| [UX-032](#ux-032) | Informational | Fixed | next.config.js | Observation: stale @react-pdf/renderer config |


## Critical

### AUTHZ-001

**Resumes and interview recordings are served with no login**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Critical |
| Category | Security |
| Affected module | Static mounts /uploads, /recordings |
| Finding status | confirmed |
| Duplicates merged | BACKEND-001, INFRA-001 |

**Phase 2 remediation (Fixed):** Removed the /uploads and /recordings mounts from app/main.py.

**Evidence:** tests/integration/test_admin_access.py::test_stored_files_are_not_served_anonymously failed before, passes now.

**Description:** Resumes and interview recordings are served with no login.

**Root cause / investigation status:** app/main.py:111-117 and 119-129 mount StaticFiles with no auth whenever the storage backend is "local". The mounts sit outside the INTERVIEWS_ENABLED gate (main.py:170), so they stay live with the module off. .github/workflows/deploy.yml lines 131 and 142 set FILE_STORAGE_BACKEND=local and RECORDING_STORAGE_BACKEND=local, so production mounts them too unless nginx blocks them (no nginx config in the repo).

**Reproduction:** 1. List files under E:/b2b/b2b_projectk/uploads and recordings. 2. With no cookie, GET http://127.0.0.1:8000/uploads/resumes/<dir>/<file>.pdf and /recordings/interviews/<id>/recording.mp4 with Range bytes=0-0. Result: 206 application/pdf for 3 of 3 resumes, 206 video/mp4 for 1 of 1 recording. Directory URLs return 404, so a caller needs the path.

**Expected:** Personal files need an authenticated, scoped request, or stay unreachable while the module is off.

**Actual:** Anyone holding a URL downloads the file. Paths are stored in user_resumes.resume_url and livekit_reports.recording_url. Recording paths are built only from a session id. A browser history or log entry is enough, and the link never expires. Precondition: the caller must know the path, because listing is off.

**Proposed fix:** Remove both mounts. Serve through an authenticated route that checks owner or staff scope, or use short-lived presigned URLs with a private bucket. With the module off, return 404. Move existing files out of any web-served path.

**Regression test required:** Anonymous GET on a known /uploads and /recordings file returns 401 or 404; owner and in-scope staff succeed; out-of-scope staff get 404.

**Dependencies / blockers:** Decide what happens to stored resumes and recordings now the interview module is off.

**Verification:** confirmed: app/main.py:111-129 mounts /uploads and /recordings as plain StaticFiles, outside the INTERVIEWS_ENABLED gate (main.py:170). deploy.yml:131,142 force both backends to local. Anonymous Range GET: 3 of 3 resumes returned 206 application/pdf, 1 of 1 recording returned 206 video/mp4. Directory GET /uploads/ returns 404. next.config.js has no rewrite for these paths. Note: Auditors disagreed (Critical vs High). Kept Critical because the brief defines unauthenticated data access that way and the data is PII. This is the most debatable rating: the URL holds a UUID (plus 8 hex for resumes) and cannot be listed, so an attacker needs a leaked URL. URLs never expire. Local data: only 1 user_resumes row and 0 recording rows, so the 3 PDFs and the MP4 are mostly orphans. Production file presence and nginx behaviour not verifiable.


## High

### AUTH-001

**Refresh token is accepted as an access token, which defeats revocation for 30 days**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Authentication |
| Affected module | app/api/deps.py, app/api/deps_sync.py, app/services/token_service.py |
| Finding status | confirmed |
| Duplicates merged | AUTHZ-003 |

**Phase 2 remediation (Fixed):** is_access_payload enforced in deps.py and deps_sync.py.

**Evidence:** test_refresh_token_is_not_an_access_token_* failed for 5 roles before, pass now.

**Description:** Refresh token is accepted as an access token, which defeats revocation for 30 days.

**Root cause / investigation status:** deps.py:15-20 and deps_sync.py:44-52 decode the JWT and use `sub` without checking `type`. Access and refresh tokens share one key (token_service.py:26,38), and decode_token (token_service.py:42-46) never looks at the refresh_tokens table. The voice_qna code already guards this (security.py:59-61 is_access_payload, rate_limiter.py:69), so the check exists but was never applied to the main dependencies.

**Reproduction:** 1. Take the refresh_token cookie value of any session. 2. GET /api/v1/auth/me with header `Cookie: access_token=<refresh token>`. 3. For the Bearer path, GET /edu_video/student/videos with `Authorization: Bearer <refresh token>` as a student. Observed live: HTTP 200 on /auth/me for all five roles (superadmin, college_admin, hod, faculty, student), each returning that role; 200 on the sync Bearer path for student. /voice_qna/conversations correctly returned 401 for the same token.

**Expected:** 401. A refresh token is only valid at /auth/refresh-token, only while its DB row is unrevoked.

**Actual:** A refresh token works on every cookie-authenticated API route for its full 30-day life. Because no DB row is consulted, this should also hold after logout, password change, password reset or reuse detection; the tokens probed were unrevoked, so the revoked case follows from the code and was not run. Only user deactivation stops it, since is_active is read live.

**Proposed fix:** Reject tokens with type == 'refresh' in decode paths used by deps.py and deps_sync.py (reuse is_access_payload), and add an explicit type='access' claim. Consider a separate signing key for refresh tokens.

**Regression test required:** Refresh token sent as access_token cookie and as Bearer returns 401 on one async and one sync route; a revoked refresh token also returns 401.

**Dependencies / blockers:** None. Do this together with AUTH-002.

**Verification:** confirmed: deps.py:15-20 and deps_sync.py:44-52 use decode_token, which never checks the type claim, and neither reads refresh_tokens. Live: refresh JWT sent as the access_token cookie gave /auth/me 200 with the correct role for all 5 roles; /voice_qna/conversations 401; Bearer on /edu_video/student/videos 200 for student, 403 for the other roles (role check, so the token was accepted). Note: The after-logout claim is from code only: all 5 probed tokens have is_revoked=false. Not Critical: needs a stolen token, and the refresh cookie is path-scoped. Fix must be in decode path or both deps files.

### AUTH-003

**Concurrent refresh calls trigger false reuse detection and sign the user out everywhere**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Functional bug |
| Affected module | app/api/v1/auth.py refresh_token; src/lib/axios.js; src/lib/api/admin/eduVideo.js; src/lib/api/voiceQna.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** rotated_at column (0046), row lock, 30 s grace that renews only the access cookie; one shared refreshSession in the frontend.

**Evidence:** test_second_refresh_right_after_rotation_keeps_the_session, replay test, src/lib/sessionRefresh.test.js.

**Description:** Concurrent refresh calls trigger false reuse detection and sign the user out everywhere.

**Root cause / investigation status:** auth.py:232-246 treats any re-presented rotated token as theft and revokes all of the user's tokens, with no grace window. The frontend has three independent refresh paths with separate guards: axios.js:23 `refreshing`, eduVideo.js:198 `eduRefreshing`, voiceQna.js:87 unguarded, and each browser tab has its own copy. Each calls api.post('/auth/refresh-token') with the same cookie. Confirmed by code; not run, because the audit is GET-only.

**Reproduction:** 1. Sign in, then let the 30-minute access cookie expire. 2. Open a page that calls both /api/v1 and /edu_video at once (student home, faculty dashboard), or two tabs that poll at the same moment. 3. Both interceptors POST /auth/refresh-token with the same token. 4. The first rotates it. The second finds is_revoked=true, revokes every token and returns 401.

**Expected:** Parallel refreshes from one client succeed; a user is signed out only on real replay.

**Actual:** A normal page load after idle can end the session on every device, with 'Session invalidated due to suspicious activity' and a false warning in the log. Also, clear_auth_cookies(response) at auth.py:241 is lost: the injected Response is discarded when HTTPException is raised, so those cookies are not cleared.

**Proposed fix:** Backend: allow a short grace window (for example 10-30 s) after rotation, recording rotated_at and replaced_by. Frontend: one shared single-flight refresh promise across all clients, plus a Web Lock or BroadcastChannel across tabs. Return a JSONResponse carrying the delete-cookie headers in the reuse branch.

**Regression test required:** Two concurrent refresh calls with one token both yield a usable session; a replay after the grace window still revokes the family. Frontend: simultaneous 401s on both clients produce a single refresh.

**Dependencies / blockers:** Schema change (rotated_at) if the grace-window design is chosen.

**Verification:** confirmed: auth.py:232-246 revokes every token on any re-presented rotated token, no grace window. Separate refresh paths: axios.js guard, eduVideo.js:198 guard, voiceQna.js:87 unguarded, and all call api.post('/auth/refresh-token'). Note: Code-confirmed only; a POST race cannot be run under GET-only. Also confirmed: revoke_all also kills the token just issued to the winning request.

### AUTH-004

**/auth/resend-activation has no tenant scope and can revive deactivated accounts**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Cross-tenant leakage |
| Affected module | app/api/v1/auth.py resend_activation, app/services/user_service.py issue_and_send_activation |
| Finding status | confirmed |
| Duplicates merged | AUTHZ-004 |

**Phase 2 remediation (Fixed):** Resend scoped to the tenant with one 404; deactivated accounts refused; activate refuses them too.

**Evidence:** test_college_admin_cannot_probe_another_college, test_deactivated_account_gets_no_activation_link.

**Description:** /auth/resend-activation has no tenant scope and can revive deactivated accounts.

**Root cause / investigation status:** auth.py:440-446 checks the caller is superadmin or college_admin, then looks the user up by email across all tenants, with no equivalent of users.py _get_user_in_scope. user_service.py:65 only refuses is_active users, so a deactivated account (is_active=False, is_verified=True) gets a working activation link, on this route and on /users/{id}/resend-invite (users.py:529). Not run, because the audit is GET-only.

**Reproduction:** 1. Sign in as a college admin of college A. 2. POST /api/v1/auth/resend-activation with any email. 3. Status reveals whether the email exists in any college: 404 unknown, 409 active, 200 pending or deactivated. 4. On 200 the target gets a fresh link; opening it runs /auth/activate, which sets is_active=True and replaces the password (auth.py:400-403).

**Expected:** College admins act only on users in their tenant, and deactivated accounts cannot be re-enabled by an activation link.

**Actual:** Any college admin can probe email addresses platform-wide, send mail to users of other colleges, and start reactivation of users deactivated by another college or by a superadmin. Reactivation via this path skips the /reactivate audit entry and notification.

**Proposed fix:** Apply _get_user_in_scope in resend_activation. In issue_and_send_activation, refuse is_verified users (use a separate error) so only never-activated accounts qualify. Return a uniform response to reduce enumeration.

**Regression test required:** College admin of A gets 404 for a user of B; resend for a deactivated, verified user is refused on both routes.

**Dependencies / blockers:** Coordinate with AUTHZ area findings on users.py.

**Verification:** confirmed: auth.py:429-452 checks caller role, then selects by email with no tenant filter. user_service.py issue_and_send_activation refuses only is_active users. auth.py:400-403 /activate sets is_active=True and replaces the password, with no check that the account was merely pending. Note: Not a takeover: the link goes to the target's own mailbox, so the caller never gets it. Real impact is cross-tenant email/status enumeration (404/409/200), killing a pending invite, unsolicited mail, and a deactivated user self-reviving if they use the link. POST not sent.

### AUTH-006

**Users of a deactivated college or university can still sign in and keep working**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Authentication |
| Affected module | app/api/v1/auth.py, app/api/deps.py, app/api/deps_sync.py, app/api/v1/colleges.py, app/api/v1/universities.py |
| Finding status | confirmed |
| Duplicates merged | AUTHZ-005 |

**Phase 2 remediation (Fixed):** institution_access.py used by login, refresh, activate, both deps and voice; deactivation revokes sessions.

**Evidence:** test_deactivated_* in tests/integration/test_sessions.py failed before, pass now.

**Description:** Users of a deactivated college or university can still sign in and keep working.

**Root cause / investigation status:** login (auth.py:141-170), refresh (auth.py:250), activate, deps.py:20 and deps_sync.py:50 check only User.is_active, never Tenant.is_active or University.is_active. deactivate_college (colleges.py:325-331) and deactivate_university do not cascade or revoke sessions. The code admits this as a KNOWN GAP at colleges.py:321-324, universities.py:172-178 and models/university.py:21-27.

**Reproduction:** 1. As superadmin deactivate a college. 2. Sign in as one of its users, or continue an existing session. Live run not possible: the local DB has 2 inactive tenants and 2 inactive universities, but 0 active users under an inactive tenant.

**Expected:** Deactivating an institution blocks sign-in and refresh, and ends existing sessions for its users.

**Actual:** Login, refresh and every API keep working, so the Super Admin control has no effect on access.

**Proposed fix:** Add a shared 'tenant and university active' check to login, refresh, activate and both get_current_user dependencies, exempting superadmin. Decide the wording shown to blocked users. Revoke refresh tokens on deactivation.

**Regression test required:** User of a deactivated college: login 401/403, refresh 401, existing cookie 401; reactivating restores access; same for a university parent.

**Dependencies / blockers:** Owner decision on message text; a per-request join or cached lookup has a small performance cost.

**Verification:** confirmed: deps.py:20, deps_sync.py:50, auth.py:143 and :250 test User.is_active only. Tenant.is_active is not read anywhere in those paths. KNOWN GAP comments at colleges.py:321, universities.py:172, models/university.py:21. Note: Not run live: local DB has 0 active users under an inactive tenant, and deactivating is a write.

### AUTH-009

**Superadmin seed uses a tracked password and a public disposable mailbox**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | High |
| Category | Security |
| Affected module | scripts/seed_superadmin.py, app/api/v1/setup.py |
| Finding status | suspected |
| Duplicates merged | INFRA-024 |

**Phase 2 remediation (Blocked):** Seed script reads SUPERADMIN_SEED_EMAIL/PASSWORD from the environment; literal removed from all tracked files.

**Evidence:** tests/test_seed_credentials.py failed before, passes now. Blocked: owner must rotate the password and check production; it remains in git history.

**Description:** Superadmin seed uses a tracked password and a public disposable mailbox.

**Root cause / investigation status:** Plain-text seed password is tracked at scripts/seed_superadmin.py:19 (variable SUPERADMIN_PASSWORD) and again in the comment at app/api/v1/setup.py:5. Seed email is on yopmail.com (scripts/seed_superadmin.py:18), whose inboxes are readable by anyone with no login. The local DB holds this account as an active, verified superadmin alongside one @quirri.ai superadmin. deploy.yml does not run the seed, so whether production has it is unverified, hence 'suspected'.

**Reproduction:** 1. Check whether the production users table has the seed email with role superadmin. 2. If yes, anyone can POST /auth/forgot-password for it, read the link in the public inbox, and set a new password.

**Expected:** No credential in source; privileged accounts use a mailbox the company controls.

**Actual:** If the seed was ever run on a shared or production database, superadmin takeover needs no credentials at all. That would be Critical. The other seed accounts in CLAUDE.md are also on yopmail.

**Proposed fix:** Read the seed email and password from environment variables or generate a one-time password; remove both tracked copies. Check production for any @yopmail.com accounts and replace them. Rotate the password wherever it was reused.

**Regression test required:** A repo secret scan in CI fails on credentials in tracked files; a startup or ops check flags privileged accounts on disposable domains in production.

**Dependencies / blockers:** Needs production DB access by the owner to confirm.

**Verification:** partially: Tracked plain-text password at app/api/v1/setup.py:5 confirmed; value not recorded. Local DB has 1 superadmin on yopmail. No reference to seed_superadmin in Dockerfile, compose, .github or shell scripts. Note: Facts confirmed, production exposure unknown. Critical if that account exists in production, because the password is in the repo. Owner must check the production users table.

### AUTHZ-006

**require_permission reads the raw column, so new admins are locked out of Users and Roles**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Role/permission |
| Affected module | RBAC |
| Finding status | confirmed |
| Duplicates merged | AUTH-013 |

**Phase 2 remediation (Fixed):** require_permission uses effective_permissions.

**Evidence:** test_new_admin_inherits_role_permissions failed before, passes now; explicit lists still restrict.

**Description:** require_permission reads the raw column, so new admins are locked out of Users and Roles.

**Root cause / investigation status:** app/api/deps.py:43 reads user.permissions directly. The default is [] (models/user.py:35). POST /users never sets it (users.py:366-386), PATCH role sets None (users.py:599, whose comment assumes fallback "on next login"). Fallback to role_master exists only in auth.py:87 for the login response. Only colleges.py:136 and the seed store a real list.

**Reproduction:** Code-confirmed; creating an account is a write. 1. As SA, POST /users role=college_admin or superadmin, or PATCH a faculty role to college_admin. 2. Activate. 3. GET /api/v1/users or /api/v1/roles returns 403 Missing permission, while /auth/me lists users.read. Data today: all 6 CA and 2 SA rows have a stored list, so nobody is hit yet.

**Expected:** An account gets its role's permissions however it was created; server and /auth/me agree.

**Actual:** Accounts created or promoted through the Users module cannot use the Users module, though the portal shows it. The opposite also holds: editing role_master (roles.py docstring calls this the runtime source of truth) does not change any CA or SA with a stored list.

**Proposed fix:** Resolve permissions in require_permission with the same _effective_permissions logic (async lookup, cached per request), or backfill at create and role change. Prefer one rule: role_master unless an explicit override exists.

**Regression test required:** CA created by POST /users, and a user promoted by PATCH role, reach GET /users; a role_master change takes effect without touching users rows.

**Dependencies / blockers:** None

**Verification:** confirmed: deps.py:43 reads user.permissions directly. Fallback exists only in auth.py:87. users.py:599 sets None, and POST /users does not set it. DB: all 6 CA and 2 SA rows have a list, 1 hod row is NULL. src/app/superadmin/users/page.jsx:44-69 offers Super Admin and College Admin in the create form, with College Admin as default. Note: Reachable from the UI, so High stands, though nobody is locked out today. Not run: creating a user is a write.

### BACKEND-004

**A failed video cannot be retried: the error says 'Press Regenerate', the API refuses**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Functional bug |
| Affected module | edu_video / regenerate |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** FAILED jobs with a plan can regenerate; change request stays until a render succeeds; Retry button added.

**Evidence:** tests/integration/test_video_retry.py.

**Description:** A failed video cannot be retried: the error says 'Press Regenerate', the API refuses.

**Root cause / investigation status:** app/edu_video/pipeline.py:178-180 and :204-205 tell the user to press/try Regenerate. routes.py:1386 rejects anything but status DONE and routes.py:1414 claims only from DONE, so a FAILED job (plan saved, narration or TTS outage) has no way back. No retry endpoint exists.

**Reproduction:** Code review (POST not sent). 1. Render fails, for example a narration outage: run_export sets FAILED. 2. POST /edu_video/jobs/{id}/regenerate gives 400 'Job can only be regenerated once rendering has finished'. Same dead end for a chapter already sent to reviewers: regenerate_job clears changes_requested_at before the render, so a failed regenerate also loses the open request.

**Expected:** A transient failure can be retried from the saved plan at no extra planning cost, as the message promises.

**Actual:** The only way out is a new upload, which pays for planning again and loses the review history, MCQ set and tutor lesson of that job.

**Proposed fix:** Allow FAILED jobs that have plan_json in regenerate (claim from (DONE, FAILED)); keep the previous output_path; keep the change request until the render succeeds.

**Regression test required:** Force a narration failure, regenerate the FAILED job, expect RENDERING then DONE with history kept.

**Dependencies / blockers:** None

**Verification:** confirmed: routes.py:1386 requires DONE and :1414 claims only from DONE. The only other claim (:1185) uses _EDITABLE_STATUSES = AWAITING_REVIEW, AWAITING_TEACHER_REVIEW (:1084), and no retry route exists. pipeline.py:180,205 tell the user to press Regenerate. Local DB has 2 FAILED jobs of 13. Note: Any retry should claim from FAILED only when plan_json exists.

### BUILD-001

**Production build fails: 18 Faculty and Student pages use useSearchParams outside Suspense**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Frontend defect |
| Affected module | Frontend build / RolePortalSidebar / Faculty + Student layouts |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Sidebars wrapped in Suspense in the Faculty and Student layouts.

**Evidence:** next build exits 0.

**Description:** Production build fails: 18 Faculty and Student pages use useSearchParams outside Suspense.

**Root cause / investigation status:** src/components/shared/RolePortalSidebar.jsx:58 calls useSearchParams; src/app/faculty/(portal)/layout.jsx and src/app/student/(portal)/layout.jsx render the sidebar outside their Suspense boundary, so next build aborts prerender.

**Reproduction:** 1. In the repo run a production build (NEXT_DIST_DIR=.next-preview next build). 2. Observe "useSearchParams() should be wrapped in a suspense boundary" on 18 pages and "Export encountered errors".

**Expected:** next build completes for all 58 pages.

**Actual:** Build fails on 10 Faculty and 8 Student pages, so the frontend cannot be deployed.

**Proposed fix:** Wrap the sidebar in <Suspense fallback={null}> in both portal layouts (proven: a temporary copy with exactly this change builds all 58 pages).

**Regression test required:** CI step running next build on every push; a test that no layout-level component reads search params outside Suspense.

**Dependencies / blockers:** Blocks TEST-005 (frontend deploy).

**Verification:** confirmed: reproduced twice; repo build fails, patched copy passes.

### INFRA-004

**Production deploy omits all e-mail settings, so invites and password resets are never sent**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | High |
| Category | Integration |
| Affected module | deploy.yml / notification_service |
| Finding status | confirmed |
| Duplicates merged | TEST-006 |

**Phase 2 remediation (Blocked):** Deploy passes e-mail settings from secrets; defaults to log mode.

**Evidence:** Parsed only. Blocked: owner must add the secrets and verify delivery on the server.

**Description:** Production deploy omits all e-mail settings, so invites and password resets are never sent.

**Root cause / investigation status:** The deploy overwrites .env each run and sets none of EMAIL_PROVIDER, EMAIL_FROM, SES_*, SMTP_*. app/config.py defaults EMAIL_PROVIDER to 'log'. notification_service.py:500 then records log_only and sends nothing.

**Reproduction:** 1. Compare the fields of app/config.py with the variables written by .github/workflows/deploy.yml. 2. EMAIL_* , SES_* and SMTP_* are all absent. 3. Follow deliver_email with provider 'log'.

**Expected:** Activation, reset and notification e-mails reach users in production.

**Actual:** Every e-mail becomes log_only. New users cannot activate through the invite link and forgotten passwords cannot be reset. Not observed on the live server, which was not accessible. Inferred from the workflow.

**Proposed fix:** Add EMAIL_PROVIDER, EMAIL_FROM, EMAIL_FROM_NAME, EMAIL_REPLY_TO and SES_* (or SMTP_*) to the workflow, and fail startup in production when the provider is 'log'.

**Regression test required:** Config test: with ENVIRONMENT=production, EMAIL_PROVIDER=log is rejected; deploy-env test that every required production variable is written.

**Dependencies / blockers:** Verified SES sender and domain.

**Verification:** partially: deploy.yml:57 rewrites .env with no EMAIL, SES or SMTP line; compose has none; gh secret list has none (only AWS_* exist). config.py:191 defaults to log; notification_service.py:84-93 treats that as log-only. Note: Config gap confirmed; production behaviour not observed. If the host has no other injection, invites and resets are not delivered. Check via production /health.

### INFRA-005

**Historic API key values remain in backend git history**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | High |
| Category | Security |
| Affected module | Backend repository history |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** None possible in code.

**Evidence:** Blocked: owner must rotate the keys in git history.

**Description:** Historic API key values remain in backend git history.

**Root cause / investigation status:** Commit ca59359 (2026-08-08) added an OPENAI_API_KEY value matching a real key pattern to .env.example; 602fc49 (2026-08-22) removed it. History of .env.example also contains non-placeholder-length values for SARVAM_API_KEY and LIVEKIT_API_SECRET (shape only, not pattern-confirmed). Values deliberately not reproduced.

**Reproduction:** 1. git log --all -G with key-shape patterns over the backend repo. 2. Inspect only the variable name in the matching diff.

**Expected:** No live credential exists in any commit.

**Actual:** Key material stays recoverable by anyone with repository access. The repo is private (gh repo view), so this is rated High rather than Critical. Whether the keys are still valid was not tested, since using them is out of scope.

**Proposed fix:** Rotate OPENAI_API_KEY, SARVAM_API_KEY and LIVEKIT_API_SECRET regardless, then consider a history rewrite and add a secret scanner to CI.

**Regression test required:** CI secret scan (for example gitleaks) over the full history.

**Dependencies / blockers:** Provider console access for rotation.

**Verification:** confirmed: git log -G on .env.example: ca59359 added a 164-char key-shaped value, 602fc49 removed it and added a 33-char sk- value, b314093 removed that one. HEAD and remote master have 0 matches. Note: Auditor missed the second value, which stayed until 9 Sep. Validity not tested; would be Critical if live. Rotate both regardless. Repo reported private by the auditor; not rechecked.

### TEST-005

**Frontend production deploy is stale since 28 Sep; last two deploys did not complete**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | High |
| Category | Configuration/deployment |
| Affected module | frontend CI / release |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** BUILD-001 unblocked the build.

**Evidence:** Blocked: deploying needs the owner to commit and push.

**Description:** Frontend production deploy is stale since 28 Sep; last two deploys did not complete.

**Root cause / investigation status:** gh run list: last success 28 Sep 2026; 6 Oct cancelled after 24h; 26 Oct (merge PR #15, run 40321282841) failed in 'Build and push image' with 'useSearchParams() should be wrapped in a suspense boundary' and export errors on many portal pages. Four later commits (8fe4bc6, 2560b07, 08597f5, 99ecaf7) are not on origin/main, while backend master deployed successfully on 2 Nov. Frontend and backend may be out of step in production. Local preview build today (.next-preview/BUILD_ID 2 Nov 11:34) succeeded, so current HEAD probably builds; not proven in the Docker build.

**Reproduction:** 1. gh run list -R Rytsense-Technologies/b2b_project-k_frontend -L 5. 2. git log origin/main..HEAD.

**Expected:** main deploys cleanly and matches the live API contract

**Actual:** Going by CI, the running image dates from 28 Sep unless deployed by hand

**Proposed fix:** Owner decision: merge the working branch to main, confirm the Docker build, verify the deployed image. Not done in this audit

**Regression test required:** CI build on every PR (TEST-003)

**Dependencies / blockers:** Owner must approve push/merge. Live server image not inspected

**Verification:** confirmed: Frontend last success 2026-09-28T11:18Z; 6 Oct cancelled; 26 Oct failed with the suspense error in the log. Remote main is 566e563 and 4 local commits are ahead. Local HEAD still fails, see build. Note: Two corrections. Local build does NOT work: .next-preview/BUILD_ID is written before export, and export-detail.json says success:false. Backend's last success was 31 Oct, not 2 Nov. Staleness is CI-derived; a manual deploy cannot be ruled out.


## Medium

### AUTH-002

**Logout never revokes the refresh token because the cookie is not sent to /auth/logout**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Authentication |
| Affected module | app/api/v1/auth.py logout, app/services/token_service.py |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Refresh cookie path widened to /api/v1/auth; old-path copy deleted on every set.

**Evidence:** test_signing_out_revokes_the_refresh_token and test_a_cookie_left_at_the_old_path_is_cleaned_up.

**Description:** Logout never revokes the refresh token because the cookie is not sent to /auth/logout.

**Root cause / investigation status:** token_service.py:68 scopes refresh_token to Path=/api/v1/auth/refresh-token. auth.py:278 reads that cookie inside POST /api/v1/auth/logout, where the browser does not send it, so `if token:` is false and the revoke at lines 279-285 is dead code.

**Reproduction:** 1. Load a refresh_token (Path=/api/v1/auth/refresh-token) and an access_token (Path=/) into a Chromium cookie jar. 2. Ask which cookies apply to each URL. Observed: /api/v1/auth/logout gets only access_token; /api/v1/auth/refresh-token gets both. DB state agrees: 128 live refresh rows, up to 32 for one user (QA sessions inflate this, so it is supporting evidence only).

**Expected:** Logout revokes the current refresh token server-side.

**Actual:** Only the browser cookies are cleared. The token row stays valid for up to 30 days, so a copied token still refreshes after the user signs out. The frontend also trusts this: useAuth.logout and the sidebars do nothing further.

**Proposed fix:** Widen the cookie path to /api/v1/auth, or add a separate revoke path. Check cookie scope in a real browser test afterwards, since a path change also affects clear_auth_cookies (token_service.py:76).

**Regression test required:** Browser-level test: login, logout, then replay the old refresh token at /auth/refresh-token and expect 401.

**Dependencies / blockers:** None

### AUTH-005

**/auth/activate ignores deactivation, and deactivating a user leaves their tokens live**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Authentication |
| Affected module | app/api/v1/auth.py activate_account, app/api/v1/users.py deactivate_user |
| Finding status | confirmed |
| Duplicates merged | AUTHZ-011 |

**Phase 2 remediation (Fixed):** deactivate_user invalidates every live auth token (activation, reset, OTP); stale links return 400. app/api/v1/users.py

**Test:** tests/integration/test_auth_hardening.py::test_deactivated_invite_cannot_be_activated, ::test_deactivating_ends_a_reset_link

**Evidence:** failed before: run against unfixed code; passes now

**Description:** /auth/activate ignores deactivation, and deactivating a user leaves their tokens live.

**Root cause / investigation status:** activate_account (auth.py:395-402) sets is_active=True on any user with a valid token and never checks deactivation or tenant status. deactivate_user (users.py:623-625) revokes refresh tokens but does not call invalidate_active_tokens. derive_status (user_service.py:48-52) shows a deactivated invitee as pending_activation, because both are is_active=False, is_verified=False. Reachable only through a live link; no such row exists in the local DB now (0 deactivated verified users with a live activation token).

**Reproduction:** 1. Invite a user. 2. Admin clicks Deactivate before they accept. 3. The user opens the invite within 72 h and sets a password. 4. The account is active and signed in, with no admin action.

**Expected:** Deactivation invalidates outstanding activation and reset tokens, and activation refuses a deactivated account.

**Actual:** The invitee becomes active, consuming a seat, and receives a session.

**Proposed fix:** Call invalidate_active_tokens for ACTIVATION and PASSWORD_RESET in deactivate_user. Add a check to activate_account, and a distinct marker for an admin-deactivated invite if the two states must differ.

**Regression test required:** Deactivate a pending user, then activation with the old token returns 400.

**Dependencies / blockers:** Related to AUTH-004 and AUTH-006.

### AUTH-007

**JWT_SECRET_KEY has a public default and no production startup check**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | app/config.py |
| Finding status | confirmed |
| Duplicates merged | INFRA-006, TEST-016 |

**Phase 2 remediation (Fixed):** Validator refuses default, blank, short (<32) or AUTH_SECRET_KEY-equal JWT_SECRET_KEY outside local environments. app/config.py. Production key rotation is the owner's to check.

**Test:** tests/integration/test_auth_hardening.py::test_bad_jwt_secret_stops_startup

**Evidence:** failed before: run against unfixed code; passes now

**Description:** JWT_SECRET_KEY has a public default and no production startup check.

**Root cause / investigation status:** config.py:176 gives JWT_SECRET_KEY a known default, also listed in the tracked .env.example:86. config.py:429-451 fails startup for the same mistake on AUTH_SECRET_KEY, but no such validator exists for JWT_SECRET_KEY, the key that signs every session. Blank values are not rejected either: deploy.yml:104 writes the value from a GitHub secret, so a missing secret yields an empty key.

**Reproduction:** 1. Read config.py and note the two validators cover LIVEKIT_API_SECRET and AUTH_SECRET_KEY only. 2. deploy.yml:102-103 records that production previously ran on the dev fallback secret. 3. Locally, a boolean check shows the running key equals the default (ENVIRONMENT=development, so acceptable there).

**Expected:** API refuses to start in production with a default, blank or short JWT secret.

**Actual:** Startup succeeds. With the default key anyone can forge a superadmin token, since deps.py trusts `sub` alone.

**Proposed fix:** Add the same validator for JWT_SECRET_KEY, and reject JWT_SECRET_KEY == AUTH_SECRET_KEY. Rotate the production key if it has not changed since the incident noted in deploy.yml.

**Regression test required:** Settings(ENVIRONMENT='production', JWT_SECRET_KEY=<default or blank>) raises ValueError.

**Dependencies / blockers:** Rotation signs all users out once.

**Verification:** partially: config.py:176 has a literal default and validators cover only LIVEKIT_API_SECRET and AUTH_SECRET_KEY. But gh secret list shows JWT_SECRET_KEY is set on the backend repo, deploy.yml:104 writes it, and deploy.yml:109 hard-codes ENVIRONMENT=production. Note: Downgraded from High. The gap is real, but the deployed path supplies a secret; the forged-token scenario needs that secret removed. The deploy.yml comment does show production once ran on the fallback, so the validator is still worth adding. Secret value could not be inspected, by rule.

### AUTH-008

**Unauthenticated superadmin bootstrap is open in every environment not named exactly 'production'**

| Field | Value |
|---|---|
| Status | Accepted |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | app/api/v1/setup.py, app/main.py, app/config.py |
| Finding status | confirmed |
| Duplicates merged | BACKEND-003, AUTHZ-019 |

**Phase 2 remediation (Fixed):** settings.is_local allow-list (development, dev, local, test); anything else behaves as production for cookies and secret checks. /setup/superadmin is not registered unless ENABLE_BOOTSTRAP=true on a local environment, and refuses once a superadmin exists. app/config.py, app/api/v1/setup.py, app/services/token_service.py. main.py not edited: its include_router and comment stay, harmlessly mounting an empty router. The test checks OpenAPI paths and a live POST (404).

**Owner decision (3 Nov 2026):** accepted as is per [OWNER_DECISIONS.md](OWNER_DECISIONS.md).

**Test:** tests/integration/test_auth_hardening.py::test_bootstrap_route_is_absent_by_default, ::test_secure_cookies_unless_explicitly_local

**Evidence:** failed before: run against unfixed code; passes now

**Decision needed:** ENVIRONMENT still defaults to 'development' when unset, so an unset host gets non-Secure cookies. Should the default become production? That would break any local .env without ENVIRONMENT (I may not read .env to check).

**Description:** Unauthenticated superadmin bootstrap is open in every environment not named exactly 'production'.

**Root cause / investigation status:** setup.py:42-47 blocks only when ENVIRONMENT == 'production'; config.py:182 defaults to 'development'. So a missing, misspelled or staging value leaves POST /api/v1/setup/superadmin open with no authentication (setup.py:50-54). The router is always mounted (main.py:135). The same fail-open test drives cookie Secure (token_service.py:51) and the AUTH_SECRET_KEY check. setup.py:16-17 says the file must be deleted before shipping; it is still mounted.

**Reproduction:** 1. GET /api/openapi.json lists /api/v1/setup/superadmin. 2. GET /api/v1/setup/superadmin returns 405, so the route is mounted. 3. The POST was not sent (GET-only audit); by code it creates role=superadmin, permissions=['*'] for anyone. Production reachability not verified; deploy.yml:109 sets ENVIRONMENT=production for the workflow-deployed stack.

**Expected:** Route absent from any deployed build, and safe by default if ENVIRONMENT is unset.

**Actual:** Any non-production-labelled host reachable from a network, such as the test server hard-coded in src/lib/apiConfig.js, would hand superadmin to any anonymous caller if it does not set ENVIRONMENT=production.

**Proposed fix:** Remove the router, leaving scripts/seed_superadmin.py as the only path; or mount it only on an explicit ENABLE_BOOTSTRAP=true and only while no superadmin exists. Change the production tests to an allow-list so unknown values behave as production.

**Regression test required:** Default settings do not mount /setup/*; Secure cookies are on unless ENVIRONMENT is explicitly local.

**Dependencies / blockers:** None

**Verification:** partially: setup.py _ensure_dev_only blocks only ENVIRONMENT=='production'; config.py:182 defaults to development; main.py:135 always mounts it. GET /api/v1/setup/superadmin returns 405 locally, so it is mounted. deploy.yml:109 hard-codes ENVIRONMENT=production for the deployed stack. The only other guard is duplicate email. Note: Downgraded from High: theoretical for the workflow-deployed stack. Would be Critical for any network-reachable host running without that value. Hard-coded host 13.234.197.68 in next.config was not probed; it is outside the local brief. The tracked password in setup.py:5 belongs to AUTH-009.

### AUTH-010

**30-day voice bearer token stays in localStorage after logout and can expose the previous student's history**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Authentication |
| Affected module | src/lib/api/voiceQna.js, src/hooks/useAuth.js, src/components/shared/RolePortalSidebar.jsx, app/voice_qna/security.py |
| Finding status | confirmed |
| Duplicates merged | FE-005, INFRA-032, AUTHZ-020 |

**Phase 2 remediation (Fixed):** Confirmed first: every /voice_qna route accepts the login cookie (security.py get_current_user_id on list/get/delete/patch, _resolve_identity on conversation/chat, cookie tried first). src/lib/api/voiceQna.js: bearer path, token read/store and sessionRequest removed; all calls use the cookie and refresh once on 401; user_token from the start call is ignored. src/lib/tokens.js removes the old localStorage key in clearTokens and setSessionCookie (sign-in and activate), so every logout path clears it. Removed the now duplicate clears in signOut.js and sessionExpiry.js and the missing_token check in VoiceQnaPanel.jsx.

**Test:** src/lib/api/voiceQna.test.js (6 tests), src/lib/auth/signOut.test.js::removes browser copies of the session

**Evidence:** failed before: all 6 new tests failed; passes now: full vitest 283/283

**Blocked on:** Not blocking: the backend can now drop user_token from StartConversationResponse. It is a required field today and the frontend ignores it.

**Description:** 30-day voice bearer token stays in localStorage after logout and can expose the previous student's history.

**Root cause / investigation status:** voiceQna.js:177 stores user_token in localStorage (script-readable, TTL AUTH_TOKEN_TTL_DAYS=30 by default). No logout path clears it: useAuth.js:22-31, RolePortalSidebar.jsx:100-112 and the three *Logout helpers call clearTokens, which omits it (tokens.js:19-24); only handleSessionExpired removes it (sessionExpiry.js:18). voiceQna.js:151-160 then retries history calls with that bearer on a cookie 401 or 403, with refresh disabled. The token is also not revoked by password change, because it is stateless (security.py:36-45). Not run in a browser, because producing the token needs POST /voice_qna/conversation.

**Reproduction:** 1. Student A starts a voice session on a shared lab browser, then logs out. 2. Student B signs in on that browser. 3. After B's 30-minute access cookie has expired, B opens tutor history. 4. The cookie call returns 401, and the bearer fallback runs as student A.

**Expected:** Logout removes every client credential; a request never runs as a different user than the session.

**Actual:** Student B can see, or delete via remove(), student A's voice conversations, and the token stays usable for up to 30 days. Any XSS can also read it.

**Proposed fix:** Remove the bearer fallback now that the backend accepts the cookie (security.py:87-99), stop storing user_token, and delete the old localStorage key at sign-in and logout. Put all logout paths through one shared function.

**Regression test required:** After logout, localStorage has no voiceQnaToken; history with an expired cookie refreshes or redirects and never sends a bearer.

**Dependencies / blockers:** Confirm no older client still needs user_token.

### AUTH-011

**Per-IP login limit of 5/minute will block whole campuses behind one address**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | app/api/v1/auth.py, app/voice_qna/rate_limiter.py |
| Finding status | confirmed |
| Duplicates merged | INFRA-017 |

**Phase 2 remediation (Fixed):** app/api/v1/auth.py: login 5/min per account, forgot-password and send-otp 3/min per account, verify-otp 10/min per account; all plus a 300/min per-address ceiling. reset-password and activate take a random token, so they have the ceiling only. Infra still to confirm: uvicorn --forwarded-allow-ips must trust the proxy. Under Docker, nginx is not 127.0.0.1, so all clients share one address; the 300/min ceiling then applies to everyone together.

**Test:** tests/integration/test_audit_and_identity.py::test_a_class_on_one_address_can_sign_in, test_one_account_is_still_limited, test_a_class_can_ask_for_mail_from_one_address, test_activation_links_are_not_shared_across_a_campus

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** Per-IP login limit of 5/minute will block whole campuses behind one address.

**Root cause / investigation status:** auth.py:138 applies 5/minute keyed by get_remote_address (rate_limiter.py:20-23). Colleges typically share one public IP. rate_limiter.py:62 already states this problem for quiz submission and adds per-user keys there, but login was not changed. forgot-password and send-otp (3/minute) and activate (5/minute) have the same issue. If the edge proxy does not pass the client IP correctly, every user shares a single bucket; nginx config is not in the repo, so that part is unverified. Limit behaviour was read from code, not run.

**Reproduction:** 1. Have a class of 30 sign in from one campus network at lecture start. 2. The sixth request within a minute gets 429.

**Expected:** Brute force is limited per account and per IP at a level that lets a class sign in.

**Actual:** Legitimate users get 429 during the normal busiest moment, and one attacker on campus Wi-Fi can block sign-in for the whole college.

**Proposed fix:** Key the strict limit on normalized email (or email + IP) and keep a much higher per-IP ceiling. Confirm nginx forwards the real client IP and that uvicorn trusts only the proxy.

**Regression test required:** Many distinct emails from one IP are accepted up to the IP ceiling; repeated attempts on one email are limited.

**Dependencies / blockers:** Nginx configuration check.

### AUTH-012

**Login leaks which accounts exist and allows anyone to keep any account locked**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Authentication |
| Affected module | app/api/v1/auth.py login |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Same 401 and same bcrypt cost for unknown, inactive, locked and wrong password. Lockout is per account+source (5 failures) with an account-wide ceiling of 50, table login_throttles (migration 0047), app/services/login_throttle.py. Behind a proxy without forwarded client IPs every caller is one source, so the per-source lock then acts as today's account lock.

**Test:** tests/integration/test_auth_hardening.py::test_failures_look_the_same_for_every_account_state, ::test_refusals_pay_the_bcrypt_cost, ::test_lockout_from_one_source_leaves_others_free

**Evidence:** failed before: run against unfixed code; passes now

**Blocked on:** Frontend: the login page's server-429 lock notice no longer fires for lockouts (only the rate limit still sends 429).

**Description:** Login leaks which accounts exist and allows anyone to keep any account locked.

**Root cause / investigation status:** auth.py:143-144 returns at once for unknown or inactive users with no password hash, while real users pay a bcrypt verify at cost 12, a measurable timing difference. auth.py:147-148 returns a distinct 429 'Account temporarily locked' only for real active accounts. auth.py:153-155 locks for 15 minutes after 5 failures with no regard to the source, and 5 failures a minute is exactly what the rate limit allows. Timing was not measured, because that needs POST requests.

**Reproduction:** 1. Send 5 wrong passwords for a target email. 2. The sixth attempt returns 429 if the account exists, 401 otherwise. 3. Repeat every 15 minutes to keep the account locked.

**Expected:** Identical response and timing for all failures; an attacker cannot deny access to a known user at will.

**Actual:** Email existence can be tested without credentials, and a known superadmin or college admin email can be held locked out from one IP.

**Proposed fix:** Verify against a dummy hash on the unknown-user path; return the same 401 for lockout; use short progressive delays or combine with an IP signal rather than a hard account lock.

**Regression test required:** Same status and body for unknown, inactive and locked accounts; attempts from a different source are not blocked by another source's failures, per the chosen design.

**Dependencies / blockers:** Pairs with AUTH-011.

### AUTHZ-002

**Next.js pending-changes routes have no auth and hold all tenants in one file**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Cross-tenant leakage |
| Affected module | Frontend route handlers /api/edu-video/* |
| Finding status | confirmed |
| Duplicates merged | FE-001, INFRA-003 |

**Phase 2 remediation (Fixed):** Deleted the Next /api/edu-video routes and their file store; the client uses the real API.

**Evidence:** Routes absent from the production build; vitest refresh guard passes.

**Description:** Next.js pending-changes routes have no auth and hold all tenants in one file.

**Root cause / investigation status:** src/app/api/edu-video/pending-changes/route.js (GET, DELETE) and request-changes/route.js (POST) never check a session. src/middleware.js matcher excludes every path starting with api, so nothing guards them. Data goes to .data/edu-video-pending-changes.json with no tenant field. src/lib/api/admin/eduVideo.js:486-497 falls back to this route when FastAPI answers 404, 405 or 501, and 404 is also what FastAPI returns for an out-of-scope job.

**Reproduction:** 1. curl -i http://127.0.0.1:3100/api/edu-video/pending-changes with no cookie. Result: 200 application/json, total 0. 2. POST and DELETE were not sent (GET-only); route.js shows no check before writing.

**Expected:** No unauthenticated access; no store that spans tenants.

**Actual:** Anyone can read every entry (edited lesson plan, note, chapter title, department), add entries of any size, or delete them. Currently harmless only because the store is empty. listPendingChanges and clearPendingChange have no callers outside eduVideo.js, so this is reachable dead code.

**Proposed fix:** Delete both route handlers, src/lib/eduVideoPendingStore.js, the fallback in the request-changes client and the unused client methods. FastAPI has shipped POST /edu_video/jobs/{id}/request-changes. A 404 from it must show an error.

**Regression test required:** Anonymous GET/POST/DELETE on /api/edu-video/* return 401 or 404; a 404 from request-changes writes nothing to a local store.

**Dependencies / blockers:** Severity becomes Critical the moment an entry exists in .data, because that would be unauthenticated cross-tenant content.

**Verification:** confirmed: Anonymous GET http://127.0.0.1:3100/api/edu-video/pending-changes returned 200 JSON, 22 bytes, empty. route.js has no session check and the middleware matcher excludes api. .data store is 17 bytes, last touched 6 Oct. Grep: listPendingChanges and clearPendingChange are only defined in eduVideo.js:523,559, and the store is imported only by the two routes. Note: Downgraded from High. No reader uses the store, so forged or deleted entries change nothing in the product, and it holds no data. Remaining exposure is anonymous unbounded disk writes, plus any plan the 404 fallback (eduVideo.js:494) stores becoming publicly readable. Fix is to delete the bridge. Port 3100 is published by the frontend deploy.

### AUTHZ-008

**Upload and chapter link skip the staff write rules**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Authorization |
| Affected module | edu_video upload, PATCH chapter |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/edu_video/routes.py: upload forces department_id to the HOD/Faculty's own (foreign id 404) and applies StaffScope.can_change to the target subject (read-only Faculty 403, other subject 403, content with no subject needs HOD). PATCH /jobs/{id}/chapter applies the same check to the target and to unlink. _ensure_staff_can_change_subject added.

**Test:** tests/integration/test_chapter_workflow.py::test_hod_cannot_upload_into_another_department, ::test_read_only_faculty_cannot_upload, ::test_faculty_uploads_only_to_their_own_subject, ::test_faculty_cannot_move_a_chapter_off_their_subjects

**Evidence:** failed before: code path had no check (register repro); passes now

**Decision needed:** HOD and Faculty can still upload inside their own scope, though the UI only mounts the studio under /admin and /superadmin. Should they be removed from the upload role set altogether?

**Description:** Upload and chapter link skip the staff write rules.

**Root cause / investigation status:** app/edu_video/routes.py upload (408-460) has no ensure_staff or can_change check. For a hod/faculty caller with no chapter_id, _validate_department (459, 306-313) checks only the tenant, so department_id can be another department. _resolve_chapter (284-296) checks department but not subject. set_job_chapter (1233-1242) checks write on the current subject only; the target is any chapter of the department.

**Reproduction:** Code-confirmed, POST/PATCH not sent. A) HOD of department X posts /edu_video/upload with department_id of department Y. B) Faculty with no subjects (read-only) uploads. C) Faculty with subjects uploads to a chapter of another subject. D) Faculty moves their chapter onto a subject they do not teach, or unlinks it.

**Expected:** Read-only Faculty get 403, staff stay inside department and subjects (staff-scope.md). Docs name the College Admin as uploader, and the UI mounts the upload studio only under /admin and /superadmin.

**Actual:** Staff can create content in other departments, start a paid generation pipeline and voice ingestion, and move content out of a subject's review path. This restriction exists only in the frontend.

**Proposed fix:** Decide whether HOD/Faculty upload at all; if not, drop them from the upload role set. If yes, force department_id to the caller's and apply can_change to chapter and target chapter.

**Regression test required:** HOD with foreign department_id gets 404; read-only Faculty 403; Faculty on unassigned subject 403; relinking to an unassigned subject 403.

**Dependencies / blockers:** Owner decision on whether HOD/Faculty may upload.

### AUTHZ-010

**College Admin can demote, deactivate or cancel a peer College Admin, or demote themselves**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Role/permission |
| Affected module | Users |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** No change.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** not applicable

**Evidence:** code confirmed, no change

**Decision needed:** May a College Admin demote, deactivate or cancel another College Admin, or demote themselves? Options: Super Admin only, or allowed unless they are the college's last active College Admin.

**Description:** College Admin can demote, deactivate or cancel a peer College Admin, or demote themselves.

**Root cause / investigation status:** app/api/v1/users.py:578-590: role guard limits the new role only, not the target's current role. The self-protection covers superadmin only. deactivate (619-621) and revoke-invite (552-554) block self but not a peer CA. _get_user_in_scope returns any same-tenant user.

**Reproduction:** Code-confirmed, writes not sent. Tenant ed7971c1 has two CA accounts. CA 1 sends PATCH /users/{ca2}/role role=student, or POST /users/{ca2}/deactivate.

**Expected:** Docs say a CA cannot create peers. Removing one should be equally restricted to Super Admin, or a CA should not be able to lock a college out of administration.

**Actual:** One CA can remove the other from the college, and a CA can demote the last admin, leaving no College Admin. The demoted target gets role change immediately because role is read from the DB.

**Proposed fix:** Block CA actions on college_admin targets (role change, deactivate, revoke, PATCH) and block self role change for CA, or require SA.

**Regression test required:** CA gets 403 changing or deactivating another CA, and changing their own role.

**Dependencies / blockers:** Owner decision on peer-admin rules.

### AUTHZ-012

**Tenant filters fail open for a non-superadmin account with no tenant_id**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Cross-tenant leakage |
| Affected module | Scoping helpers across routers |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** get_current_user (async and sync) answers 403 for a non-superadmin with no tenant, so no scope filter can fall open. POST /users, PATCH /users and PATCH /users/{id}/role refuse a missing college with 422. app/api/deps.py, deps_sync.py, users.py

**Test:** tests/integration/test_api_rules.py::test_college_role_without_a_college_is_refused_everywhere, ::test_college_roles_need_a_college_on_create_and_patch

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Tenant filters fail open for a non-superadmin account with no tenant_id.

**Root cause / investigation status:** Scope is expressed as "tenant_id or no filter". routes.py:141-148 and 705 give None to job_tracker.list_jobs, which then skips the filter (job_tracker.py:361). reports.py:478-479 sets college=None and _build_rows returns all colleges. departments.py:115 skips the filter. academics.py:249-266 likewise. users.py:309-310 and AdminUserCreateRequest let SA create any role with tenant_id null, PATCH can null it (users.py:425), and no role check requires one. require_tenant in deps.py:50 exists and no router uses it.

**Reproduction:** Code-confirmed. SELECT: tenant-null accounts today are the 2 superadmins, so this cannot be reproduced without creating one. A CA made with no tenant_id would get every college from /edu_video/jobs, /departments and /reports (reports and jobs use require_role, so AUTHZ-006 does not block them).

**Expected:** A non-SA with no tenant sees nothing, per the comment at job_tracker.py:351-354, which leaves this to routes.py.

**Actual:** Such an account reads all tenants' jobs, departments and student reports. Latent, one SA form submission away.

**Proposed fix:** Reject tenant_id null for non-superadmin roles in create and PATCH. Add a deny-by-default dependency for all college-scoped routers. Pass an explicit sentinel, not None, for "all tenants".

**Regression test required:** CA with null tenant_id gets 403 on every college-scoped list; POST /users with role=college_admin and no tenant returns 422.

**Dependencies / blockers:** None

### AUTHZ-013

**Report exports allow spreadsheet formula injection**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Security |
| Affected module | Reports, Audit export |
| Finding status | confirmed |
| Duplicates merged | BACKEND-027, INFRA-034 |

**Phase 2 remediation (Fixed):** safe_cell prefixes formula-start characters in report CSV and audit CSV; xlsx workbook has strings_to_formulas and strings_to_urls off. app/utils/export.py, reports.py, audit_logs.py

**Test:** tests/integration/test_api_rules.py::test_csv_cells_are_inert, ::test_xlsx_cells_are_text, ::test_audit_csv_cells_are_inert

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Report exports allow spreadsheet formula injection.

**Root cause / investigation status:** reports.py:545-570 _cell and _csv write names as is. reports.py:596 uses xlsxwriter ws.write, which turns a string starting with = into a real formula by default. Student names are self-set through PATCH /auth/me (auth.py:542-544, schemas limit length only). audit_logs.py:48-55 has the same CSV issue.

**Reproduction:** Code-confirmed; not run because it needs a profile write. A student sets first_name to a value starting with =; CA or HOD exports the student report as xlsx or csv and opens it.

**Expected:** Exported cells are inert text.

**Actual:** A student's text runs as a formula in staff Excel; this can pull other students' rows out through external references once the user accepts the prompt.

**Proposed fix:** Prefix cells starting with = + - @ tab or CR with an apostrophe in CSV. Use write_string or strings_to_formulas=False in xlsx. Validate names on input too.

**Regression test required:** Export of a name starting with = yields a text cell in both formats.

**Dependencies / blockers:** None

### AUTHZ-014

**Audit log misses most authorization-relevant actions**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Security |
| Affected module | Audit |
| Finding status | confirmed |
| Duplicates merged | BACKEND-009, DATA-008 |

**Phase 2 remediation (Fixed):** record_audit_sync added in app/services/audit_service.py. Audit rows now on chapter upload, delete, publish (app/edu_video/routes.py) and quiz generate, approve, question edit/remove/add, attempt reset (app/mcq/api/routes.py). Module names 'Content' and 'Assessments'. Written in the same transaction as the change. Quiz generate has no automated test because its success path needs the LLM.

**Test:** tests/integration/test_audit_and_identity.py::test_upload_is_audited, test_publish_and_delete_are_audited, test_quiz_changes_are_audited, test_attempt_reset_is_audited

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** Audit log misses most authorization-relevant actions.

**Root cause / investigation status:** grep: record_audit is called only from academics, audit_logs, auth, colleges, departments, notifications, universities, users. In users.py, update_user (405-512) including tenant reassignment, department move (which wipes student records), bulk_promote_year (665) and resend_invite (515) have none. Nothing in app/edu_video/routes.py or app/mcq/api/routes.py calls it, so upload, delete, publish, MCQ generate, approve, question edits are outside the audit log (review_log and McqAttemptReset hold partial history). auth.py records sign-in only, not password change, reset or activation. roles.py has none, so permission changes are not recorded.

**Reproduction:** Read the listed handlers. No live step, since it would need writes.

**Expected:** Who changed access or published content can be answered from the audit log.

**Actual:** Role permission edits, tenant moves, chapter publish and delete leave no audit row.

**Proposed fix:** Add record_audit to those handlers, roles.py first.

**Regression test required:** Each listed action writes one audit row with actor, target and IP.

**Dependencies / blockers:** None

### AUTHZ-023

**No route-wide authorization test exists**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Test coverage |
| Affected module | tests/ |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New parametrised test over app.routes: anonymous must get 401/403 unless on an explicit public list; student matrix over staff prefixes; cross-college read. Route list comes from the OpenAPI document, because app.routes holds nested routers on FastAPI 0.141; routes with include_in_schema=False are not covered.

**Test:** tests/integration/test_platform_rules.py::test_anonymous_callers_are_refused, ::test_students_cannot_reach_staff_routes, ::test_college_admin_cannot_read_another_college

**Evidence:** test is the deliverable; it fails for any new unlisted open route

**Description:** No route-wide authorization test exists.

**Root cause / investigation status:** tests/ has per-module checks (test_publish_and_access_rules.py, test_teaching_portal_routers.py, test_unique_id_routes.py), but nothing enumerates app.routes against role and tenant. Findings 001, 002, 003, 004 and 007 are all of the kind such a test finds.

**Reproduction:** List tests/; grep for pending-changes and resend-activation returns nothing.

**Expected:** Any new route must declare who can reach it.

**Actual:** New routes can ship with no scope check and no failing test.

**Proposed fix:** Add a parametrised test over FastAPI app.routes: anonymous must be 401 except an explicit allowlist, plus a role matrix fixture for two tenants. The attached matrix.json is a usable starting point.

**Regression test required:** The test itself; it fails when a route is added without an entry.

**Dependencies / blockers:** None

### BACKEND-005

**Students can reach unpublished, deleted and other-programme chapters through the voice tutor**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Authorization |
| Affected module | voice_qna |
| Finding status | confirmed |
| Duplicates merged | AUTHZ-009, DATA-011 |

**Phase 2 remediation (Fixed):** app/voice_qna/api/simple.py _authorize_lesson_access now applies the video rule: published, not deleted, student's programme, nothing above the chapter archived. Rule shared in new app/edu_video/visibility.py. A lesson with no job is refused for students.

**Test:** tests/integration/test_tutor_access.py::test_draft_and_deleted_chapters_answer_404, ::test_other_programme_chapter_answers_404, ::test_archived_level_answers_404, ::test_published_chapter_is_answered

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Students can reach unpublished, deleted and other-programme chapters through the voice tutor.

**Root cause / investigation status:** app/voice_qna/api/simple.py:94-129 _authorize_lesson_access checks department and tenant only. It never looks at the job's published_at, deleted_at or programme, unlike edu_video/routes.py:176-193 _ensure_student_can_view. POST /conversation and POST /chat (simple.py:287,302,473,487) use only this check. The lesson is ingested at upload, before review.

**Reproduction:** Code review (POST not sent). As a student call POST /voice_qna/chat?job_id=<draft job in own department> with {text}. Live data: 6 ready lessons belong to unpublished jobs, 1 to a soft-deleted job.

**Expected:** The tutor follows the same rule as the video: published, not deleted, same programme.

**Actual:** A student with a job or lesson id gets answers from draft, withdrawn or other-programme material. Previously visible job ids stay usable after a chapter is withdrawn.

**Proposed fix:** Resolve lesson.edu_video_job_id and apply the student-can-view rule in _authorize_lesson_access; return 404.

**Regression test required:** Student chat and conversation against draft, deleted and other-programme jobs return 404; published job works.

**Dependencies / blockers:** Shared with the authz auditors.

**Verification:** confirmed: simple.py:94-129 checks department and tenant only; :287,302,473,487 use it with _ensure_lesson_ready, which checks ingestion only. get_by_job_id has no publish filter. DB: 7 of 13 ready lessons belong to unpublished jobs, 1 to a deleted job. Note: Downgraded from High. A student needs a job or lesson id, which is not guessable; ids of withdrawn chapters are the realistic path. Scope is course material in the student's own department. Whether any student API leaks draft ids was not exhaustively checked. POST not sent.

### BACKEND-006

**Regenerating or editing a quiz leaves old attempts in place, so 'one attempt per set' is really one per chapter**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | mcq |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Nothing changed. mcq_attempts has no set_version and adding one needs a migration (agent api) once the rule is chosen.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** none until the rule is chosen

**Evidence:** not applicable

**Decision needed:** After staff regenerate or edit an approved quiz, should students who already attempted it: (a) keep their score and stay locked, with staff warned how many attempts exist, (b) get a new attempt on the new set, the old score kept as history, or (c) should regeneration be refused once attempts exist?

**Blocked on:** Whichever rule: migration adding mcq_attempts.set_version (agent api), and leaderboard/report queries that pick the attempt.

**Description:** Regenerating or editing a quiz leaves old attempts in place, so 'one attempt per set' is really one per chapter.

**Root cause / investigation status:** McqAttempt is unique on (document_id, user_id) (models/mcq_attempt.py) and the document id survives regeneration (generation_service.py, finish_generation in mcq_document_repository.py). Nothing resets or versions attempts. routes.py:253-262 answers already_attempted before looking at the approval. docs/knowledge/flows/mcq-approval.md says 'one attempt per student per set'.

**Reproduction:** Live: SELECT shows 1 of 1 mcq_attempts whose first question_id no longer exists in mcq_questions. 1. Student submits. 2. Staff regenerate and approve. 3. The student stays already_attempted on questions they never saw.

**Expected:** Either a new set opens a new attempt, or staff are warned that existing scores stand; result rows record the set_version.

**Actual:** The student keeps an old score for a different set; reports mix sets. No warning at regenerate or edit time.

**Proposed fix:** Store set_version on each attempt; choose a rule (new attempt per approved set, or block regeneration once attempts exist) and show the attempt count in the regenerate confirmation.

**Regression test required:** Submit, regenerate, approve: assert the chosen behaviour, including leaderboard and report numbers.

**Dependencies / blockers:** Needs an owner decision.

### BACKEND-007

**Student seat cap can be exceeded by role change, college move, cap edits and concurrent requests**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Backend defect |
| Affected module | colleges / users |
| Finding status | confirmed |
| Duplicates merged | DATA-005, DATA-006 |

**Phase 2 remediation (Fixed):** One locked check (SELECT FOR UPDATE on the tenant) behind create, import, role change and college move; cap cannot be null or below current use (409/422). Counting rule unchanged. college_service.py, users.py, colleges.py, schemas/college.py

**Test:** tests/integration/test_api_rules.py::test_role_change_respects_the_seat_cap, ::test_college_move_respects_the_seat_cap, ::test_cap_cannot_be_removed_or_set_below_use, ::test_parallel_creates_cannot_pass_the_cap

**Evidence:** failed before: run against unfixed code; passes now

**Decision needed:** DATA-006, merged here: should pending and deactivated students hold a seat? Today every student row counts.

**Description:** Student seat cap can be exceeded by role change, college move, cap edits and concurrent requests.

**Root cause / investigation status:** Seat check exists only in create_user (users.py:337-345) and bulk_import (users.py:768-775). update_user_role (users.py:569-608) and update_user with tenant_id (users.py:422-431) never check it. CollegeUpdateRequest allows student_seat_cap=null (no cap) and a value below the current count (schemas/college.py; colleges.py:298-300). The check is count-then-insert with no lock (college_service.py:102-109).

**Reproduction:** Code review (PATCH not sent). 1. PATCH /users/{faculty}/role {role:'student'} in a full college: 200. 2. SA PATCH /users/{student} {tenant_id: full college}: 200. 3. PATCH /colleges/{id} {student_seat_cap:null} removes the cap. 4. Two parallel POST /users both pass at cap-1. Live data has no over-cap college today.

**Expected:** Every path that makes a student in a college respects the cap; a cap cannot go below current use or be removed by accident.

**Actual:** Only two of the entry paths enforce it, and they can race.

**Proposed fix:** Central assert_seat_available with SELECT ... FOR UPDATE on the tenant row, called from create, import, role change and tenant move; reject null and values below student_count in update_college.

**Regression test required:** One test per entry path at cap, plus a concurrency test.

**Dependencies / blockers:** None

### BACKEND-010

**Deactivate does not stop a pending invite, and Reactivate on a pending user leaves a stuck 'active' account**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | users / activation |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Deactivate kills the invite (AUTH-005); reactivate answers 409 for a never-activated account; migration 0047 returns already-stuck accounts to pending.

**Test:** tests/integration/test_auth_hardening.py::test_deactivated_invite_cannot_be_activated, ::test_reactivate_refuses_a_never_activated_account

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Deactivate does not stop a pending invite, and Reactivate on a pending user leaves a stuck 'active' account.

**Root cause / investigation status:** deactivate_user (users.py:611-634) keeps activation tokens; activate_account (auth.py ~385-403) never checks status and sets is_active=True. reactivate_user (users.py:637-655) sets is_active=True on never-activated users with no password, so derive_status says active and issue_and_send_activation (user_service.py) raises UserAlreadyActivated.

**Reproduction:** Code review (POST not sent). A: invite a user, deactivate them, open the activation link: account becomes active. B: invite a user, press Reactivate: list shows Active, the user has no password, Resend invite gives 409 until their first link is used; once it expires only a manual fix helps, because revoke-invite is the sole remaining action.

**Expected:** An admin's deactivate holds until reactivated; pending accounts cannot be 'reactivated'.

**Actual:** Deactivation of a pending account is silently undone by the invitee; Reactivate produces an active account that cannot sign in.

**Proposed fix:** Delete unused activation tokens on deactivate; return 409 from reactivate when never verified; derive status from verification and password.

**Regression test required:** Both sequences, with status and resend assertions.

**Dependencies / blockers:** Shared with the auth auditors.

### BACKEND-011

**A NUL byte in any search box gives HTTP 500 on most list routes**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | API defect |
| Affected module | all list endpoints |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** reject_unusable_input (app/utils/request_guard.py) runs in both get_current_user dependencies and gives 422 for NUL in query or path, on every signed-in route. Chosen because main.py is outside my ownership; voice_qna routes with their own bearer auth are not covered.

**Test:** tests/integration/test_api_rules.py::test_bad_query_values_are_not_server_errors

**Evidence:** failed before: run against unfixed code; passes now

**Description:** A NUL byte in any search box gives HTTP 500 on most list routes.

**Root cause / investigation status:** Search strings go straight into ilike with no validation; Postgres and asyncpg reject 0x00. No global handler maps it to 4xx.

**Reproduction:** Reproduced with q=%00 or search=%00: 500 on /api/v1/users, /colleges, /universities, /departments, /audit-logs, /notifications/deliveries, /academics/programs, /faculty/students, /edu_video/jobs, /edu_video/student/videos; /roles/%00x also 500. Stored in platform_error_events as CharacterNotInRepertoireError and 'A string literal cannot contain NUL'.

**Expected:** 422 or an empty result.

**Actual:** 500. Each one counts on the health page: 30 in an hour turns the API row to Down (health.py:69-77), and a student account can trigger it through /edu_video/student/videos.

**Proposed fix:** Reject NUL in a shared query dependency or a global exception handler (DataError to 422); separate client-caused errors from health counts.

**Regression test required:** Parametrised test over all routes with q/search: no 5xx.

**Dependencies / blockers:** None

### BACKEND-012

**Very large page or offset values give HTTP 500**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | API defect |
| Affected module | all paged endpoints |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** offset le=1,000,000 on /voice_qna/conversations (app/voice_qna/api/simple.py). The rest was fixed earlier by agent api.

**Test:** tests/integration/test_platform_limits.py::test_huge_voice_offset_is_refused_not_a_500

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** Very large page or offset values give HTTP 500.

**Root cause / investigation status:** page has ge=1 but no upper bound; (page-1)*page_size overflows bigint. voice_qna offset is also unbounded.

**Reproduction:** Reproduced with page=9223372036854775807: 500 on /users, /notifications/deliveries, /edu_video/jobs, /edu_video/student/videos, /faculty/students. offset=99999999999999999999 on /voice_qna/conversations: 500. /reports/preview pages in Python and answers 200.

**Expected:** 422 or an empty page.

**Actual:** 500, logged as NumericValueOutOfRange or DataError, also feeding the health status.

**Proposed fix:** Set le= on page and offset (a shared Pagination dependency).

**Regression test required:** Boundary test on every paged route.

**Dependencies / blockers:** None

### BACKEND-013

**Bad filter values on GET /users give HTTP 500**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | API defect |
| Affected module | users |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** tenant_id typed UUID on GET /users and ImportRequest; blank role filter ignored.

**Test:** tests/integration/test_api_rules.py::test_bad_query_values_are_not_server_errors, ::test_blank_role_filter_is_ignored, ::test_bulk_import_rejects_a_malformed_college_id

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Bad filter values on GET /users give HTTP 500.

**Root cause / investigation status:** users.py:228-230: role=',' or ' ' yields an empty list and roles[0] raises IndexError. users.py:196,213: tenant_id is str, not UUID, so tenant_id=abc reaches the database. ImportRequest.tenant_id is the same (student_import.py:40; db.get at users.py:747).

**Reproduction:** As SA: GET /api/v1/users?role=, , ?role=%20 and ?tenant_id=abc all returned 500.

**Expected:** 422 for tenant_id; empty roles ignored.

**Actual:** 500.

**Proposed fix:** Type tenant_id as UUID in the query and ImportRequest; skip the role filter when the list is empty.

**Regression test required:** Query-validation tests on /users and bulk-import.

**Dependencies / blockers:** None

### BACKEND-014

**PATCH with an explicit null crashes on required columns**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | API defect |
| Affected module | colleges / universities / departments |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Before-validators reject explicit null on required fields in college, university, department and user PATCH schemas.

**Test:** tests/integration/test_api_rules.py::test_college_patch_rejects_null_required_fields, ::test_university_patch_rejects_null_required_fields, ::test_department_patch_rejects_null_name, ::test_user_patch_rejects_null_name

**Evidence:** failed before: run against unfixed code; passes now

**Description:** PATCH with an explicit null crashes on required columns.

**Root cause / investigation status:** Update schemas use Optional fields and routers apply model_dump(exclude_unset=True) with plain setattr (colleges.py:298-300, universities.py:268-270, departments.py:851-866). {"name":null} passes pydantic and hits NOT NULL (tenant.py:33, department.py:38) with no IntegrityError handling. Academics handles this correctly.

**Reproduction:** Code review (PATCH not sent): PATCH /colleges/{id} {"name":null}.

**Expected:** 422.

**Actual:** Uncaught IntegrityError, 500. Same for country and plan.

**Proposed fix:** Reject null for non-nullable fields in a schema validator or drop None like academics.py.

**Regression test required:** PATCH each router with null name.

**Dependencies / blockers:** None

### BACKEND-015

**System roles can be deactivated, and any role emptied, through PATCH /roles/{code}**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Role/permission |
| Affected module | roles |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** PATCH guards system roles (no deactivation, no empty permissions, superadmin keeps *), answering 409. Every role write is audited with before/after. app/api/v1/roles.py

**Test:** tests/integration/test_api_rules.py::test_system_roles_keep_their_guard, ::test_role_changes_are_audited

**Evidence:** failed before: run against unfixed code; passes now

**Description:** System roles can be deactivated, and any role emptied, through PATCH /roles/{code}.

**Root cause / investigation status:** DELETE guards is_system (roles.py:117) but RoleUpdateRequest includes is_active and default_permissions, and update_role (roles.py:83-101) applies them to any role with no is_system check and no audit.

**Reproduction:** Code review (PATCH not sent). PATCH /roles/student {is_active:false}: role_exists_and_active then fails and POST /users role=student returns 400 'Unknown or inactive role'. PATCH /roles/superadmin {default_permissions:[]} also passes. FALLBACK_ROLE_PERMISSIONS applies only when no active row exists.

**Expected:** System roles keep their guard on every path.

**Actual:** The DELETE guard is bypassed by PATCH.

**Proposed fix:** Reject is_active=false for is_system; validate permission lists; audit every change.

**Regression test required:** PATCH system role returns 409; role create/update writes audit rows.

**Dependencies / blockers:** None

### BACKEND-016

**Year promotion leaves the semester behind, cannot be undone and is not idempotent**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | users / promotion |
| Finding status | confirmed |
| Duplicates merged | DATA-016 |

**Phase 2 remediation (Fixed):** Semester moves to the first semester of the new year; tenants.promoted_academic_year refuses a second run in one academic year (July start, IST) with 409 unless repeat_confirmed; run is audited per college. Where the target semester is missing or inactive, semester_id becomes null.

**Test:** tests/integration/test_api_rules.py::test_promotion_moves_the_semester_and_refuses_a_second_run

**Evidence:** failed before: run against unfixed code; passes now

**Blocked on:** Frontend: the promote dialog should show the 409 text and offer repeat_confirmed.

**Description:** Year promotion leaves the semester behind, cannot be undone and is not idempotent.

**Root cause / investigation status:** bulk_promote_year (users.py:702-714) changes year_of_study only; semester_id stays, though the screens read it. No idempotency guard, no audit. tenant_id=None promotes all colleges. _year_from_semester would give a different year.

**Reproduction:** Live: 1 student's year_of_study disagrees with the value derived from their semester. Code review: running POST /users/bulk-promote-year twice advances everyone two years.

**Expected:** Year and semester move together; a second run in one academic year is refused or confirmed.

**Actual:** Student records show Year 3 with Semester 1; a double click advances a whole college two years; no trail.

**Proposed fix:** Advance semester_id with the year (first semester of the new year), add an academic-year marker or a confirmation token, audit the run.

**Regression test required:** Promote and assert year and semester agree; second run blocked.

**Dependencies / blockers:** None

### BACKEND-017

**Faculty moved to another department keep their old subject assignments**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | users / staff_scope |
| Finding status | confirmed |
| Duplicates merged | DATA-022 |

**Phase 2 remediation (Fixed):** subject_staff rows deleted on department, college and role change; scope queries also filter on the user's current department. users.py, department_service.py, staff_scope.py

**Test:** tests/integration/test_api_rules.py::test_moved_faculty_lose_old_subjects_and_scope_ignores_stale_rows, ::test_role_change_clears_subject_rows

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Faculty moved to another department keep their old subject assignments.

**Root cause / investigation status:** update_user and update_user_role call release_hod_posts only (users.py:504-506, 600). subject_staff is untouched. staff_scope._subject_rows_sync (staff_scope.py:83-91) filters on Subject.is_active, not department. build_scope treats the stale rows as 'has subjects'.

**Reproduction:** Code review (PATCH not sent). 1. Assign faculty F subjects in dept A. 2. PATCH department to B. 3. scope.subject_ids holds A's subjects; every chapter in B fails scope.sees, so F sees nothing instead of the documented read-only department view, and program_ids still selects A's programme ids. Same when the role changes to student or the account is deactivated. Live data: 0 such rows.

**Expected:** A department or role change removes assignments, or at least ignores them.

**Actual:** F has an empty portal and stale 'Subjects' rows.

**Proposed fix:** Delete subject_staff on department and role change; add department_id to the scope query.

**Regression test required:** Move faculty: scope becomes read-only whole-department.

**Dependencies / blockers:** None

### BACKEND-018

**A department head who keeps role 'faculty' gets no HOD powers**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Role/permission |
| Affected module | departments / staff_scope |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** No change.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** not applicable

**Evidence:** code confirmed, no change

**Decision needed:** Does being set as head of department grant HOD powers to someone with role faculty, or may only role hod be chosen (promoting them when assigned)?

**Description:** A department head who keeps role 'faculty' gets no HOD powers.

**Root cause / investigation status:** department_service.HOD_ELIGIBLE_ROLES includes faculty and hod_assigned emails them, but no code reads Department.hod_user_id for power: build_scope (staff_scope.py:62-70), _reviewers (notification_events.py:347-364) and reports use User.role only.

**Reproduction:** Code review. PATCH /departments/{id} {hod_user_id:<faculty>}: they get 'Made head of department' mail, yet have no staff list, no unlinked content, no reports, no review mail for unlinked chapters. Live: 0 such departments.

**Expected:** Being set as head grants the HOD scope, or only role=hod can be chosen.

**Actual:** The label and e-mail claim a role the person does not have; unlinked chapters may have no reviewer.

**Proposed fix:** Either treat hod_user_id as HOD in build_scope or restrict eligibility to role hod and promote the role when assigned.

**Regression test required:** Faculty set as head: scope.is_hod and review notification assertions.

**Dependencies / blockers:** Owner decision.

### BACKEND-019

**/api/edu-video/pending-changes reports every sent chapter and ignores staff scope**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | API defect |
| Affected module | edu_video bridge |
| Finding status | confirmed |
| Duplicates merged | AUTHZ-007 |

**Phase 2 remediation (Fixed):** app/api/v1/edu_video_bridge.py now reuses list_jobs(review_state='changes_requested') with department and subject scope. The frontend no longer calls this route, so nothing had to move with it. Docstring corrected.

**Test:** tests/integration/test_audit_and_identity.py::test_pending_changes_lists_only_open_requests_in_scope, test_faculty_pending_changes_stop_at_their_subjects

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** /api/edu-video/pending-changes reports every sent chapter and ignores staff scope.

**Root cause / investigation status:** edu_video_bridge.py:46-51 uses updated_at > sent_to_hod_at, but mark_sent_to_hod (job_tracker.py:437-441) sets the two from separate now() calls, so updated_at is always later. Real columns changes_requested_at/by exist now. The filter is tenant-only for faculty and HOD. src/lib/api/admin/eduVideo.js:524,561 still calls it.

**Reproduction:** Live: SA GET on the API returned total=1 for the single sent job (SELECT shows 1 of 1 sent, unpublished job with updated_at > sent_to_hod_at). Other-department leak is by code; HOD and Faculty returned 0 here because no such job exists in this data.

**Expected:** Only chapters with an open change request, in the caller's department or subjects.

**Actual:** All sent chapters count as 'pending changes'; an HOD or Faculty sees other departments' titles in the same college.

**Proposed fix:** Filter on changes_requested_at and apply staff scope, or remove the bridge and use /edu_video/jobs?review_state=changes_requested.

**Regression test required:** Sent with no request is not listed; other department is not listed.

**Dependencies / blockers:** Frontend caller must move at the same time.

### BACKEND-020

**Upload route reads unlimited files into memory and blocks the event loop**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance |
| Affected module | edu_video / upload |
| Finding status | confirmed |
| Duplicates merged | UX-021 |

**Phase 2 remediation (Fixed):** app/edu_video/routes.py: upload is a plain def, so FastAPI runs it in a thread (sync Session, file writes, S3 no longer on the event loop); _read_limited reads 1 MB chunks and stops at the limit; _check_signature refuses a renamed .pdf/.docx/.pptx at once.

**Test:** tests/edu_video/test_p2_pipeline.py::test_an_oversized_upload_stops_at_the_limit, ::test_a_renamed_file_is_refused_at_once, ::test_a_real_file_passes, ::test_no_blocking_database_work_in_an_async_handler. The concurrent /health case is covered by that static check, not a load test.

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Blocked on:** Optional, infra: nginx client_max_body_size so an oversized body is refused before it is spooled to disk.

**Description:** Upload route reads unlimited files into memory and blocks the event loop.

**Root cause / investigation status:** routes.py:527 awaits upload_file.read() in full before the 50 MB check (:528), for up to 10 files. The route is async def yet uses a sync Session (count_jobs, create_job), sync file writes (:579) and blocking boto3 S3 uploads (:581,:601, asset_storage.py:72) on the event loop. Only the extension is checked (:512-526), so a renamed binary fails later in the job. No client_max_body_size config in the repo.

**Reproduction:** Code review (upload not sent). A staff user posting a multi-GB .pdf allocates it all in RAM; during an S3 upload every other API request waits.

**Expected:** Stream with a byte limit; run blocking work in a threadpool; check file signatures.

**Actual:** Memory is unbounded per request and all requests stall during the upload's blocking steps.

**Proposed fix:** Read in chunks and stop at the limit; make the route plain def or use run_in_threadpool for DB and S3; sniff magic bytes.

**Regression test required:** Oversized stream is rejected early; a concurrent /health stays responsive during upload.

**Dependencies / blockers:** None

### BACKEND-021

**Soft-deleting a chapter does not cascade and has no guard for published content**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Medium |
| Category | Functional bug |
| Affected module | edu_video / delete |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Rule applied: a deleted chapter leaves every read model. reports._activity (watch time, Q&A, attempts, completion), subject_jobs_select, leaderboard (filter list and board), faculty directory attempts, college analytics pass rate. Earlier agent added the review-history row, /mcq/my-attempts filter and tutor refusal; this batch added the audit row. Everything except the confirmation step is done.

**Test:** tests/integration/test_read_models.py::test_a_deleted_chapter_leaves_every_report_number, test_a_deleted_chapter_leaves_the_leaderboard; tests/integration/test_audit_and_identity.py::test_publish_and_delete_are_audited

**Evidence:** failed before: run on the unfixed code (18 of 21 failed); passes now: pytest

**Decision needed:** Should deleting a published chapter, or one with attempts, need a confirmation? It would be a breaking change to DELETE /edu_video/jobs/{id} (409 without ?confirm=true) and needs a frontend dialog.

**Description:** Soft-deleting a chapter does not cascade and has no guard for published content.

**Root cause / investigation status:** delete_job (routes.py:966-982) only sets deleted_at, with no check of published_at, no review_log row and no audit. The tutor lesson stays ready. mcq /my-attempts (mcq routes.py:196-219) has no deleted filter, nor do leaderboard.py queries, reports._activity watch and attempt queries, or subject_jobs_select (reports.py:201-209).

**Reproduction:** Live: 1 soft-deleted job has a READY lesson. Code review for the rest.

**Expected:** Deleting published content is confirmed and recorded, and every read model treats it the same.

**Actual:** Completion excludes the chapter while watch time, averages, leaderboard and My attempts still include it; attempt links then 404.

**Proposed fix:** Decide one rule; filter deleted jobs consistently; disable the lesson; audit and record in the review history; confirm when published or attempted.

**Regression test required:** Delete published chapter: assert every read model.

**Dependencies / blockers:** None

### BACKEND-022

**Archiving a chapter, subject, programme or department does not hide published videos; department archive ignores content**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | academics / edu_video |
| Finding status | confirmed |
| Duplicates merged | DATA-012 |

**Phase 2 remediation (Fixed):** Only the stated defects: assert_can_archive now also counts published chapters, using the existing force flag (app/services/department_service.py). Semester deactivate refuses with 409 when active students have that semester_id (app/api/v1/academics.py); there is no force on semesters, matching the subject check beside it. Report completion uses live_chapter_clause (app/api/v1/reports.py). Student reads were done earlier by agent pipeline. Watch time and quiz history of an archived chapter still count: the register states only completion and access.

**Test:** tests/integration/test_read_models.py::test_a_department_with_published_content_needs_force, test_a_semester_with_placed_students_is_not_archived, test_an_archived_subject_stops_counting_towards_completion

**Evidence:** failed before: run on the unfixed code (18 of 21 failed); passes now: pytest

**Description:** Archiving a chapter, subject, programme or department does not hide published videos; department archive ignores content.

**Root cause / investigation status:** list_jobs (job_tracker.py:341-419) and _ensure_student_can_view (routes.py:176-193) never read is_active on the academic chain. assert_can_archive (department_service.py) counts students only, though the docstring AC says 'published content or enrolled students'. Semester deactivate checks subjects, not placed students (academics.py:488-494).

**Reproduction:** Code review (PATCH not sent). Deactivate a subject with a published chapter: student still sees it and can take the quiz. Analytics hides the subject (college_insights.py:323-331) while completion still counts its jobs. Live: 0 such rows.

**Expected:** An archived node is hidden from students, or the archive is refused.

**Actual:** Students keep access, totals and subject rows disagree.

**Proposed fix:** Join the active chain in student reads, or block the archive; extend assert_can_archive to published jobs; check placed students before semester archive.

**Regression test required:** Archive each level: assert student list, detail and metrics.

**Dependencies / blockers:** None

### BACKEND-023

**Completion ignores the student's programme, so it can never reach 100% in a multi-programme department**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | reports / analytics |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Completion's available set now follows the classroom rule: unlinked chapters, plus the student's programme (all, if they have none). app/api/v1/reports.py

**Test:** tests/integration/test_api_rules.py::test_completion_counts_only_chapters_the_student_can_open

**Evidence:** failed before: run against unfixed code; passes now

**Blocked on:** docs/knowledge/metrics/completion.md needs the new rule.

**Description:** Completion ignores the student's programme, so it can never reach 100% in a multi-programme department.

**Root cause / investigation status:** reports._activity (reports.py:225-249) groups available chapters by (tenant, department). Students only see their programme's chapters (job_tracker.py:369-377). college_insights subject rows do respect programme (:373-376), and the header comment says 'as the classroom shows'. docs/knowledge/metrics/completion.md records the department rule, which itself conflicts with student-content-access.md.

**Reproduction:** Code review with a department holding two programmes: a student who finishes every chapter they can open shows below 100%.

**Expected:** Available = chapters the student can open.

**Actual:** Completion is understated, at-risk fires 'Behind on chapters' falsely, and the Super Admin completion rate is low.

**Proposed fix:** Add the student's programme rule to the per-scope set (chapter programme or unlinked); update the metric doc.

**Regression test required:** Two programmes: finish all own chapters, completion is 100.

**Dependencies / blockers:** None

### BACKEND-024

**Reports and analytics disagree although both claim one aggregate**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | reports / college_insights / dashboard |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** reports._students and the dashboard institution rows count active students only, matching college_insights. Student reports therefore no longer list pending or deactivated students.

**Test:** tests/integration/test_api_rules.py::test_report_and_analytics_share_one_population, ::test_dashboard_student_count_is_active_only

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Reports and analytics disagree although both claim one aggregate.

**Root cause / investigation status:** reports._students (reports.py:192-198) has no is_active filter; college_overview uses active students only (college_insights.py:168). Header notes claim numbers agree. dashboard.py institution rows show all students next to 'Active students'.

**Reproduction:** Code review: pending and deactivated students raise the report's Students count and completion denominator but not analytics. Same college and range, different numbers.

**Expected:** One population per metric.

**Actual:** College Admin screen and export differ.

**Proposed fix:** Pick active students for KPIs (show pending separately) and share the population in one function.

**Regression test required:** Same range: report totals equal analytics totals.

**Dependencies / blockers:** None

### BACKEND-025

**uptime_24h ignores downtime at the start of the window**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | health |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** _uptime measures from the later of window start and the first check ever. app/api/v1/health.py

**Test:** tests/integration/test_api_rules.py::test_uptime_counts_a_gap_at_the_window_start

**Evidence:** failed before: run against unfixed code; passes now

**Description:** uptime_24h ignores downtime at the start of the window.

**Root cause / investigation status:** health.py:84-94 _uptime divides by minutes since the first check inside the window, so an outage before that check is not counted, despite the module note 'a missing minute counts as downtime'. Meant for 'since monitoring began' but applied to every window.

**Reproduction:** Live: platform_health_checks has rows from 12 Oct, but the first row in the last 24h was 03:57 UTC with 132 rows over 135 minutes. GET /health returned uptime_24h=97.08 for about 2.2 hours up out of 24 (about 9%).

**Expected:** About 9%.

**Actual:** 97.08%.

**Proposed fix:** Use the window start unless the first ever check is later.

**Regression test required:** Fixture with a gap at window start.

**Dependencies / blockers:** None

### BACKEND-026

**Quiz report PDF crashes for Tamil chapter names and prints Tamil as blocks**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Functional bug |
| Affected module | mcq / reports PDF |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Crash fixed: app/mcq/api/routes.py _attachment_header sends an ASCII filename plus RFC 5987 filename*. Tamil title now returns 200.

**Test:** tests/integration/test_mcq_rules.py::test_a_tamil_chapter_title_downloads

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Blocked on:** Glyphs: Tamil still prints as blocks in the PDF because no Tamil font exists in the image or repo, and reportlab does not shape Tamil. Same dependency as PIPE-001. reports._pdf is in app/api (agent api).

**Description:** Quiz report PDF crashes for Tamil chapter names and prints Tamil as blocks.

**Root cause / investigation status:** mcq/api/routes.py:541 keeps isalnum() characters, so Tamil letters enter the Content-Disposition header, which Starlette encodes as latin-1. _build_report_pdf (:424-503) and reports._pdf (reports.py:605-647) use Helvetica only, with no Unicode font, though language 'tamil' is a product option.

**Reproduction:** Offline with the project's Starlette: StreamingResponse with that filename logic on a Tamil title raises UnicodeEncodeError: 'latin-1' codec. Glyph problem is by code; the live route was not run on Tamil data.

**Expected:** A readable PDF for every supported language.

**Actual:** HTTP 500 for a Tamil chapter title; Tamil text, including student names in report exports, renders as missing glyphs.

**Proposed fix:** Use an ASCII fallback plus RFC 5987 filename*; register a Unicode font with Tamil shaping.

**Regression test required:** report.pdf with a Tamil title returns 200 and extractable text.

**Dependencies / blockers:** None

### BACKEND-028

**Reports and dashboards load every student per request and will fail at large IN lists**

| Field | Value |
|---|---|
| Status | In Progress |
| Severity | Medium |
| Category | Performance |
| Affected module | reports / analytics / academics |
| Finding status | suspected |

**Phase 2 remediation (In Progress):** Driver failure removed: reports and insights send ids as one array parameter (reports.among). Still open: rows are built in Python per request, /reports/preview slices in Python, /academics/programs is unpaged, no 40k load test was run.

**Test:** tests/integration/test_api_rules.py::test_activity_handles_more_ids_than_the_bind_limit

**Evidence:** failed before with 33,000 ids; passes now. Load target not measured.

**Description:** Reports and dashboards load every student per request and will fail at large IN lists.

**Root cause / investigation status:** _build_rows (reports.py:341-342) loads all students then runs IN (ids) queries (reports.py:240,252,264,278); asyncpg allows 32767 bind parameters. The SA dashboard does this every load. /reports/preview recomputes everything and slices in Python. /analytics/college returns every student row. /academics/programs is unpaged with 6 queries per row (:153-166). /edu_video/jobs runs scene_progress per row.

**Reproduction:** Not reproduced: local data is small. Inspection only. Loadtest not run.

**Expected:** Bounded queries and pagination in SQL.

**Actual:** Above 32767 students the SA dashboard and reports would raise a driver error; before that, cost grows linearly on each page.

**Proposed fix:** Aggregate in SQL with joins on tenant or department; paginate rows; cache the dashboard.

**Regression test required:** Seeded 40k students: dashboard under target time.

**Dependencies / blockers:** None

### BACKEND-029

**Per-IP limits on voice endpoints throttle whole classes, and may be platform-wide behind a proxy**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | voice_qna / rate limiter |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** app/voice_qna/api/simple.py: every voice route limit keyed on _user_rate_key (cookie user, then voice token, then IP).

**Test:** tests/integration/test_tutor_access.py::test_two_students_on_one_ip_each_have_their_own_limit

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Blocked on:** Infra, not code here: Dockerfile uvicorn --forwarded-allow-ips set to the proxy, and REDIS_URL required in production, so the fallback key and audit IPs are real.

**Description:** Per-IP limits on voice endpoints throttle whole classes, and may be platform-wide behind a proxy.

**Root cause / investigation status:** simple.py:243,335,377,441 use limiter.limit per IP (20-30/minute), whose own comment (:228) says one IP is wrong for a lab. rate_limiter.py key_func=get_remote_address reads request.client. Dockerfile:39 starts uvicorn with no --forwarded-allow-ips, so behind a containerised proxy all clients may be one IP; audit_service.request_ip records the same address. slowapi memory storage is per process unless REDIS_URL is set.

**Reproduction:** Config inspection; production proxy config is not in the repo. Not load-tested.

**Expected:** Limits per student.

**Actual:** A class of 30 behind college NAT gets 429 on tutor start and history; audit log IPs may all be the proxy.

**Proposed fix:** Use user_key for these routes (as MCQ does); set forwarded-allow-ips to the proxy; require Redis in production.

**Regression test required:** Two users, one IP, each under their own limit.

**Dependencies / blockers:** None

### BACKEND-030

**Audit list stops at 200 rows with no paging; unknown ranges silently mean 30 days**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | API defect |
| Affected module | audit_logs |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Audit list has page, page_size, total; ranges today, last_7_days, last_30_days, last_90_days, all_time; unknown gives 400; export sends X-Total-Count and X-Truncated. Default page size stays 200, so the current UI is unchanged.

**Test:** tests/integration/test_api_rules.py::test_audit_list_pages_and_totals, ::test_audit_range_reaches_older_rows, ::test_audit_export_reports_truncation, ::test_unknown_range_is_400

**Evidence:** failed before: run against unfixed code; passes now

**Blocked on:** Frontend: add paging controls and show a truncation notice.

**Description:** Audit list stops at 200 rows with no paging; unknown ranges silently mean 30 days.

**Root cause / investigation status:** audit_service.list_audit_logs default limit=200, no total or page (audit_logs.py:32-33); export limit 5000 with no truncation notice. range_since supports today and last_7_days only; anything else means 30 days, so older entries are unreachable. 'today' is UTC midnight.

**Reproduction:** Live: GET /audit-logs?range=all_time returned 200; the 30-day rule is by code.

**Expected:** Paged list and an honest range.

**Actual:** Older rows cannot be viewed or exported; a compliance export can be cut silently.

**Proposed fix:** Add page and total, support all ranges, reject unknown ones, report truncation.

**Regression test required:** Seed 300 rows and page through; range=garbage gives 400.

**Dependencies / blockers:** None

### BACKEND-031

**Bulk emails run on daemon threads with no queue; a restart loses them with no record**

| Field | Value |
|---|---|
| Status | In Progress |
| Severity | Medium |
| Category | Backend defect |
| Affected module | notifications / workers |
| Finding status | confirmed |

**Phase 2 remediation (In Progress):** Done: college-admin invites now go out after commit, so a failed create mails no dead link. Not done: durable queue. Bulk mail still runs on daemon threads.

**Test:** No automated test yet for the queue; invite order is covered only by existing college tests.

**Evidence:** partial; no failing-before test

**Decision needed:** A durable invite queue must keep each raw activation link until sent, which conflicts with BACKEND-034 (no secrets at rest). Prefer re-issuing fresh links after a restart, or accept the loss and let admins Resend invite?

**Description:** Bulk emails run on daemon threads with no queue; a restart loses them with no record.

**Root cause / investigation status:** notification_events._background (:40-50) starts daemon threads. activation_invites (:168-181) sends up to 100 in sequence; _deliver_all covers a whole department. A delivery row is written only after each attempt, so unsent recipients leave no trace. colleges._create_pending_admin (colleges.py:154-157) queues the invite before the transaction commits (:276), so a later failure mails a dead link.

**Reproduction:** Code review; no restart performed.

**Expected:** Durable work items with retry.

**Actual:** A deploy during a publish or import loses mail silently; retry-failed cannot see it.

**Proposed fix:** Write a pending delivery row in the same transaction and have a worker drain it (as the ingestion worker does); send invites after commit.

**Regression test required:** Kill mid-batch: remaining mail sent after restart.

**Dependencies / blockers:** None

### BACKEND-032

**Reviewers are not told when a regenerated chapter returns, and the uploader's bell is suppressed**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | notifications / review loop |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** _pipeline_finished also alerts reviewers when a render finishes on a chapter sent to HOD and unpublished; inbox dedupe key carries the render time. app/services/notification_events.py tests/test_in_app_notifications.py expected key updated: it now carries the render time, which is the fix.

**Test:** tests/integration/test_platform_rules.py::test_regenerated_chapter_alerts_reviewers_and_uploader_again

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Reviewers are not told when a regenerated chapter returns, and the uploader's bell is suppressed.

**Root cause / investigation status:** Only send_job_to_hod calls content_ready_for_review (routes.py:1282). set_job_output calls pipeline_finished (uploader only). The dedupe key pipeline_completed:{job}:{status} (notification_events.py:515) is permanent, so a second DONE or FAILED for a job writes no inbox row, while email does go out.

**Reproduction:** Code review. Flow: reviewer requests changes, admin regenerates, render finishes. docs/knowledge/flows/content-review-loop.md says it is 'back in the review queue'.

**Expected:** Reviewers are told; each render gives one alert.

**Actual:** Chapter waits unseen; the uploader's second result never reaches the bell.

**Proposed fix:** Notify reviewers on DONE when sent_to_hod_at is set; add a render attempt to the dedupe key.

**Regression test required:** Regenerate and assert reviewer alert and second uploader alert.

**Dependencies / blockers:** None

### DATA-002

**Migration 0045 is not safe on a database that already ran the old 0040_user_notifications**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Database integrity |
| Affected module | alembic/versions/0045_user_notifications.py |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** 0045 returns early when user_notifications already exists. qna_sessions.title was already handled by 0047.

**Test:** tests/integration/test_platform_limits.py::test_0045_runs_on_a_database_that_already_has_the_table

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** Migration 0045 is not safe on a database that already ran the old 0040_user_notifications.

**Root cause / investigation status:** 0045 upgrade() is an unconditional op.create_table('user_notifications'). With duplicate id 0040, whichever file Alembic loaded decided what ran. A DB where the notifications file won has the table and recorded 0040, and may lack qna_sessions.title from the other 0040.

**Reproduction:** Not reproduced (needs a writable DB). 1. Take a DB upgraded from committed HEAD where 0040 resolved to the notifications file. 2. Apply the working tree: 0045 fails with table exists, and qna_sessions.title stays missing because 0040 is already recorded.

**Expected:** Every environment reaches the same schema.

**Actual:** WSL DB is correct, but teammate or staging databases are unknown.

**Proposed fix:** Before committing, check each environment for user_notifications and qna_sessions.title. Make 0045 conditional on the table's absence and add a guarded qna_sessions.title step.

**Regression test required:** Upgrade test from a schema with the table already present.

**Dependencies / blockers:** DATA-001

### DATA-003

**Windows Postgres runs on 0.0.0.0:5432 while the API DB URL is localhost:5432**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | Local environment / DATABASE_URL |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Added a startup check: ops_monitor logs and records a Database error when alembic_version differs from the code head. Not fatal.

**Test:** tests/integration/test_platform_rules.py::test_schema_behind_the_code_is_reported

**Evidence:** failed before: run against unfixed code; passes now

**Decision needed:** Does the Windows Postgres 16 instance hold anything needed? If not, stop or disable the service; otherwise move it off 5432 and bind it to 127.0.0.1. Should a schema mismatch stop startup rather than only log?

**Description:** Windows Postgres runs on 0.0.0.0:5432 while the API DB URL is localhost:5432.

**Root cause / investigation status:** Service postgresql-x64-16 is Running and netstat shows a listener on 0.0.0.0:5432. DATABASE_URL resolves to host localhost, port 5432. The same URL therefore means WSL Postgres 18 inside WSL and Windows Postgres 16 from any Windows process.

**Reproduction:** 1. Get-Service *postgres* shows Running. 2. netstat shows 0.0.0.0:5432 LISTENING. 3. Parse settings.DATABASE_URL in WSL: host localhost, port 5432.

**Expected:** One unambiguous database for this project.

**Actual:** alembic, seed scripts or a Windows-run API silently hit the wrong instance (HANDOFF says it was at 0032; not re-verified). Schema-mismatch 500s result, and migrations can land on the wrong server. The instance also listens on all interfaces, so it is reachable from the LAN subject to firewall and pg_hba, which were not inspected.

**Proposed fix:** Stop or disable the Windows service or move it to another port, bind it to 127.0.0.1, and use an explicit WSL host or dedicated port in .env. Print the server version at app start.

**Regression test required:** Startup check that fails loudly if alembic_version does not match the code head.

**Dependencies / blockers:** Owner decision on whether the Windows instance holds anything needed.

### DATA-004

**alembic/env.py sees only 31 of 41 tables, so autogenerate would propose dropping live tables**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Database integrity |
| Affected module | alembic/env.py |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New app/db/migration_metadata.py merges both Bases (first copy of users wins) and imports edu_video, MCQ and voice models. alembic/env.py uses it. CI step 'alembic check' is not added: .github belongs to another agent.

**Test:** tests/integration/test_platform_limits.py::test_autogenerate_sees_every_table

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** alembic/env.py sees only 31 of 41 tables, so autogenerate would propose dropping live tables.

**Root cause / investigation status:** env.py imports app.models and livekit models only (lines 16-19). edu_video job_tracker and app.mcq.models are not imported, and voice_qna models use a separate Base (app/voice_qna/db.py). target_metadata = Base.metadata.

**Reproduction:** 1. Import only what env.py imports. 2. len(Base.metadata.tables) is 31 against 41 ORM tables. 3. edu_video_jobs, mcq_documents and lessons are all absent.

**Expected:** Autogenerate compares all tables.

**Actual:** 'alembic revision --autogenerate' would emit drop_table for jobs, scenes, MCQ and voice tables. A careless review would cause data loss.

**Proposed fix:** Import job_tracker and app.mcq.models in env.py and pass a list of both metadatas (target_metadata=[Base.metadata, VBase.metadata]). Exclude the duplicate users mapping.

**Regression test required:** 'alembic check' in CI against a migrated DB must report no drops.

**Dependencies / blockers:** None

### DATA-007

**Moving a user to another college keeps department, programme, semester and subject assignments from the old college**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Database integrity |
| Affected module | users |
| Finding status | confirmed |
| Duplicates merged | BACKEND-008, AUTHZ-017 |

**Phase 2 remediation (Fixed):** A college move clears department, programme, semester, subject rows and HOD posts, re-checks the seat cap, and is audited; composite FK users(department_id, tenant_id) added NOT VALID in 0048. A student's learning records in the old department are cleared, as a department move already does.

**Test:** tests/integration/test_api_rules.py::test_college_move_leaves_no_foreign_links, tests/integration/test_platform_rules.py::test_database_refuses_a_user_in_another_colleges_department

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Moving a user to another college keeps department, programme, semester and subject assignments from the old college.

**Root cause / investigation status:** app/api/v1/users.py:425-441 validates department only if department_id is in the PATCH. :458-484 clears programme/semester only when those fields or department change. A tenant_id-only PATCH touches none. No composite FK ties users.department_id to users.tenant_id. subject_staff is also left alone. tenant_id=null is also accepted for a college-scoped user (:425 skips the check).

**Reproduction:** From code: 1. Superadmin PATCH /users/{id} body {tenant_id: other college}. 2. User row now has tenant B with department/program/semester of tenant A.

**Expected:** Tenant move clears or re-validates all tenant-bound links in one transaction.

**Actual:** A cross-tenant row results. Department-scoped queries then key on a foreign department id. Current data: 0 such mismatches.

**Proposed fix:** On tenant change require a new department or null out department/program/semester, delete subject_staff rows, release HOD posts, and audit. Add composite FK (department_id, tenant_id) to departments(id, college_id).

**Regression test required:** PATCH tenant only, then assert no foreign links remain.

**Dependencies / blockers:** None

**Verification:** confirmed: users.py:425-441 validates department only when it is in the PATCH, and :458-484 clear programme and semester only on those fields. A tenant_id-only PATCH touches neither. users.py:422 restricts tenant_id to superadmin. The clean-up calls after it are keyed on a department change. Note: Downgraded from High and aligned with duplicates, which were rated Low and Medium. Superadmin-only action. Departments use college_id, not tenant_id. Write not run.

### DATA-009

**Publish and send-to-HOD are check-then-write across several commits**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Database integrity |
| Affected module | edu_video |
| Finding status | suspected |
| Duplicates merged | BACKEND-044 |

**Phase 2 remediation (Fixed):** app/edu_video/job_tracker.py: mark_published and mark_sent_to_hod are one conditional UPDATE, not committed inside, so the review event commits with them; claim_job_status(unpublished=True) makes regenerate and publish exclude each other; regenerate writes plan, scenes and event in one transaction. Routes answer 409 when the update hits no row, and notify only after a win.

**Test:** tests/integration/test_chapter_workflow.py::test_publish_and_regenerate_exclude_each_other (5 rounds, threads on real Postgres), ::test_two_publishes_one_wins, ::test_publish_answers_409_when_the_job_moved_on

**Evidence:** failed before: updates filtered by id only; passes now

**Description:** Publish and send-to-HOD are check-then-write across several commits.

**Root cause / investigation status:** publish_job (routes.py:1306-1323) checks job fields, then mark_published (job_tracker.py:445-453) runs an UPDATE filtered only by id and commits. A second commit then clears changes_requested and writes the review event. send_job_to_hod has the same shape (routes.py:1276-1281). regenerate_job uses the atomic claim_job_status, but publish does not, so the two do not exclude each other. regenerate also commits in several steps (routes.py:1414-1425; replace_scenes_from_plan commits delete then insert).

**Reproduction:** Not reproduced. 1. HOD publish reads status DONE. 2. CA regenerate claims DONE->RENDERING. 3. Publish commits. Result: published_at set on a RENDERING job whose video is being replaced, so it skips review. Separately, a crash between commits leaves a published job with no 'published' review event.

**Expected:** Publish is one atomic conditional statement with its event.

**Actual:** Double clicks give duplicate review events and content_published notifications. Published-while-rendering is possible. Current data: 0 published-not-DONE rows.

**Proposed fix:** UPDATE ... WHERE id AND status='DONE' AND published_at IS NULL AND sent_to_hod_at IS NOT NULL AND deleted_at IS NULL, then check rowcount. Remove inner commits so the event commits with it.

**Regression test required:** Concurrent publish vs regenerate on real Postgres; exactly one wins.

**Dependencies / blockers:** None

### DATA-013

**Only one CHECK constraint exists in the whole database**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Database integrity |
| Affected module | Schema |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Migration 0048: CHECKs on percent, percentage, counts, seat cap, year, duration, job and MCQ status sets, question type; FK users.role to role_master.code. All NOT VALID so legacy rows cannot fail a deploy; run VALIDATE CONSTRAINT per environment.

**Test:** tests/integration/test_platform_rules.py::test_database_refuses_bad_values

**Evidence:** temporary test at revision 0047 showed bad seat cap, year, role and a cross-college chapter were accepted and the indexes absent (passed, then deleted); the constraint tests pass at head

**Description:** Only one CHECK constraint exists in the whole database.

**Root cause / investigation status:** pg_constraint lists only ck_notification_rules_scope_type. users.role, edu_video_jobs.status, mcq status and question_type, video_watch_progress.percent, mcq_attempts.percentage, tenants.student_seat_cap and year_of_study rest on application code alone. Role is free text not linked to role_master.code.

**Reproduction:** Query pg_constraint where contype='c' and connamespace is public: 1 row.

**Expected:** Domain rules enforced in the DB, especially the percent gate that unlocks assessments.

**Actual:** No violations today (all counts 0), but direct SQL or a bug writes any value.

**Proposed fix:** Add CHECKs after a data check: percent 0-100, seat cap > 0, status sets, correct_count <= total_questions. FK users.role to role_master.code.

**Regression test required:** Migration test inserting invalid rows expects IntegrityError.

**Dependencies / blockers:** None

### DATA-014

**21 id columns have no foreign key, and the denormalised hierarchy ids are unguarded**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Database integrity |
| Affected module | Schema |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Migration 0048: composite unique keys and FKs on semesters, subjects, chapters, subject_staff, users and edu_video_jobs to chapters. Log tables left without FKs on purpose.

**Test:** tests/integration/test_platform_rules.py::test_database_refuses_a_chapter_of_another_college

**Evidence:** temporary test at revision 0047 showed bad seat cap, year, role and a cross-college chapter were accepted and the indexes absent (passed, then deleted); the constraint tests pass at head

**Description:** 21 id columns have no foreign key, and the denormalised hierarchy ids are unguarded.

**Root cause / investigation status:** No FK on: chapters.college_id/department_id, semesters.college_id, subjects.college_id/department_id/program_id, subject_staff.college_id/department_id, lessons.tenant_id, mcq_documents.approved_by_user_id, mcq_questions.edited_by_user_id, user_notifications.tenant_id/resource_id, notification_rules.scope_id, notification_deliveries.user_id/tenant_id, platform_error_events.tenant_id, audit_logs.actor_id, edu_video_job_events.job_id, video_watch_progress.job_id, livekit_sessions.quota_addon_credit_id. Log tables and watch progress are deliberate; the academic ones are not. No FK prevents edu_video_jobs.chapter_id pointing at another college's chapter.

**Reproduction:** information_schema vs pg_constraint query. Orphan counts: all 0 except notification_deliveries.user_id = 6, which matches revoke_invite hard deletes (users.py:564) and is harmless. All denormalisation mismatch counts are 0.

**Expected:** Tenant and department ids are DB-guaranteed to match the parent.

**Actual:** Consistency depends on every writer. Clean today.

**Proposed fix:** Add composite unique (id, college_id) on parents and composite FKs on children, at least on subjects, chapters, subject_staff, and jobs to chapters.

**Regression test required:** Insert a chapter with a mismatched college_id expects failure.

**Dependencies / blockers:** None

### DATA-015

**Uniqueness is case-insensitive in code but case-sensitive in the DB; races and case variants give 500s or duplicates**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Database integrity |
| Affected module | users / academics / departments / mcq |
| Finding status | confirmed |
| Duplicates merged | AUTH-021, BACKEND-033 |

**Phase 2 remediation (Fixed):** User model lower-cases email on write; new app/services/user_lookup.py finds accounts case-insensitively (exact spelling first) in auth, setup and users. No existing row is rewritten. Migration 0049 adds unique lower() indexes on users.email, department, programme, subject names and active chapter titles, plus deferred unique (subject_id, position). Each is SKIPPED with a log warning where an environment already has duplicates, so it cannot fail a deploy or change data. Any unique violation now answers 409 through one handler in app/main.py. tenants.name is left alone: the register records 1 live duplicate.

**Test:** tests/integration/test_audit_and_identity.py::test_login_ignores_email_case, test_case_variant_cannot_be_created, test_new_address_is_stored_lower_case, test_database_refuses_a_case_variant, test_two_chapters_cannot_share_a_position; tests/integration/test_read_models.py::test_a_lost_race_on_a_unique_rule_is_a_409

**Evidence:** failed before: run on the unfixed code; passes now: pytest

**Decision needed:** Separate question, not blocking: should college names be unique? tenants.name has no constraint and one duplicate exists on dev, so no rule was added.

**Description:** Uniqueness is case-insensitive in code but case-sensitive in the DB; races and case variants give 500s or duplicates.

**Root cause / investigation status:** users.email has a plain unique index (ix_users_email). Exact-match lookups at users.py:347, auth.py:141,296,443,460,485 and setup.py:61, while bulk import uses lower() (users.py:765). EmailStr keeps local-part case. Names use func.lower checks over case-sensitive constraints (academics.py:342-346, department_service.py:125). chapters has no unique on (subject_id,title) or (subject_id,position); create_chapter computes max+1 (academics.py:655). tenants.name has no constraint. IntegrityError is caught only in colleges.py, universities.py, mcq attempts and qna turns, so users, departments, academics (add_semester :463-467) and McqDocumentRepository.get_or_create fall through to a 500 on a race.

**Reproduction:** From code: POST /users with Foo@x.com when foo@x.com exists creates a second account; login then requires exact case. Live: 1 duplicate tenant name; 0 duplicate emails case-insensitively; 0 non-lowercase emails.

**Expected:** One account per address and a clean 409 on conflict.

**Actual:** Case-variant accounts are possible, and a concurrent duplicate returns 500.

**Proposed fix:** Lowercase email in the schema; add unique index on lower(email) and functional uniques for names; unique (subject_id, position) deferrable; catch IntegrityError and map to 409.

**Regression test required:** Create with case variant and concurrent duplicate; assert 409.

**Dependencies / blockers:** None

### DATA-017

**Three separate connection pools can exceed max_connections**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance |
| Affected module | app/db, app/voice_qna/db.py |
| Finding status | suspected |
| Duplicates merged | UX-024 |

**Phase 2 remediation (Fixed):** DB_POOL_SIZE 8, DB_MAX_OVERFLOW 12, DB_POOL_TIMEOUT_SECONDS 30, DB_POOL_RECYCLE_SECONDS 1800 in app/config.py, used by both engines: 40 per process, so two API processes stay at 80. The load test the register asks for was NOT run; the budget is asserted from config only.

**Test:** tests/integration/test_platform_limits.py::test_two_api_processes_fit_under_max_connections

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** Three separate connection pools can exceed max_connections.

**Root cause / investigation status:** session.py:5-10, async_session.py:36-42 and voice_qna/db.py:56-64 each use pool_size 10 + max_overflow 20: up to 90 per process. max_connections is 100. Add the voice agent's NullPool connections and pipeline/heartbeat threads. Only voice sets pool_recycle.

**Reproduction:** Read the engine config; 'show max_connections' = 100. Saturation not load-tested. Idle now: 5-20 connections.

**Expected:** Total possible connections stay under the server limit across all instances.

**Actual:** A second API instance (or worker) can exhaust Postgres under load. loadtest/ results were not reviewed.

**Proposed fix:** Share one async engine (same URL), reduce pool sizes, use a budget per process or PgBouncer, and set pool_recycle and pool_timeout consistently.

**Regression test required:** Load test asserting peak pg_stat_activity below the limit.

**Dependencies / blockers:** None

### DATA-018

**Sync database calls run on the event loop in async routes**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance |
| Affected module | edu_video upload / mcq |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Upload is a sync route. MCQ _ensure_student_can_view is async and runs the programme lookup with asyncio.to_thread. It still opens a second connection: moving to the request's AsyncSession needs tests/test_publish_and_access_rules.py changed (patches _program_of_chapter; not mine).

**Test:** tests/edu_video/test_p2_pipeline.py::test_no_blocking_database_work_in_an_async_handler

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Sync database calls run on the event loop in async routes.

**Root cause / investigation status:** async def upload (edu_video/routes.py:407-408) takes a sync Session (line 427) and calls blocking db.query via _resolve_chapter/_validate_department. MCQ async _ensure_student_can_view (mcq/api/routes.py:120-125) calls sync _program_of_chapter, which opens a new SessionLocal per call (edu routes.py:196-205) on student get, submit and report.

**Reproduction:** Read the code paths. Stall duration not measured.

**Expected:** Async handlers use async sessions or to_thread.

**Actual:** Every in-flight request stalls while these queries run. _program_of_chapter also uses a second connection per request.

**Proposed fix:** Make upload a sync route or use the async session; do the programme lookup with the request's AsyncSession.

**Regression test required:** Test forbids sync SessionLocal in async handlers via static check.

**Dependencies / blockers:** None

### FE-003

**Middleware redirects ignore Host and X-Forwarded-Host and point to localhost:3100**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | src/middleware.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** src/middleware.js: every redirect goes through publicUrl(), which uses the first X-Forwarded-Host/Host value (validated as host[:port]) and X-Forwarded-Proto. Relative Location is not possible: Next 14 middleware adapter parses Location with new URL and no base.

**Test:** src/middleware.test.js (10 tests)

**Evidence:** failed before: 10/10 unit tests failed (Location was localhost:3100); passes now: 10/10. Live next start on :3199 with Host/X-Forwarded headers via curl returned https://portal.example.com/student/home and /auth/login. Not checked on the deployed host behind Nginx.

**Description:** Middleware redirects ignore Host and X-Forwarded-Host and point to localhost:3100.

**Root cause / investigation status:** src/middleware.js builds every target with new URL(path, req.url) (lines 47, 57, 60, 62, 67, 69, 88, 90, 96, 98), and req.url carries the server hostname, not the client host. X-Forwarded-Proto was honoured but X-Forwarded-Host was not.

**Reproduction:** 1. curl -D - -H "Host: app.example.com" -H "X-Forwarded-Host: portal.example.com" -H "X-Forwarded-Proto: https" -H "Cookie: pk_session=1; pk_role=student" http://127.0.0.1:3100/admin/dashboard. 2. Read the Location header.

**Expected:** Location on the host the user is on, or a relative Location.

**Actual:** Location: https://localhost:3100/student/home. Reproduced for /, wrong-role URLs and anonymous portal URLs. From 127.0.0.1 this also drops the session cookies, so a wrong-role user lands on the login page. CAVEAT: measured on the temporary build; its start flags were not inspected and production behaviour behind Nginx was not verified (Nginx proxy_redirect may mask it). The Dockerfile uses plain npm run start.

**Proposed fix:** Build redirects from x-forwarded-host/host, or return relative Location headers; verify on the deployed host.

**Regression test required:** Middleware test asserting Location host equals the forwarded host for /, wrong-role and anonymous cases.

**Dependencies / blockers:** A check on the deployed environment is needed to set final severity.

### FE-004

**Desktop alerts can effectively never fire**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | src/hooks/useSystemNotifications.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New src/lib/notifications/inboxPoller.js (pollIsDue, createBadgePoller, showDesktopAlerts); useSystemNotifications keeps polling hidden tabs every 120 s when permission is granted, notifies only as many rows as the count rose (max 3), overlapping polls share one request, click opens inboxItemHref via router.push from SystemNotificationBell.

**Test:** src/lib/notifications/inboxPoller.test.js (10 tests): fires exactly one notification for one new alert while hidden

**Evidence:** failed before: suite could not load (logic did not exist in testable form; defect shown by code trace at useSystemNotifications.js:58,121); passes now. No real OS notification was observed.

**Description:** Desktop alerts can effectively never fire.

**Root cause / investigation status:** The interval tick returns early when the tab is hidden (useSystemNotifications.js:121) while notifyNew returns early when the tab is visible (line 58). When the tab becomes visible again, pollBadge sees the higher count and calls notifyNew, which exits, and lastUnread then advances, so the alert is lost for good.

**Reproduction:** Code trace; not reproduced with a real OS notification. 1. Grant desktop alerts. 2. Hide the tab. 3. Trigger an inbox event. 4. No poll runs while hidden. 5. On return the poll runs but the tab is visible, so no notification.

**Expected:** A desktop alert appears while the tab is in the background.

**Actual:** Only a poll that started visible and resolved after the tab was hidden could notify. The in-UI "Allow desktop alerts" prompt promises something that does not happen. Notification onclick also only focuses the window and does not open the alert deep link.

**Proposed fix:** Keep polling while hidden (a slower cadence is fine) when permission is granted, and navigate to inboxItemHref on click.

**Regression test required:** Unit test with mocked Notification and visibilityState: a count increase while hidden produces exactly one Notification.

**Dependencies / blockers:** None

### FE-006

**Documented type-instead tutor and conversation rename do not exist in the frontend**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Integration |
| Affected module | src/components/student/VoiceQnaPanel.jsx, src/lib/api/voiceQna.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Built, because HANDOFF and docs/knowledge describe both as product and the backend routes exist: voiceQnaApi.chat and rename; VoiceQnaPanel type box (offered on Type instead, call error, or a 15 s slow join; hidden during a joined call) and inline rename (Enter/blur saves, Esc cancels, empty resets).

**Test:** src/lib/api/batch2.test.js::FE-006; browser check with mocked API

**Evidence:** failed before: unit suite could not load; passes now: unit tests plus Browser check on the production build at :3199 with all API calls mocked by Playwright route (fe_verify.cjs), no real data or writes: PASS: typed question posted to /voice_qna/chat; PASS: answer appears in the transcript; PASS: rename sent as PATCH; PASS: list shows the new name; PASS: Esc cancels; PASS: no horizontal scroll at 390

**Description:** Documented type-instead tutor and conversation rename do not exist in the frontend.

**Root cause / investigation status:** The backend has POST /voice_qna/chat and PATCH /voice_qna/conversations/{id} (app/voice_qna/api/simple.py:533 for the PATCH). HANDOFF.md Current line 54, docs/knowledge/api/voice-qna.md:19,27, flows/voice-tutor.md and roles/student.md describe them as product. voiceQnaApi only has start/list/get/remove, VoiceQnaPanel has no text input, and git log --all -S finds neither call in src on any branch.

**Reproduction:** 1. Search src for /chat or a PATCH on conversations: no match. 2. Reading VoiceQnaPanel.jsx:148-170, a blocked microphone stops at "Microphone access is blocked" with no typing option (not driven live).

**Expected:** Students with no mic or a slow tutor can type; conversations can be renamed.

**Actual:** A blocked microphone is a dead end, and the knowledge docs state something untrue.

**Proposed fix:** Build both, or correct HANDOFF and docs/knowledge if the owner dropped them.

**Regression test required:** Component test: mic denied shows the type box, a sent message posts to /voice_qna/chat; rename updates the list.

**Dependencies / blockers:** Owner decision: build or de-document.

### FE-007

**When GET /faculty/me fails, the HOD/Faculty sidebar is empty and the dashboard says Loading your scope forever**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Frontend defect |
| Affected module | FacultySidebar, faculty dashboard, useFacultyScope |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** FacultyAccessGate shows an error with Try again on any non-department failure (Settings and Notifications stay usable); FacultySidebar keeps the base menu when the scope failed; useFacultyScope reload moves all mounted hooks together. New src/components/faculty/facultyNav.js.

**Test:** src/hooks/useFacultyScope.test.js; browser check

**Evidence:** failed before: unit suite could not load, audit screenshot shows the defect; passes now: unit tests plus Browser check on the production build at :3199 with all API calls mocked by Playwright route (fe_verify.cjs), no real data or writes: PASS: dashboard shows the error; PASS: no endless loading line; PASS: sidebar links remain; PASS: no HOD-only links; PASS: Try again recovers

**Description:** When GET /faculty/me fails, the HOD/Faculty sidebar is empty and the dashboard says Loading your scope forever.

**Root cause / investigation status:** FacultySidebar.jsx:126-131 renders nav=[] until scope exists and ignores useFacultyScope().error. faculty/dashboard/page.jsx treats !scope as loading (scopeLine). load() in useFacultyScope.js has no retry, and FacultyAccessGate.jsx only handles the no-department case.

**Reproduction:** 1. Faculty session. 2. Force /api/v1/faculty/me to return 500 (Playwright route). 3. Open /faculty/dashboard. Screenshot E:/b2b_superAdmin_frontend/.playwright-mcp/audit-fe-fail-faculty-me.png.

**Expected:** A visible error with Retry, and navigation still available.

**Actual:** No navigation links at all and a permanent "Loading your scope…". /faculty/staff does show an error; the dashboard does not.

**Proposed fix:** Render a retryable error in the gate on any non-department failure, and show the base nav when scope is unavailable.

**Regression test required:** Playwright: /faculty/me 500 shows an error plus Retry, and sidebar links remain.

**Dependencies / blockers:** None

### FE-008

**useAsyncResource has no stale-response guard, so an older slow response can overwrite a newer one**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | src/hooks/useAsyncResource.js (all list pages) |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** New src/lib/latestRequest.js; useAsyncResource applies only the current request. A silent poll never supersedes a user reload in flight, so a failed poll cannot leave a page blank.

**Test:** src/lib/latestRequest.test.js (6 tests, deferred promises out of order)

**Evidence:** failed before: module missing, the guard did not exist; passes now. The test drives a harness mirroring the hook body, not the hook itself (no DOM test library installed).

**Description:** useAsyncResource has no stale-response guard, so an older slow response can overwrite a newer one.

**Root cause / investigation status:** In useAsyncResource.js reload(), every call resolves into setData with no request id or abort. Filters, search and paging all run through it.

**Reproduction:** Not reproduced live (needs controlled latency). 1. On any list, change filter A then B quickly. 2. Delay the response for A past B. 3. Rows for A display under filter B.

**Expected:** Only the latest request updates state.

**Actual:** By code trace, the last response wins, not the last request. Silent polls race the same way with user reloads.

**Proposed fix:** Track a monotonic request id in a ref and ignore older results; optionally pass an AbortSignal to loaders.

**Regression test required:** Hook unit test with two deferred promises resolved out of order.

**Dependencies / blockers:** None

### INFRA-002

**Next.js 14.2.3 middleware authorisation bypass is reproducible; npm audit reports 1 critical and 6 high**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Security |
| Affected module | Frontend dependencies |
| Finding status | confirmed |
| Duplicates merged | FE-002 |

**Phase 2 remediation (Fixed):** next upgraded to 14.2.35.

**Evidence:** Production build passes; UI smoke tests pass.

**Description:** Next.js 14.2.3 middleware authorisation bypass is reproducible; npm audit reports 1 critical and 6 high.

**Root cause / investigation status:** package.json pins next 14.2.3 (lock agrees). src/middleware.js is the portal route guard, and GHSA-f82v-jwr5-mffw lets x-middleware-subrequest skip it. npm audit --omit=dev: 7 vulnerable packages (next critical; axios, follow-redirects, nanoid, postcss, source-map-js, zod high).

**Reproduction:** 1. GET http://127.0.0.1:3100/superadmin/dashboard with no cookie: 307 to /auth/login. 2. Repeat with header x-middleware-subrequest set to the repeated src/middleware value: HTTP 200.

**Expected:** The middleware cannot be skipped by a client header.

**Actual:** The guard is skipped and the page shell is served. Data remains protected by API authentication, so impact is exposure of portal shells plus the DoS and cache-poisoning advisories, not a data leak. This also makes every guard in src/middleware.js cosmetic.

**Proposed fix:** Upgrade next to 14.2.35 or later (audit's non-major fix), update axios and transitive packages, and strip x-middleware-subrequest at nginx. zod needs a major bump (4.x) and must be assessed separately.

**Regression test required:** CI step running npm audit --omit=dev at a severity threshold, plus a smoke test that the header cannot reach a guarded page.

**Dependencies / blockers:** Regression pass of the frontend after the Next.js patch upgrade.

**Verification:** confirmed: package.json and node_modules both 14.2.3. Live on :3100: /superadmin/dashboard anonymous 307 to login; with x-middleware-subrequest 200 text/html 17809 bytes; /student/home likewise 200. Note: Downgraded by the brief's definitions: only page shells are exposed and every API still needs auth, which matches anon /auth/me 401. Still patch early, since it is cheap and also closes the DoS and cache-poisoning advisories.

### INFRA-007

**No backup, restore or disaster-recovery provision**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | docker-compose.deploy.yml / operations |
| Finding status | suspected |

**Phase 2 remediation (Blocked):** scripts/backup.sh, restore_drill.sh, backup_offsite.sh; backup.yml daily with restore drill and encrypted S3 copy of DB and media; deploy backs up first.

**Test:** tests/integration/test_coverage_deploy_config.py::test_backup_runs_on_a_schedule_with_a_restore_drill

**Evidence:** Rehearsed on a pg15 container: dump written, restored into scratch DB at the head migration, junk dump exits 1, scratch DB dropped. Shellcheck: 1 info. S3 upload and the scheduled workflow have not run.

**Blocked on:** Owner: repo secrets BACKUP_S3_BUCKET, BACKUP_PASSPHRASE, an S3 lifecycle rule, and instance role write access.

**Description:** No backup, restore or disaster-recovery provision.

**Root cause / investigation status:** Postgres and all media live in named volumes on one host (xplains-postgres-data, xplains-media). No pg_dump, snapshot or restore step or document exists in .github, compose, scripts or docs (grep for pg_dump and backup returned nothing).

**Reproduction:** 1. grep -rn 'pg_dump|backup' over .github, docker-compose.deploy.yml, scripts, docs, README.md.

**Expected:** Scheduled, tested, off-host database and media backups with a documented restore.

**Actual:** Nothing in either repo. A host-level cron or EBS snapshot could exist outside the repos, which is why the status is suspected; the absence from the repos is confirmed. Migrations also run at startup with no backup first.

**Proposed fix:** Scheduled encrypted pg_dump plus media sync to S3, retention policy, and a restore drill.

**Regression test required:** Periodic automated restore test into a scratch database.

**Dependencies / blockers:** Access to the production host.

**Verification:** partially: No pg_dump or backup match in .github, compose, scripts, docs or README. Related INFRA-014 and TEST-017 are already Medium. Note: Downgraded: suspected and theoretical from here. Absence in the repos is confirmed; host-level snapshots cannot be seen. Becomes High if the owner confirms none exist, since it is a single host.

### INFRA-008

**nginx configuration is not versioned, so HTTPS and routing cannot be reviewed**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | Edge / reverse proxy |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** deploy/nginx/xplains.conf.example: candidate site config derived from the routes; `nginx -t` passes. Not wired into deploy.

**Test:** nginx -t in nginx:1.27-alpine

**Evidence:** Syntax verified only. It is not the production file.

**Blocked on:** Real config from the host (/etc/nginx). Then replace the candidate and deploy it from the workflow.

**Description:** nginx configuration is not versioned, so HTTPS and routing cannot be reviewed.

**Root cause / investigation status:** No nginx file exists in either repo (searched *.conf, nginx*). The frontend image is built without API_PROXY_TARGET, so next.config.js rewrites() returns [] and production relies wholly on nginx for /api/v1, /edu_video, /voice_qna and /livekit/.

**Reproduction:** 1. Search both repos for nginx config. 2. Read next.config.js and frontend Dockerfile.

**Expected:** Edge configuration lives in version control and is reviewable.

**Actual:** HTTPS, HSTS, client_max_body_size, X-Forwarded-For, timeouts for 50 MB uploads and the /livekit/ WebSocket route are unknown and depend on one server's undocumented state.

**Proposed fix:** Commit the nginx site config and deploy it from the workflow.

**Regression test required:** Config lint plus an external check for TLS and required headers.

**Dependencies / blockers:** Access to the production host.

### INFRA-009

**No security headers on the API or the Next.js app**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Security |
| Affected module | app/main.py, next.config.js |
| Finding status | confirmed |
| Duplicates merged | AUTH-018 |

**Phase 2 remediation (Blocked):** Frontend done: headers() in next.config.js (CSP, nosniff, frame deny, referrer, HSTS, permissions) and poweredByHeader false.

**Test:** scripts/infra.test.mjs next.config.js; e2e/smoke.spec.js CSP check

**Evidence:** failed before: none present. passes now: confirmed on a live production build, x-powered-by gone, no CSP violation on 5 dashboards.

**Blocked on:** app/main.py: add http middleware setting X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, Strict-Transport-Security max-age=31536000 on every response, and an integration test on one API route.

**Description:** No security headers on the API or the Next.js app.

**Root cause / investigation status:** No security header middleware in app/main.py and no headers() in next.config.js.

**Reproduction:** 1. GET http://127.0.0.1:8000/voice_qna/health and http://127.0.0.1:3100/auth/login. 2. Inspect response headers.

**Expected:** CSP, X-Content-Type-Options, frame protection, Referrer-Policy and HSTS are present.

**Actual:** None are present on either service. The frontend also sends x-powered-by: Next.js and the API sends server: uvicorn. nginx may add some, but that is unverified.

**Proposed fix:** Add headers() in next.config.js (with poweredByHeader false) and a small FastAPI middleware, keeping CSP compatible with LiveKit and media URLs.

**Regression test required:** Integration test asserting the headers on one page and one API route.

**Dependencies / blockers:** None

### INFRA-011

**Services bind on all host interfaces; Redis has no password**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Security |
| Affected module | docker-compose.deploy.yml, deploy.yml |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** Postgres 127.0.0.1:5433, Redis --bind 127.0.0.1 with optional --requirepass from REDIS_PASSWORD, uvicorn BIND_HOST default 127.0.0.1, frontend published on 127.0.0.1.

**Test:** tests/integration/test_coverage_deploy_config.py::test_data_stores_stay_on_localhost

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed. Redis rehearsed with compose: healthy with password off and on; unauthenticated ping refused with it on. The workflow itself has not run on GitHub.

**Decision needed:** Risky: nginx must proxy to 127.0.0.1:8100 and :3100 on the same host. If it uses another address, set BIND_HOST and the port mapping before deploying. Set REDIS_PASSWORD secret and put it in REDIS_URL to turn auth on.

**Description:** Services bind on all host interfaces; Redis has no password.

**Root cause / investigation status:** Postgres publishes 5433:5433 on all interfaces. Backend, LiveKit and agents use network_mode: host with uvicorn on 0.0.0.0:8100 (Dockerfile:39). Frontend uses -p 3100:3000. Redis runs on host network with --port only and no requirepass.

**Reproduction:** 1. Read docker-compose.deploy.yml, Dockerfile and frontend deploy.yml.

**Expected:** Only nginx is public; data stores listen on localhost or a private network and require authentication.

**Actual:** Exposure depends on the EC2 security group, which was not inspected, hence suspected. Redis protected mode limits remote access but any local process, including the unrelated project_k stack on the same host, can read and write it. Direct access to 8100 and 3100 also bypasses nginx.

**Proposed fix:** Publish 127.0.0.1:5433:5433, bind Redis to 127.0.0.1 with a password, and bind uvicorn and the frontend to localhost.

**Regression test required:** External port scan in the go-live checklist; only 80, 443 and LiveKit media ports open.

**Dependencies / blockers:** Security group access.

### INFRA-012

**Containers run as root**

| Field | Value |
|---|---|
| Status | In Progress |
| Severity | Medium |
| Category | Security |
| Affected module | Dockerfile (both repos) |
| Finding status | confirmed |

**Phase 2 remediation (In Progress):** Backend USER app (uid 10001), frontend USER node; media-init one-shot compose service re-owns xplains-media; .next owned by node.

**Test:** tests/integration/test_coverage_deploy_config.py::test_image_runs_unprivileged; scripts/infra.test.mjs frontend image

**Evidence:** failed before: no USER. passes now, and on a real local backend image build: uid 10001, /app and media writable, root-owned volume writable after media-init. The frontend image was NOT built here: docker build hit npm ETIMEDOUT twice (network). npm ci on node:22-alpine with the current lock passed separately; USER node is checked statically only.

**Description:** Containers run as root.

**Root cause / investigation status:** Neither Dockerfile has a USER directive. Backend and agents also run with host networking while parsing uploaded documents.

**Reproduction:** 1. Read both Dockerfiles.

**Expected:** Application processes run as an unprivileged user.

**Actual:** A parser exploit in PyMuPDF, python-docx or python-pptx runs as root in a container on the host network.

**Proposed fix:** Add a non-root user and chown only media paths; for node use the built-in node user.

**Regression test required:** Image check that the configured user is not root.

**Dependencies / blockers:** Volume ownership migration for xplains-media.

### INFRA-013

**No resource limits, app healthchecks or log rotation in production compose**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | docker-compose.deploy.yml |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** mem_limit, cpus, rotated json-file logging on every service, health checks on backend and agent (LiveKit checked from the host in deploy). Frontend docker run has --memory and log options, image HEALTHCHECK. Limits are env-overridable.

**Test:** tests/integration/test_coverage_deploy_config.py::test_every_long_running_service_has_limits_rotation_and_health

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed. Limits are estimates: host size was not available.

**Decision needed:** Confirm limits against the real host size (backend 6g, agent 3g, postgres 2g, livekit 2g, redis 256m, frontend 1g).

**Description:** No resource limits, app healthchecks or log rotation in production compose.

**Root cause / investigation status:** No mem_limit, cpus or logging options on any service. Only postgres and redis have healthchecks. backend, agent, interview-agent, livekit and egress have none, and the frontend docker run has none. The host is shared with project_k.

**Reproduction:** 1. Read docker-compose.deploy.yml and frontend deploy.yml.

**Expected:** A runaway render cannot starve the database, a hung worker is detected, and logs cannot fill the disk.

**Actual:** A video render, or egress Chrome at its documented ~4 vCPU, can starve Postgres and the other stack. The default json-file driver grows without bound. A hung backend stays 'running'.

**Proposed fix:** Set limits per service, add healthchecks, and set json-file max-size and max-file.

**Regression test required:** docker compose config assertion in CI.

**Dependencies / blockers:** Host sizing data.

### INFRA-014

**Migrations run in the backend container CMD without backup or failure handling**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | Dockerfile:39 |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Dockerfile CMD no longer migrates. deploy.yml: start data stores, back up, one-shot `compose run backend alembic upgrade head`, then switch. docker-compose.yml api keeps its own migrate command for local use.

**Test:** tests/integration/test_coverage_deploy_config.py::test_backup_then_migrate_then_switch

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed The workflow itself has not run on GitHub.

**Description:** Migrations run in the backend container CMD without backup or failure handling.

**Root cause / investigation status:** CMD runs 'alembic upgrade head && uvicorn ...' under restart: unless-stopped.

**Reproduction:** 1. Read Dockerfile and docker-compose.deploy.yml.

**Expected:** Migrations are a separate deploy step with a backup first and a clear stop on failure.

**Actual:** A failed migration crash-loops the API and the deploy only reports after 120 s. The old container is already gone and rollback of a partly applied migration is manual. agent and interview-agent can start against an unmigrated schema.

**Proposed fix:** Run a one-shot migrate step before replacing containers, preceded by a backup.

**Regression test required:** Deploy rehearsal with a deliberately failing migration on staging.

**Dependencies / blockers:** Backup finding.

### INFRA-015

**Removed interview stack still deployed and it can fail a deploy**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | docker-compose.deploy.yml, deploy.yml |
| Finding status | confirmed |
| Duplicates merged | TEST-018 |

**Phase 2 remediation (Fixed):** Removed interview-agent and egress services, docker/egress.yaml, the worker gate and interview env from deploy files and local compose. LiveKit redis block removed with egress.

**Test:** tests/integration/test_coverage_deploy_config.py::test_no_interview_services_or_gate

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed The workflow itself has not run on GitHub. --remove-orphans deletes the old containers on the next deploy.

**Description:** Removed interview stack still deployed and it can fail a deploy.

**Root cause / investigation status:** interview-agent and egress services remain, deploy.yml's 'Wait for workers' step exits 1 unless xplains-interview-agent logs b2b-interview, and it still writes DEEPGRAM_API_KEY, MUSETALK_URL and recording settings. INTERVIEWS_ENABLED defaults False (owner removed the module on 20 Oct 2026).

**Reproduction:** 1. Read both files. 2. Locally, ps in WSL shows no interview agent running, so no stale process was found on this machine; the server could not be checked.

**Expected:** No worker or deploy gate exists for a removed product.

**Actual:** A paid or memory-heavy worker and a Chrome egress service idle in production, and a fault in dead code can block every release.

**Proposed fix:** Remove both services and the gate, or put them behind a compose profile.

**Regression test required:** Deploy workflow passes with no interview worker.

**Dependencies / blockers:** None

### INFRA-016

**No upload throttling, usage metering or spend cap on paid AI work**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Integration |
| Affected module | edu_video routes, voice tutor |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Nothing changed: app code.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** None yet

**Evidence:** Not started.

**Decision needed:** What daily and monthly quotas per user and per college, and what spend ceiling?

**Blocked on:** After the decision: slowapi limits on /edu_video upload, submit, regenerate; a tutor allowance; a max call length; usage rows (app/).

**Description:** No upload throttling, usage metering or spend cap on paid AI work.

**Root cause / investigation status:** slowapi limits appear only in app/api/v1/auth.py, app/mcq/api/routes.py and app/voice_qna/api/simple.py. POST /edu_video/upload (routes.py:407), /submit (1161) and /regenerate (1370) have none. No code reads LLM usage or records cost. Voice limits are per minute (10 starts, 20 chats per user, simple.py:208,234) with no daily cap, and no maximum call length was found (only idle hang-up).

**Reproduction:** 1. grep limiter.limit across app. 2. grep usage and cost in app/edu_video/llm.

**Expected:** Per-role and per-college quotas, a monthly spend ceiling, and metering visible to the Super Admin.

**Actual:** A single staff account, or a looping client, can run unlimited gpt-4o planning, image generation and Sarvam narration. A student can hold a paid voice session indefinitely by continuing to speak or repeat short calls. Spend is visible only on provider bills.

**Proposed fix:** Add per-user and per-college limits on upload, submit, regenerate; a daily tutor allowance; a maximum call length; token and cost logging per tenant.

**Regression test required:** Exceeding each limit returns 429; usage rows written per job.

**Dependencies / blockers:** Owner decision on quotas.

### INFRA-018

**Upload validation checks only extension; no parser limits; oversize files are read fully first**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Security |
| Affected module | app/edu_video/routes.py, document_merger.py, extractor.py |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Nothing changed: app code.

**Test:** None yet

**Evidence:** Not started.

**Blocked on:** app/edu_video/routes.py:511-536: read in chunks with a byte cap, check magic bytes. extractor.py, document_merger.py: cap pages, slides and zip expansion. Move parsing to the pipeline worker. Tests with a mislabelled file, zip bomb, huge PDF.

**Description:** Upload validation checks only extension; no parser limits; oversize files are read fully first.

**Root cause / investigation status:** routes.py:511-536 checks the filename extension, then calls await upload_file.read() before comparing size. No magic-byte check. No page, slide or decompressed-size limit in extractor.py or document_merger.py. merge_documents and read_text run in the API process threadpool, and _ingest_into_voice_qna runs as an API background task.

**Reproduction:** 1. Read the code. Not exercised, since no state-changing requests are permitted.

**Expected:** Content sniffing, a streaming size cut-off, and page and decompression limits, with parsing isolated from the API process.

**Actual:** A staff account can feed a zip bomb .docx or .pptx or a huge-page PDF and exhaust memory or CPU in the API process. Path traversal is correctly handled by the uuid4 filename, and bad files reach only the owner's job.

**Proposed fix:** Stream with a byte cap, check magic bytes, cap pages, slides and zip expansion, and parse only in the pipeline worker with limits.

**Regression test required:** Fixtures: mislabelled file, zip bomb, 10,000-page PDF are all rejected quickly.

**Dependencies / blockers:** None

### INFRA-019

**LLM clients in the video pipeline use the SDK default 10-minute timeout**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Integration |
| Affected module | app/edu_video/llm |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Nothing changed: app code.

**Test:** None yet

**Evidence:** Not started.

**Blocked on:** app/edu_video/llm/client.py:22,111,130, openai_json_client.py:60, image_client.py:65: pass an explicit timeout to each constructor, plus a stalled-server unit test.

**Description:** LLM clients in the video pipeline use the SDK default 10-minute timeout.

**Root cause / investigation status:** No timeout passed at client.py:22 (Groq), 111, 130, openai_json_client.py:60, image_client.py:65. The MCQ client (openai_service.py:133) and tutor (text_chat_service.py, timeout=20) do set one, and the MCQ code's own comment names this risk.

**Reproduction:** 1. Read the client constructors.

**Expected:** Every provider call has an explicit timeout.

**Actual:** PIPELINE_WORKERS defaults to 1, so one hung call can hold the queue for many minutes, multiplied by retries.

**Proposed fix:** Pass explicit timeouts per call type.

**Regression test required:** Unit test with a stalled fake server.

**Dependencies / blockers:** None

### INFRA-020

**Sarvam is a single point of failure with no credit or key alert**

| Field | Value |
|---|---|
| Status | Accepted |
| Severity | Medium |
| Category | Integration |
| Affected module | voice tutor, narrator |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Nothing changed: app code.

**Owner decision (3 Nov 2026):** accepted as is per [OWNER_DECISIONS.md](OWNER_DECISIONS.md).

**Test:** None yet

**Evidence:** Not started.

**Decision needed:** Keep Sarvam-only, or allow a fallback? Should Super Admin see a key and balance check?

**Blocked on:** Then a provider health check in app/.

**Description:** Sarvam is a single point of failure with no credit or key alert.

**Root cause / investigation status:** qna_agent.py:435 and narrator.py are Sarvam-only by design. On exhausted credit the tutor leaves the room. narrator.py:126 fails when the key is absent. Project notes record a key without credits on 26 Oct 2026; current balance not checked.

**Reproduction:** 1. Read qna_agent.py and narrator.py.

**Expected:** Operators are warned before credit runs out and users get a clear message.

**Actual:** Nothing warns ahead of time. Both the tutor and every video export stop together. Edge-tts and Piper remain pinned but unused.

**Proposed fix:** Add a Super Admin health check for provider key and balance; decide on an optional fallback.

**Regression test required:** Health page test with a simulated provider 402.

**Dependencies / blockers:** Owner decision: the no-fallback rule is deliberate.

### INFRA-021

**Monitoring is in-app only: no external alerting or error tracking**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | app/services/ops_monitor.py |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Added uptime.yml: GitHub-hosted check of /auth/login and /voice_qna/health every 30 minutes; a failure e-mails via GitHub.

**Test:** tests/integration/test_coverage_deploy_config.py::test_external_uptime_check_is_scheduled

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed The workflow itself has not run on GitHub.

**Decision needed:** Which error tracker and pager (Sentry, Slack, other)? 30-minute checks use about 1,440 Actions minutes a month.

**Blocked on:** Disk and queue alerts need that decision and a dependency in app.

**Description:** Monitoring is in-app only: no external alerting or error tracking.

**Root cause / investigation status:** No Sentry, Prometheus, Datadog or CloudWatch reference in app or requirements. Errors go to the app's own database, viewable on the Super Admin page. If the API or database is down, the monitor is down with it. /voice_qna/health checks Postgres only, and it is all the deploy tests.

**Reproduction:** 1. grep for those names. 2. Read app/voice_qna/api/health.py.

**Expected:** An outage alerts a person from outside the system.

**Actual:** Downtime is discovered by users.

**Proposed fix:** Add an external uptime check, error tracking, and disk and queue alerts.

**Regression test required:** Alert drill on staging.

**Dependencies / blockers:** None

### INFRA-022

**No DPDP-style consent, retention or erasure for personal data**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Medium |
| Category | Security |
| Affected module | Whole product |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Nothing changed.

**Test:** None yet

**Evidence:** Needs legal input.

**Decision needed:** Retention period per data type, erasure rules and privacy notice wording, with counsel.

**Blocked on:** Then export and erasure routes in app/, stop logging student text at qna_agent.py:303.

**Description:** No DPDP-style consent, retention or erasure for personal data.

**Root cause / investigation status:** grep for consent, retention, privacy, dpdp in the app, docs and frontend finds no relevant feature. app/api/v1/users.py has no delete route. Student tutor transcripts are stored indefinitely and sent to OpenAI and Sarvam. Old resumes and recordings stay on disk. qna_agent.py:303 logs student text.

**Reproduction:** 1. grep as above. 2. Read users.py routes.

**Expected:** Notice and consent, a named retention period, erasure on request, and a list of sub-processors with cross-border transfer noted.

**Actual:** None of these exist in the product. This is an engineering observation, not legal advice, and whether the Act applies in a given way needs counsel.

**Proposed fix:** Define retention per data type, add export and erasure, add a privacy notice, and stop logging student text.

**Regression test required:** Erasure test across users, transcripts, attempts and files.

**Dependencies / blockers:** Legal and owner input.

### INFRA-023

**Debug mode has no production guard and exposes reset links and provider errors**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | app/config.py, notification_service.py |
| Finding status | suspected |

**Phase 2 remediation (Blocked):** deploy.yml writes the literal DEBUG=false instead of a secret, so production cannot turn it on from secrets.

**Test:** tests/integration/test_coverage_deploy_config.py::test_deploy_fixes_debug_off_and_leaves_no_test_redirect

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed

**Blocked on:** app/config.py: model_validator raising when ENVIRONMENT=production and DEBUG true; app/services/notification_service.py:501,559 stop logging bodies; plus a Settings test.

**Description:** Debug mode has no production guard and exposes reset links and provider errors.

**Root cause / investigation status:** DEBUG comes from a GitHub secret with no validator. With it on, notification_service.py:501-502 logs full e-mail bodies, which hold activation and reset links, and :559 logs WhatsApp bodies. app/mcq/exceptions.py:32 and app/voice_qna/exceptions.py:22 return provider error text to clients. Local .env has DEBUG=True.

**Reproduction:** 1. Read those lines. 2. Production value could not be read, hence suspected.

**Expected:** DEBUG cannot be true in production.

**Actual:** With the log provider (the deploy default, see the e-mail finding) plus DEBUG on, live reset tokens land in container logs.

**Proposed fix:** Reject DEBUG=true when ENVIRONMENT=production; never log bodies.

**Regression test required:** Settings test.

**Dependencies / blockers:** None

### INFRA-025

**Hardcoded test IP over plain HTTP, stale domains, unused build argument**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | src/lib/apiConfig.js, src/lib/livekitUrl.js, next.config.js |
| Finding status | confirmed |
| Duplicates merged | AUTH-024, TEST-019 |

**Phase 2 remediation (Blocked):** Removed the IP image pattern and stale comment from next.config.js; dropped NEXT_PUBLIC_API_BASE_URL from Dockerfile and deploy.yml.

**Test:** scripts/infra.test.mjs next.config and frontend image tests

**Evidence:** failed before: IP pattern and build arg present. passes now.

**Blocked on:** src/lib/apiConfig.js:2-15 and src/lib/livekitUrl.js:4-7: drop the 13.234.197.68 branch and talenteur.co.in, read env. Then add a raw-IP grep over src to scripts/infra.test.mjs.

**Description:** Hardcoded test IP over plain HTTP, stale domains, unused build argument.

**Root cause / investigation status:** apiConfig.js:2-3 hardcodes 13.234.197.68 with http://...:8000. livekitUrl.js:4 uses ws:// on that IP and :7 talenteur.co.in, while deploy uses xplains.quirri.ai and port 8100. next.config.js allows http image loading from that IP. NEXT_PUBLIC_API_BASE_URL is passed by Dockerfile:10 and deploy.yml but read nowhere in src.

**Reproduction:** 1. grep the IP, domain and variable in src.

**Expected:** One configured origin over HTTPS.

**Actual:** Using the IP sends credentials and cookies in cleartext to a port that the current deploy does not use. The build argument has no effect, which misleads anyone configuring a deployment.

**Proposed fix:** Replace with environment configuration; drop the IP branch, the remote pattern and the unused argument.

**Regression test required:** grep check in CI for the raw IP.

**Dependencies / blockers:** None

### INFRA-026

**No TURN or TLS fallback for voice on restricted college networks**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Integration |
| Affected module | livekit.prod.yaml (generated in deploy.yml) |
| Finding status | suspected |

**Phase 2 remediation (Blocked):** Nothing changed: the voice config needs host facts.

**Test:** Connection test with UDP blocked

**Evidence:** Not started.

**Blocked on:** A TLS certificate and free port 443 path for LiveKit TURN, and a college network to test from.

**Description:** No TURN or TLS fallback for voice on restricted college networks.

**Root cause / investigation status:** Generated config has rtc tcp_port 7883 and UDP 51000-51100, with no turn: block or 443/TLS transport.

**Reproduction:** 1. Read the 'Write livekit config' step. Not tested from a restricted network.

**Expected:** The tutor connects from networks that block UDP and high ports.

**Actual:** Campus firewalls commonly allow only 80 and 443, so students there may fail to connect. Impact unverified.

**Proposed fix:** Enable LiveKit embedded TURN on 443 with TLS, and test from a college network.

**Regression test required:** Connection test with UDP blocked.

**Dependencies / blockers:** TLS certificate and port availability.

### PIPE-001

**Every Tamil word on a slide is drawn as question marks in the deployed image**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Functional bug |
| Affected module | edu_video / slide rendering |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** No Tamil font is available here (no Noto Tamil in WSL or the venv) and svglib does not shape Tamil, so slides still draw '?'. Done: the job is no longer silent: plan.quality.undrawable_slides lists affected slides, svg_renderer.has_undrawable_text. Pillow here has raqm, so a PIL text path can shape once a font exists.

**Test:** tests/edu_video/test_p2_pipeline.py::test_tamil_the_font_cannot_draw_is_reported_not_silent

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Decision needed:** Tamil jobs now warn. Should they fail before paying for narration until the font ships?

**Blocked on:** Dockerfile (infra): add fonts-noto-core, or commit NotoSansTamil-*.ttf (my downloading a font needs your approval). Then: draw non-Latin text through PIL + raqm or Pango and composite it, since svglib cannot shape Tamil. Same dependency for BACKEND-026.

**Description:** Every Tamil word on a slide is drawn as question marks in the deployed image.

**Root cause / investigation status:** Dockerfile:24 installs only fonts-dejavu-core, which has no Tamil glyphs. app/edu_video/stages/svg_renderer.py:245-254 sanitize_text replaces each character missing from the font's cmap with '?'. _font_candidates (161-169) has no Tamil font. The same fonts serve image_slide_renderer, visualizer._render_title_card and the avatar label; chart_renderer and diagram3d use matplotlib's default font, which also lacks Tamil (that part suspected). A Tamil job's planner writes Tamil text (scripter.py:268) and Tamil documents are accepted (document_merger.py docstring). The local database has 0 Tamil jobs, so this has never been seen in use.

**Reproduction:** 1. In WSL run sr.sanitize_text on a Tamil string: returns only '?' and spaces.
2. Render a recap Scene with Tamil title and points through svg_renderer.render_scene.
3. See audit/tamil.png: heading, bullets and footer are all question marks.

**Expected:** Tamil slides show readable Tamil, correctly shaped.

**Actual:** Tamil narration plays over slides full of question marks. The job finishes DONE with no warning.

**Proposed fix:** Bundle a Tamil font such as Noto Sans Tamil in the image, add it as a per-character fallback for measuring and drawing, and use a renderer with complex-script shaping (svglib/reportlab and basic PIL do not shape Tamil; check raqm or a Cairo/Pango path, libpango is already in the image). Until then, fail or warn a Tamil job instead of drawing '?'.

**Regression test required:** Render a Tamil slide in the container image, assert sanitize_text keeps the text, and compare the PNG with a known-good reference. Cover charts and the fallback card.

**Dependencies / blockers:** None. Blocks a Tamil launch. PIPE-002 has the same font split.

**Verification:** confirmed: Dockerfile installs only fonts-dejavu-core. Live in WSL: sr.sanitize_text on Tamil text returned only '?' and a space. routes.py:462 accepts language tamil. No Tamil font in WSL by fc-list. Local DB: 13 english jobs, 0 tamil. Note: Downgraded from High: reproducible but theoretical so far, with no Tamil job ever produced locally and production unknown. Raise to High if Tamil chapters are a launch commitment.

### PIPE-002

**Math and science symbols become empty boxes on Linux because text is measured in one font and drawn in another**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | edu_video / slide rendering |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Slides use the DejaVu files that ship with matplotlib on every machine: svg_renderer._font_candidates and register_slide_fonts, svg_theme FONT_FAMILY stacks. Measure, glyph check and draw now use one font. The old test was made host-independent (fake cmap) with its assertion unchanged.

**Test:** tests/edu_video/test_p2_pipeline.py::test_symbols_are_measured_and_drawn_in_one_font, ::test_slide_fonts_ship_with_the_code_on_every_machine, ::test_a_symbol_slide_has_ink_where_the_box_used_to_be, tests/edu_video/test_production_fixes.py::test_math_symbols_the_font_lacks_are_replaced_by_words_not_question_marks

**Evidence:** failed before: baseline failure in that last test; passes now

**Description:** Math and science symbols become empty boxes on Linux because text is measured in one font and drawn in another.

**Root cause / investigation status:** svg_renderer checks glyphs and widths against DejaVuSans (172-189, 221-242), but svg_theme.py:61 asks for Arial, 'Segoe UI', sans-serif. None of these is registered in the image, so svglib falls back to Helvetica (svglib/fonts.py:471), a Latin-1 base font. DejaVu has the symbol, so _SYMBOL_FALLBACK is skipped, then Helvetica cannot draw it. All SVG layouts are affected. Windows development with real Arial hides it. tests/edu_video/test_production_fixes.py is the failing test that shows this.

**Reproduction:** 1. In WSL render a recap Scene with text 'x ∈ ℝ'.
2. See audit/latin.png: the title shows empty boxes and the bullet a solid block.
3. sanitize_text returns the text unchanged with DejaVu, and 'x in R, for all y' with Arial.

**Expected:** A symbol is drawn, or replaced by its word.

**Actual:** Formulas in the deployed video lose symbols and show boxes, with no error.

**Proposed fix:** Register DejaVu with svglib (register_font) and name it in FONT_FAMILY, so the measuring and drawing fonts match, or rasterise with a single engine. Keep one font list for sanitize, measure and draw.

**Regression test required:** Run in a Linux image: render the _SYMBOL_FALLBACK characters and assert no .notdef box. Keep the existing test but make it independent of host fonts.

**Dependencies / blockers:** Same fix area as PIPE-001.

### PIPE-003

**Tamil video of an English document: coverage logic sees nothing covered, drops illustrations and can lose whole chapters**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | edu_video / coverage, scripter |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** coverage.same_language; scripter._complete_chapter skips word-overlap passes, illustration dropping and top-ups when document and video languages differ, and the chapter is recorded in quality.coverage_unchecked_chapters. A chapter lost to a planner failure is recorded in quality.dropped_chapters.

**Test:** tests/edu_video/test_p2_pipeline.py::test_a_tamil_video_of_an_english_chapter_pays_for_no_fix_pass_and_keeps_its_picture, ::test_a_chapter_lost_to_a_planner_failure_is_recorded

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Tamil video of an English document: coverage logic sees nothing covered, drops illustrations and can lose whole chapters.

**Root cause / investigation status:** coverage.py compares word stems of the English source with the slide and narration text (scene_stems 157, missing_units 168, coverage_ratio 178) with no translation. Tamil scenes never match. Effects: (a) scripter._complete_chapter:304-324 pays for extra planner and verifier passes asking for statements already taught, and merges the new slides in; (b) drop_invented_illustrations:492 removes every Tamil illustration slide with its narration; (c) verbatim_scenes:408 returns [] when language and script differ, so scripter._plan_chapter:500-503 returns no scenes after a planner failure, and the chapter vanishes although the comment at 498 says it must not; (d) mark_exam_scenes finds no overlap with an English question bank, so exam badges are lost.

**Reproduction:** pipe_probe.py results with a Tamil scene over English units: coverage_ratio 0.0, all 3 units missing, verbatim_scenes returns [], Tamil illustration kept 0 of 1 at threshold 0.35.

**Expected:** Coverage is measured across languages, or switched off with a clear note, and no chapter or picture is lost silently.

**Actual:** More cost, repeated slides (suspected, needs a real run), no pictures, and silent chapter loss on planner failure.

**Proposed fix:** When document and video languages differ, skip the word-overlap checks or compare against a translated source. On planner failure with no verbatim fallback, fail the job or record the missing chapter.

**Regression test required:** English chapter plus language=tamil with a stub planner: assert fix-pass count, illustration retention and failure behaviour.

**Dependencies / blockers:** PIPE-004 for recording the loss. INFRA-016 for cost.

### PIPE-004

**A degraded plan looks the same as a good one: outages produce raw-sentence or unverified videos marked DONE**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Backend defect |
| Affected module | edu_video / planning |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Frontend half. New src/lib/planQuality.js turns plan.quality and plan.truncated (returned by GET /jobs/{id}/plan) into plain sentences; scene ids become the slide numbers the reviewer sees. EduVideoPlanEditor.jsx shows a warning note 'Check this plan before you approve it' for College Admin and reviewer. Nothing shows for a clean plan or an older plan without these fields. Not added: plan_quality from GET /status/{id} is not shown on the video preview, so the note appears only when the plan editor is opened.

**Test:** src/lib/planQuality.test.js (6 tests)

**Evidence:** failed before: module missing; passes now: full vitest 283/283. The note's rendering was not checked in a browser; the build compiles it.

**Decision needed:** Carried from the pipeline agent: fail a job when most chapters are degraded, before paying for narration? Not done, because a single-chapter job on the verbatim fallback is an intended path today.

**Description:** A degraded plan looks the same as a good one: outages produce raw-sentence or unverified videos marked DONE.

**Root cause / investigation status:** scripter._plan_chapter:497-503 swaps a failed chapter for verbatim sentences. verifier.py:78-83 returns scenes unverified on any failure. generate_illustrations:647 leaves a placeholder. In each case the job continues to DONE and only a log line exists; LessonPlan and EduVideoJob have no quality field. With OpenAI down for planning, every chapter can become plain recap slides and paid narration still runs. Schema comment at schemas.py:317-320 promises a review-screen banner for truncated, but no file under the frontend src mentions truncated.

**Reproduction:** 1. Read the paths above.
2. With the planner stubbed to raise OpenAIPlanningError, the plan is verbatim scenes and the job proceeds.
3. grep -il truncated over frontend src returns nothing.

**Expected:** Reviewers can see which chapters were not planned or not fact-checked, and that a video was cut at the length cap.

**Actual:** HOD reviews without knowing. Only a closing truncation slide exists, and that slide is in English.

**Proposed fix:** Add per-chapter quality flags to LessonPlan (planned, verified, illustrations_missing, dropped_chapters) and show them on the review screen. Consider failing the job when most chapters are degraded, before paying for narration.

**Regression test required:** Stub planner and verifier failures, assert flags in plan_json and the API response.

**Dependencies / blockers:** Frontend review screen. PIPE-005.

### PIPE-005

**Slide render failures are invisible and the retry loop never runs for them**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Backend defect |
| Affected module | edu_video / visual_renderer, pipeline |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** visual_renderer.render_scene raises, so the retry loop runs and FAILED is recorded; render_scene_or_card keeps the review preview working. pipeline._render_scenes refuses to build a video when a slide fell back, naming the slides (no silent card reaches students).

**Test:** tests/edu_video/test_p2_pipeline.py::test_a_render_failure_reaches_the_retry_loop, ::test_a_slide_that_keeps_failing_is_retried_recorded_and_fails_the_video, ::test_the_preview_still_gets_a_card

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Slide render failures are invisible and the retry loop never runs for them.

**Root cause / investigation status:** visual_renderer._render_scene_asset:53-56 catches every exception and returns a title card of the raw narration. So pipeline._render_one_scene:103-121 sees success, marks the scene COMPLETED and never retries, despite the 'failed scene retries in isolation' comment at pipeline.py:40-43. failed_scenes stays 0. For other non-narration errors the fallback at pipeline.py:140-146 is a 2-second silent card: the narration is not spoken, yet the export continues unless every scene failed (201-206). Send-to-HOD and publish do not look at scene status. The local DB shows 109 COMPLETED and 0 FAILED scenes, consistent with this but not proof.

**Reproduction:** 1. Make render_svg_scene raise for one scene.
2. Render: scene ends COMPLETED, its slide is a wall of narration text, and retry_count is 0.

**Expected:** Retry, record FAILED, and tell the reviewer which slide is a fallback.

**Actual:** The bad slide can reach students with no signal. A silent card drops that slide's teaching entirely.

**Proposed fix:** Re-raise from the asset renderer so the retry loop works, return a fallback flag only after retries, show failed slides in the review UI, and fail the video when a silent fallback would be used.

**Regression test required:** Inject a render failure, assert retry_count, FAILED status and the job-level signal.

**Dependencies / blockers:** PIPE-004.

### PIPE-006

**One hung or long job stops all video generation for every college**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance |
| Affected module | edu_video / pipeline_executor, job_recovery |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Done: JOB_MAX_RUNTIME_SECONDS (env, default 3 h) enforced by the worker's heartbeat: FAILED, helper processes killed, worker exits; the executor drops the broken pool and rebuilds it rather than rendering in the API; scene threads bounded (SCENE_WORKERS, max 8). A real latent bug fixed too: the except clause referenced concurrent.futures.process without importing it. Not done: fairness between colleges.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** tests/edu_video/test_p2_pipeline.py::test_a_job_past_its_limit_is_stopped, ::test_stopping_a_job_marks_it_failed_and_spares_the_api_process, ::test_a_broken_pool_is_rebuilt_not_replaced_by_a_thread, ::test_a_worker_that_died_drops_the_pool, ::test_scene_threads_are_bounded. No real hung ffmpeg was run.

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Decision needed:** Fairness: a per-college limit or round-robin queue needs a scheduler in place of the FIFO pool. Is 3 hours the right limit, and is PIPELINE_WORKERS=1 still right? When a worker is stopped, queued jobs lose their pool slot and come back through recovery.

**Description:** One hung or long job stops all video generation for every college.

**Root cause / investigation status:** PIPELINE_WORKERS defaults to 1 (config.py:250), so jobs run FIFO across tenants. job_recovery.Heartbeat runs in a separate thread and refreshes updated_at while the worker is alive (62-83), so a stuck ffmpeg (renderer.py:732, no timeout), LLM call (INFRA-019) or parser is seen as healthy forever. Recovery only sees dead workers. No job has a deadline, and queued jobs also heartbeat from the parent (pipeline_executor.py:117-128), so they never fail either. Related: ThreadPoolExecutor() at pipeline.py:163 has no configured bound for CPU-heavy scenes, and after a worker dies hard the first submit raises BrokenProcessPool and that job runs in a thread inside the API process (148-155), which is the starvation this module exists to avoid. Hang itself was not reproduced.

**Reproduction:** 1. Read the heartbeat and submit paths.
2. Hanging one call in run_export would keep status RENDERING and updated_at fresh, and the next upload stays PENDING.

**Expected:** A wall-clock limit per job, progress-based staleness, and fairness between colleges.

**Actual:** No limit. One college's long documents delay all others; a hang needs a manual restart.

**Proposed fix:** Add JOB_MAX_RUNTIME enforced from the parent (kill the worker), base stale detection on scene or stage progress, set per-tenant concurrency or queue fairness, bound scene threads, and rebuild the pool rather than falling back to a thread.

**Regression test required:** Fake job that sleeps past the limit is failed and the next job runs. Two tenants' jobs are interleaved.

**Dependencies / blockers:** INFRA-019, INFRA-016, INFRA-013.

### PIPE-007

**Long .docx, .txt and merged documents are not chunked, and structuring output is not validated**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Backend defect |
| Affected module | edu_video / structurer |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/edu_video/stages/structurer.py: _split_page cuts long pages at paragraphs then by length; _parse_chunk validates with Pydantic; a malformed answer is retried with feedback and then fails clearly.

**Test:** tests/edu_video/test_p2_pipeline.py::test_one_long_page_becomes_many_chunks, ::test_paragraphs_are_kept_together, ::test_a_malformed_answer_is_retried_with_feedback_then_fails_clearly

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Long .docx, .txt and merged documents are not chunked, and structuring output is not validated.

**Root cause / investigation status:** extractor returns one page for .docx and .txt (45-53), and a merge without a PDF is .txt. structurer._chunk_pages:52-66 splits only between pages, so a whole book goes in one llm_generate call with 16000 output tokens, despite the comment at 42-47 that chunking guarantees no page goes missing. A cut-off response is invalid JSON; after 3 paid attempts (77-99) the job fails. No Pydantic schema guards the result: a JSON list breaks results[0].get / r.get (257-258). Exact document size at which it fails was not measured because that needs paid calls.

**Reproduction:** pipe_probe.py: _chunk_pages([{page:1,text:'x'*60000}]) returns 1 chunk.

**Expected:** Any document length is chunked, as for PDFs.

**Actual:** Long non-PDF chapters fail after paying three times, or lose detail.

**Proposed fix:** Split oversized pages at paragraph boundaries inside _chunk_pages, and validate each chunk with a schema (openai_generate_json or Pydantic) with feedback on failure.

**Regression test required:** 60000-character single page gives many chunks. Malformed LLM shapes give a clear failure.

**Dependencies / blockers:** None.

### PIPE-008

**Fact-check covers spoken narration only: slide text and chart numbers are never checked, and a removed claim stays on the slide**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Backend defect |
| Affected module | edu_video / verifier, scripter prompt |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/edu_video/stages/verifier.py: slide text goes to the checker, flagged items come off (a list is never emptied; the rest go to quality.unsupported_slide_text); chart numbers are checked in code; token cap 16000. Planner prompt no longer says to add what you know.

**Test:** tests/edu_video/test_p2_pipeline.py::test_slide_text_goes_to_the_checker_and_a_flagged_point_comes_off, ::test_a_list_is_never_emptied_and_the_reviewer_is_told, ::test_a_chart_number_absent_from_the_source_is_flagged, ::test_the_prompt_no_longer_asks_for_outside_knowledge

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Fact-check covers spoken narration only: slide text and chart numbers are never checked, and a removed claim stays on the slide.

**Root cause / investigation status:** verifier.py:61-67 sends only scene.narration and rewrites only narration (101-102). visual.points, cards, chart_values, table_rows and quiz answers are not sent. A statement removed from speech stays on screen. drop_invented_illustrations judges only illustrations. The planner prompt also conflicts with itself: rule 1 forbids outside knowledge (scripter.py:53) while lines 232-233 say to add the other side you know to be true. The verifier cap of 8000 tokens must echo all narrations, so a long Tamil chapter may overflow it and quietly go unverified (suspected). What the model actually invents was not tested.

**Reproduction:** Read verifier payload and write-back. Scene visual fields are absent from the prompt.

**Expected:** Everything students see is grounded in the source.

**Actual:** Invented on-screen facts or numbers depend entirely on human review.

**Proposed fix:** Send rendered slide text with the narration, flag or remove ungrounded items, deterministically check chart numbers exist in the source, and rewrite lines 232-233.

**Regression test required:** Stub verifier flagging a slide point: assert it is removed. Chart value absent from the source is flagged.

**Dependencies / blockers:** PIPE-004.

### PIPE-009

**A cut-off MCQ response fails the whole generation; the code comment says otherwise**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Backend defect |
| Affected module | mcq / openai_service |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/mcq/services/openai_service.py: salvage_json_objects keeps whole questions from a cut-off response; prompt caps the count at 100; timeout 120 s and 1 SDK retry.

**Test:** tests/mcq/test_p2_generation.py::test_a_cut_off_response_keeps_the_complete_questions, ::test_a_cut_off_response_with_too_few_questions_still_fails, ::test_one_request_is_not_silently_billed_three_times

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** A cut-off MCQ response fails the whole generation; the code comment says otherwise.

**Root cause / investigation status:** openai_service.py:173-179 treats finish_reason=length as non-fatal, but _parse_response:109-112 runs json.loads on the whole text, so a truncated object raises GenerationError and all complete questions are lost. The model chooses the question count with no ceiling while MCQ_MAX_OUTPUT_TOKENS is 6000, so dense or Tamil chapters are the likely failures. The 60 s client timeout (143) may also be short for 6000 tokens, with SDK retries re-billing (suspected, not measured).

**Reproduction:** pipe_probe.py: valid 10-question JSON with the tail cut gives GenerationError 'not valid JSON'.

**Expected:** Keep complete questions, or ask for a bounded count that fits.

**Actual:** Failure, and Regenerate repeats the same outcome and cost.

**Proposed fix:** Ask for a fixed maximum, use Structured Outputs, generate in batches, or reuse json_utils.salvage_json_objects (currently unused, note it scans for the first '['). Align timeout with token cap.

**Regression test required:** Truncated response keeps complete items and at least the minimum count succeeds.

**Dependencies / blockers:** BACKEND-047 (request held open).

### PIPE-010

**Quiz questions silently come only from the first 20,000 characters of a document**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | mcq / openai_service |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/mcq/services/openai_service.py _sample_source: a long document is sent as 8 evenly spaced windows within the same 20,000 characters. Not stored for the reviewer: that needs a column.

**Test:** tests/mcq/test_p2_generation.py::test_the_end_of_a_long_document_reaches_the_model, ::test_a_short_document_is_sent_whole

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Quiz questions silently come only from the first 20,000 characters of a document.

**Root cause / investigation status:** openai_service.py:64 uses text[:MAX_SOURCE_CHARS] with no warning, and the same document may be taught in full by the video. Local data peaks at 13,822 characters, so not hit yet.

**Reproduction:** Generate for a document over 20,000 characters: the later sections are never sent.

**Expected:** Quiz covers the whole chapter, or the reviewer is told.

**Actual:** Later content is never tested and nobody is told.

**Proposed fix:** Sample across the document or generate per section, and record the coverage in the MCQ document for the reviewer.

**Regression test required:** Assert a marker near the document end reaches the prompt, or a warning is stored.

**Dependencies / blockers:** PIPE-009.

### PIPE-011

**The three document parsers disagree: video and quiz lose tables, and UTF-16 text becomes junk**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | edu_video extractor, mcq parser, voice_qna parser |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/voice_qna/services/parser.py is the one reader (slide_texts added, NUL stripped). stages/extractor.py, document_merger.py and app/mcq/services/parser_service.py delegate to it.

**Test:** tests/edu_video/test_p2_pipeline.py::test_a_word_table_reaches_all_three_features, ::test_a_notepad_unicode_file_reads_the_same_everywhere, ::test_nul_characters_are_gone, ::test_pptx_notes_and_groups_reach_all_three

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** The three document parsers disagree: video and quiz lose tables, and UTF-16 text becomes junk.

**Root cause / investigation status:** extractor._extract_docx:45-48 and document_merger.read_text:60-62 and mcq parser_service:46-48 read doc.paragraphs, which skips tables. voice_qna parser.py:57-73 reads them. For pptx, extractor misses groups and notes and MCQ also misses tables (mcq 51-59), while voice reads all. For .txt: extractor uses utf-8 replace (52), MCQ uses utf-8 ignore (63), merger uses replace, and only voice handles BOMs (118-128). NUL characters in the MCQ text would likely fail the Postgres write (suspected).

**Reproduction:** pipe_probe.py: docx with a table gives 'Intro paragraph' for video and MCQ, and adds 'TABLEKEY | TABLEVAL' for voice. UTF-16 txt gives NUL-riddled text for video and MCQ, and 'Hello water cycle' for voice.

**Expected:** One parser, the same content in all three features.

**Actual:** A table's content is missing from the video and quiz, yet the tutor knows it. A Notepad 'Unicode' file produces junk and paid calls.

**Proposed fix:** Move to one shared parser (voice_qna's is the most complete) and strip NULs.

**Regression test required:** Fixture documents through all three paths give identical text.

**Dependencies / blockers:** INFRA-018 (parser limits).

### PIPE-012

**Preemptive voice generation is always thrown away, so each turn can pay for LLM and TTS twice**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance |
| Affected module | voice_qna / qna_agent |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/voice_qna/agents/qna_agent.py: PREEMPTIVE_GENERATION = {'enabled': False}: per-turn system notes made reuse impossible, so it only cost money.

**Test:** tests/voice_qna/test_p2_tutor_rules.py::test_speculative_answers_are_off

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Preemptive voice generation is always thrown away, so each turn can pay for LLM and TTS twice.

**Root cause / investigation status:** qna_agent.py:642 enables preemptive_tts. on_user_turn_completed always adds system messages (STUDENT_TEXT_REMINDER at line 233). livekit/agents/voice/agent_activity.py:2492-2519 reuses the preemptive reply only if chat_ctx.is_equivalent(temp_mutable_chat_ctx); the item counts differ, so it logs 'preemptive generation invalidated' and cancels. The stated latency gain cannot occur and the speculative work is wasted. Confirmed from framework source; no agent log containing that line exists locally and the money wasted was not measured.

**Reproduction:** 1. Read the two code paths.
2. On a live call, look for the invalidated warning on every turn.

**Expected:** Speculative work is reused, or not started.

**Actual:** Cancelled LLM and TTS work on each turn, with no latency benefit.

**Proposed fix:** Turn preemptive generation off, or move the per-turn notes into instructions or the tool result so the context stays equal.

**Regression test required:** Agent test asserting that the speculative handle is reused, or that preemptive is disabled.

**Dependencies / blockers:** INFRA-016, INFRA-020.

### PIPE-013

**Crisis detection fires on ordinary lesson questions and the tutor refuses to teach**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | voice_qna / tutor_text |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/voice_qna/services/tutor_text.py: _says_i_want_to_die needs the student as subject (first person within 2 words before the verb, or nothing but filler before it). 'kill' alone no longer matches, 'end it' excludes technical follow-ups and how-to questions. Tamil 'going to die' / 'die' require first-person verb forms. Thanglish 'vaazhkai' with one k added.

**Test:** tests/voice_qna/test_p2_tutor_rules.py::test_real_distress_is_still_recognised (21 phrases), ::test_lesson_questions_are_not_treated_as_a_crisis (11 phrases)

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Decision needed:** The register asks for owner review of any tightening. Please review the two lists in the test. Known trade-off: 'we are going to die' and 'he wants to die' are no longer matched by code; the model's rule 13 stays the second line.

**Description:** Crisis detection fires on ordinary lesson questions and the tutor refuses to teach.

**Root cause / investigation status:** tutor_text.py:384 matches want/going/planning within 25 characters of die/kill with no first-person object, although the comment at 379 says first person only. Both voice (qna_agent.py:222-227) and text chat (text_chat_service.py:110-112) then skip the model and give helpline text.

**Reproduction:** pipe_probe.py is_crisis_message returns True for: 'Why are the cells going to die?', 'I want to kill the process in Linux', 'we are planning to kill the bacteria', 'how do I end it all in this loop'.

**Expected:** Biology and computing questions are answered, and real distress still gets the helplines.

**Actual:** Students get a self-harm message for a normal question, and repeating it gives the same message.

**Proposed fix:** Require a first-person self-reference near the verb, exclude object phrases such as 'kill the', and keep the model's rule 13 as second line. Build a labelled test list in English, Tamil and Thanglish.

**Regression test required:** Positive and negative phrase lists for is_crisis_message.

**Dependencies / blockers:** Keep recall high: any tightening needs review by the owner.

### PIPE-022

**Late workers are not fenced: a job deleted near the end still gets a video and a 'ready' email**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Backend defect |
| Affected module | edu_video / job_tracker, pipeline |
| Finding status | confirmed |
| Duplicates merged | DATA-010 |

**Phase 2 remediation (Fixed):** job_tracker: update_job_status, set_job_plan and set_job_output skip deleted jobs; set_job_output also needs RENDERING, so a duplicate worker cannot overwrite a finished job; no event or mail on a no-op. pipeline: run_export stops on a deleted job, _export_mp4 checks before save and removes the file if deleted during upload. No run-id fencing: it needs a column.

**Test:** tests/integration/test_chapter_workflow.py::test_a_deleted_job_stays_as_it_was_and_nobody_is_told, ::test_a_second_worker_cannot_finish_a_finished_job, ::test_a_render_that_finishes_still_notifies, ::test_nothing_renders_for_a_job_deleted_before_the_export

**Evidence:** failed before: updates did not filter deleted_at; passes now

**Description:** Late workers are not fenced: a job deleted near the end still gets a video and a 'ready' email.

**Root cause / investigation status:** job_deleted is checked after planning (pipeline.py:316) and at scene start (98), not before save. set_job_output (job_tracker.py:299), set_job_plan and non-failing update_job_status do not filter deleted_at. A stale duplicate worker from recovery is only partly blocked (a failure cannot overwrite DONE). Nothing ties a worker to a run, so two workers can both write final.mp4.

**Reproduction:** Read the code: delete during the encode, which has no check, and the job becomes DONE with deleted_at set, plus email and bell.

**Expected:** A deleted job stops, nothing is stored, nothing is sent.

**Actual:** Unused storage and a misleading message.

**Proposed fix:** Filter on deleted_at in terminal updates, check before save_video, and add a run id or fencing token.

**Regression test required:** Delete before set_job_output: no status change, no notification.

**Dependencies / blockers:** BACKEND-021, BACKEND-043.

### TEST-001

**No DB-backed tests: SQL and tenant filters are never executed**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Test coverage |
| Affected module | backend tests / multi-tenancy |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New tests/integration/test_coverage_tenancy.py: staff and students of college A against college B job reads, job writes, user and department reads, list filters, cross-college edits. Real SQL.

**Test:** tests/integration/test_coverage_tenancy.py

**Evidence:** No such test existed; all pass, no tenant leak found. Not a full every-route matrix: it covers the routes listed in the file.

**Description:** No DB-backed tests: SQL and tenant filters are never executed.

**Root cause / investigation status:** Every API test replaces get_db/get_async_db with MagicMock/AsyncMock (tests/test_publish_and_access_rules.py:47-57, tests/edu_video/test_watch_progress.py:47-48, tests/test_teaching_portal_routers.py). grep finds no create_engine/create_async_engine or real session in tests/. Postgres dialect is used only to compile statements to strings (tests/mcq/test_generation_state.py:67). Fake tenant_id values are set on mocks, so a missing .where(tenant_id==...) would still pass.

**Reproduction:** 1. grep -rnE 'create_async_engine|create_engine|AsyncSessionLocal' tests/ returns nothing. 2. Remove a tenant filter from any list query; no test can fail because the mocked execute returns canned rows.

**Expected:** Cross-tenant tests that seed two colleges in a real Postgres and assert each role reads and writes only its own rows

**Actual:** Authorization logic in Python is partly tested; the tenant predicates in queries are never run

**Proposed fix:** Add a pytest integration layer with disposable Postgres (pgvector image, as in deploy compose), run alembic upgrade head, seed two tenants with all five roles, drive routes through real dependencies

**Regression test required:** Parametrized matrix: every list/detail/export route, every role, tenant A token against tenant B ids returns 403/404 and no B rows

**Dependencies / blockers:** Needs a test database and CI service container (TEST-003)

**Verification:** confirmed: 0 test files use create_engine, create_async_engine or AsyncSessionLocal. Note: Coverage gap, not a defect. Downgraded for consistent use of the brief's scale.

### TEST-002

**Login, refresh, reset, activation and OTP endpoints have no tests**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Test coverage |
| Affected module | app/api/v1/auth.py |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New tests/integration/test_coverage_auth.py for gaps left by test_sessions and test_auth_hardening: login per role, wrong password vs unknown user, deactivated user and college, logout, expired reset, OTP once, expiry and burn.

**Test:** tests/integration/test_coverage_auth.py

**Evidence:** No such test existed; all pass on real SQL.

**Description:** Login, refresh, reset, activation and OTP endpoints have no tests.

**Root cause / investigation status:** tests/test_auth_login_hardening.py covers verify_password, effective permissions and GET /auth/me only (line 108); despite its name it never calls POST /auth/login. grep for auth URLs in tests returns one hit. 10 of 12 auth routes have no test. tests/test_rate_limit_per_user.py:49 tests a throwaway app, not the login limit.

**Reproduction:** 1. grep -rnE '/auth/' tests/ --include=*.py. 2. Only /api/v1/auth/me appears.

**Expected:** Success and failure tests for each auth endpoint, per role: inactive user, expired or reused token, refresh rotation, rate limit, no user enumeration

**Actual:** No automated test

**Proposed fix:** Add auth route tests, first with mocks then in the integration layer

**Regression test required:** tests/test_auth_routes.py for login per role, wrong password, deactivated user and college, refresh reuse, reset token single use, OTP expiry

**Dependencies / blockers:** None for mocked tests; TEST-001 for DB-backed

**Verification:** confirmed: grep of /auth/ in tests finds nothing except /auth/me. Note: Downgraded as above.

### TEST-003

**CI runs no tests, lint or migration check before deploying to production**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | CI (.github/workflows/deploy.yml, both repos) |
| Finding status | confirmed |
| Duplicates merged | INFRA-010 |

**Phase 2 remediation (Fixed):** New .github/workflows/ci.yml in both repos (pull_request + workflow_call, ubuntu-latest). Backend: pgvector pg15 and Redis services, ruff, single-head check, upgrade on empty DB, pytest with coverage floor. Frontend: npm ci, lint, typecheck, test, build. deploy.yml in both now has job ci and build-and-deploy needs ci.

**Test:** tests/integration/test_coverage_deploy_config.py; scripts/infra.test.mjs workflows block

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed. Workflows cannot run here: YAML parsed by the tests, actionlint 1.7.8 reports only unused-loop-variable warnings, and the same commands were run locally. Backend migration steps rehearsed on a pgvector:pg15 container (upgrade reached head). The workflow itself has not run on GitHub. CI will be RED until (a) src/lib/planQuality.js exists (lint error) and (b) the 43 currently failing backend tests from other agents are green.

**Blocked on:** Green CI depends on the lint error above and the in-flight backend failures in the final report. GitHub-hosted minutes are used (self-hosted runner is the production box).

**Description:** CI runs no tests, lint or migration check before deploying to production.

**Root cause / investigation status:** Each repo has only deploy.yml with a single build-and-deploy job, triggered on push to master/main. Neither has pytest, lint, or a pull_request trigger. Evidence of cost: backend run 41192263901 (31 Oct) failed at 'Wait for backend health' with Alembic 'Multiple head revisions'; frontend run 40321282841 failed inside the Docker build on prerender errors.

**Reproduction:** 1. Read both workflows. 2. gh run view 41192263901 -R Rytsense-Technologies/b2b_projectk --log-failed.

**Expected:** A pull_request workflow runs tests, alembic heads check, lint and build; deploy depends on it

**Actual:** Defects are discovered during the production deploy, after the image is already pushed

**Proposed fix:** Add ci.yml in both repos (backend: pytest, single-head check, upgrade on empty DB; frontend: lint, build). Make deploy need ci

**Regression test required:** A deliberately failing test on a PR blocks merge and deploy

**Dependencies / blockers:** TEST-004 to enforce; self-hosted runner capacity

**Verification:** confirmed: Each repo has only deploy.yml, with no pytest, lint or pull_request trigger. Backend run 41192263901 failed, then the migration fix passed. Frontend run 40321282841 failed in Docker build. Note: Downgraded as a process gap; both failures were visible at deploy. It is why TEST-005 can recur, so schedule it with that fix.

### TEST-004

**Production branches are not protected**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | GitHub repo settings |
| Finding status | suspected |

**Phase 2 remediation (Blocked):** Nothing changed: repository settings.

**Test:** Direct push rejected, once enabled

**Evidence:** Not verifiable here.

**Blocked on:** Repo admin after the first green CI: require PR review and the `checks` status check on main (frontend) and master (backend).

**Description:** Production branches are not protected.

**Root cause / investigation status:** gh api .../b2b_project-k_frontend/branches/main/protection returned 'Branch not protected' (confirmed). Backend master returned 404 'Not Found', which may mean a token permission limit. Backend master history shows direct commits deployed (e.g. run on 'system noytification changes.').

**Reproduction:** 1. gh api repos/Rytsense-Technologies/b2b_project-k_frontend/branches/main/protection.

**Expected:** Required PR review and required status checks on main and master

**Actual:** Any push with write access deploys straight to production

**Proposed fix:** Enable branch protection with required checks once TEST-003 exists; an admin should confirm the backend state

**Regression test required:** Direct push to main or master is rejected

**Dependencies / blockers:** TEST-003

### TEST-007

**User, role and college administration has no route tests**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Test coverage |
| Affected module | app/api/v1/users.py, roles.py, colleges.py, universities.py, departments.py, academics.py |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New tests/integration/test_coverage_admin_matrix.py: all 52 routes of users, roles, colleges, universities, departments, academics, anonymous 401 plus per-role matrix; a new route fails until listed.

**Test:** tests/integration/test_coverage_admin_matrix.py

**Evidence:** Matrix was recorded from current behaviour, then reviewed by tier: 15 SA, 19 admins, 10 + HOD, 8 + faculty, none for students. It pins behaviour; it does not prove each tier is the business intent. All pass in the full run.

**Description:** User, role and college administration has no route tests.

**Root cause / investigation status:** Route map: users 0/11, roles 0/5, colleges 0/6, universities 2/6, departments 2/6, academics 3/18; existing hits concern code handling only (tests/test_unique_id_routes.py). user_service, college_service, role_service, student_import and academic_progression_service are not imported by any test.

**Reproduction:** 1. Run audit/test_map.py from the backend root. 2. Read audit/test_routes.json.

**Expected:** Role matrix tests on each administrative route, including role change, bulk import and deactivate

**Actual:** No automated proof of who may call them

**Proposed fix:** Add a declarative role matrix test over the app route table

**Regression test required:** For each route and role, assert allowed or 403; new routes fail until listed

**Dependencies / blockers:** None for mocked guards

**Verification:** confirmed: Only 1 test line references /api/v1 users, roles or colleges, and 0 test files reference user_service, college_service, role_service, student_import or academic_progression_service. Note: Downgraded as above.

### TEST-008

**Frontend has no test runner and no tests**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Test coverage |
| Affected module | frontend |
| Finding status | confirmed |
| Duplicates merged | FE-025 |

**Phase 2 remediation (Fixed):** Added @playwright/test 1.64.1, playwright.config.mjs, e2e/roles.js, e2e/smoke.spec.js, e2e.yml (manual). Credentials only from E2E_* env. vitest also collects scripts/*.test.mjs.

**Test:** e2e/smoke.spec.js; scripts/infra.test.mjs e2e credentials

**Evidence:** failed before: no test runner for e2e. passes now: 10 of 10 on a production build at :3101 against a throwaway API (own *_test DB, generated password, removed afterwards), including Faculty on /faculty/staff not found, student turned away from 3 portals, and no CSP violation on any dashboard.

**Description:** Frontend has no test runner and no tests.

**Root cause / investigation status:** package.json has no test script and no jest, vitest, playwright or cypress dependency. 0 *.test/*.spec files across 236 js/jsx files in src. Playwright use is manual and held in scratchpad scripts, not in the repo.

**Reproduction:** 1. Read package.json scripts. 2. Glob src for *.test.* and *.spec.*.

**Expected:** Smoke E2E per role plus unit tests for route guards and notification helpers

**Actual:** Login per role, route guards, publish, quiz and notification switches have zero automated coverage

**Proposed fix:** Add @playwright/test with a role smoke suite in the repo, and a small unit runner

**Regression test required:** E2E: each role logs in and reaches its dashboard; Faculty on /faculty/staff gets 404; student cannot open staff routes

**Dependencies / blockers:** Seeded test backend

**Verification:** confirmed: package.json has no test script, and src has 0 *.test or *.spec files. Note: Downgraded as above.

### TEST-009

**No Alembic checks despite repeated migration incidents**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Test coverage |
| Affected module | alembic/ |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** New tests/integration/test_coverage_migrations.py: one head, unique revision and file numbers, empty DB reaches head, every ORM column exists after upgrade. CI runs single-head and upgrade steps.

**Test:** tests/integration/test_coverage_migrations.py

**Evidence:** No migration test existed; all pass. alembic check is NOT gated: it reports large drift on a pg15 rehearsal (edu_video_jobs, mcq tables and indexes reported removed, so alembic/env.py does not import all models, plus real index and constraint differences).

**Blocked on:** alembic/env.py must import the edu_video and mcq models (app area), then the remaining drift needs a migration by agent api, before `alembic check` can join CI.

**Description:** No Alembic checks despite repeated migration incidents.

**Root cause / investigation status:** No test runs upgrade, checks for a single head or compares ORM to schema; the only migration test reads source text (tests/mcq/test_question_editing.py:355). Incidents: 31 Oct multi-head deploy failure, and docs/knowledge/log.md 2026-10-31 records 500s from DB at 0039 while ORM expected 0044, plus a second 0040 file. Dockerfile:39 runs alembic upgrade head on start, so a bad migration crash-loops the API.

**Reproduction:** 1. Grep tests for alembic. 2. Read run 41192263901 log.

**Expected:** CI asserts one head, upgrade from empty and no autogenerate diff

**Actual:** Found in production deploy

**Proposed fix:** Add tests/test_migrations.py using alembic ScriptDirectory and a throwaway database

**Regression test required:** len(script.get_heads()) == 1; upgrade head on empty DB; alembic check clean

**Dependencies / blockers:** TEST-001 database

### TEST-010

**Notification rules tests never reached git; switches untested at route level**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Test coverage |
| Affected module | app/api/v1/notifications.py, notification_service |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New tests/integration/test_coverage_notifications.py: scope authority, other college and department, mandatory events, off at each level suppresses should_send, higher off locks lower, deliveries and test-mail authority. Old file not restored.

**Test:** tests/integration/test_coverage_notifications.py

**Evidence:** No route-level test existed; all pass.

**Decision needed:** The register asks for owner confirmation before restoring the old tests. These are new tests, not a restoration; say if the old file is still wanted.

**Description:** Notification rules tests never reached git; switches untested at route level.

**Root cause / investigation status:** tests/test_notification_rules.py does not exist. git log --all -- that path is empty, so the file was never committed on any fetched ref: eb46dfc did not delete it, it shipped without it (only a stale .pyc remains in tests/__pycache__). Memory note says 24 tests, and calls them dropped by a teammate commit. GET/PUT /notifications/rules, POST rules test, events, deliveries, retry-failed, mine: 7 of 11 routes have no test. Only notify_sync rule respect is tested (tests/test_in_app_notifications.py:52).

**Reproduction:** 1. git log --all --oneline -- tests/test_notification_rules.py. 2. ls tests/__pycache__ | grep notification_rules.

**Expected:** Per-scope switch logic and auth tested

**Actual:** No test for scope resolution or who may toggle a rule

**Proposed fix:** Recreate the tests against the current catalogue (compiled .pyc may guide intent); ask owner before restoring, per the memory note

**Regression test required:** Switch off at each scope suppresses e-mail and bell; Faculty cannot change college rule; other-tenant rule returns 403/404

**Dependencies / blockers:** Owner confirmation

### TEST-011

**Quiz one-attempt rule has no test**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Test coverage |
| Affected module | app/mcq/api/routes.py submit_answers |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New tests/integration/test_coverage_quiz.py: scoring, second submit 409 keeps first score, 4 parallel submits give one 200 and three 409 with one row, watch gate, unapproved set, outsiders, my-attempts isolation.

**Test:** tests/integration/test_coverage_quiz.py

**Evidence:** No such test existed; all pass, race behaviour is now known and correct.

**Description:** Quiz one-attempt rule has no test.

**Root cause / investigation status:** Only test calling submit is tests/edu_video/test_watch_progress.py:191 (watch gate). Handler is at routes.py:311; DB rule uq_mcq_attempts_document_user at app/mcq/models/mcq_attempt.py:29. No test sends a second submit, a concurrent submit, or scoring. mcq_attempt_repository and evaluation_service are not imported directly by tests; GET /mcq/my-attempts and report.pdf have no tests.

**Reproduction:** 1. grep submit in tests/mcq and tests/edu_video.

**Expected:** Second and concurrent submits return one consistent result and no 500

**Actual:** Untested. Race behaviour unknown

**Proposed fix:** Add submit tests with mocks, and a real concurrency test in the DB layer

**Regression test required:** Two parallel submits for one student and document leave one attempt row; second gets the defined status

**Dependencies / blockers:** TEST-001 for the concurrency case

### TEST-012

**Publish workflow covered only at the final step, with mocks**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Test coverage |
| Affected module | app/edu_video/routes.py |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New tests/integration/test_coverage_publish.py: upload-done to student list through real routes, ordering, roles, other department and college, delete.

**Test:** tests/integration/test_coverage_publish.py

**Evidence:** No such test existed; all pass. The register says request-changes blocks publish, but publish_job clears the request instead; test pins only that the chapter stays hidden from students.

**Decision needed:** Should a pending change request block publish? Today a reviewer can publish over it.

**Description:** Publish workflow covered only at the final step, with mocks.

**Root cause / investigation status:** 4 of 26 edu_video routes hit by URL. tests/test_publish_and_access_rules.py covers publish well in-memory (roles, 409s, ordering). send-to-hod, request-changes, dismiss-changes, comments, history, audit, DELETE job, and GET /edu_video/jobs scoping are unreached by URL. test_production_fixes.py calls some handlers directly with _wire mocks. Student visibility SQL runs only against a mock.

**Reproduction:** 1. Read audit/test_routes.json key edu_video.

**Expected:** State-machine test from upload to student visibility

**Actual:** Single transitions only, DB mocked

**Proposed fix:** Add a lifecycle test through routes against real DB with pipeline stubbed

**Regression test required:** Unpublished job invisible to students; other department and other college get 404; request-changes blocks publish

**Dependencies / blockers:** TEST-001

### TEST-013

**No coverage tooling or pytest config**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | backend test setup |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** pytest.ini (testpaths, pythonpath, strict asyncio, -ra), .coveragerc, requirements-dev.txt (pytest-cov, PyYAML, ruff). CI enforces --cov-fail-under=50.

**Test:** tests/integration/test_coverage_deploy_config.py::test_pytest_config_and_dev_requirements_exist

**Evidence:** failed before: no config. passes now. Measured coverage 53% of app on the full suite; floor set just below that.

**Description:** No coverage tooling or pytest config.

**Root cause / investigation status:** No pytest.ini, pyproject.toml, setup.cfg, tox.ini, .coveragerc or conftest.py. requirements.txt:25-26 pins pytest and pytest-asyncio only; pytest-cov absent from b2b_env. No asyncio_mode, markers, or test paths; each file rebuilds its own fixtures. Tests import app.main and read the developer's .env through Settings, so results depend on local config. Some tests assume cwd is repo root (test_question_editing.py:355).

**Reproduction:** 1. pip list in b2b_env. 2. find . -name conftest.py returns nothing.

**Expected:** Shared conftest, test settings, coverage threshold

**Actual:** No measured coverage

**Proposed fix:** Add pytest-cov, pytest.ini, conftest.py with a forced test environment; add threshold in CI

**Regression test required:** pytest --cov-fail-under in CI

**Dependencies / blockers:** TEST-003

### TEST-014

**No ESLint config: npm run lint is not a working gate**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | frontend |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Added .eslintrc.json (next/core-web-vitals, import/no-unresolved via jsconfig). lint script is `next lint --dir src --dir e2e`. Build skips lint (eslint.ignoreDuringBuilds) so CI is the single gate. Backend ruff.toml covers syntax and undefined names only; ruff passes.

**Test:** npm run lint

**Evidence:** failed before: no config, lint could not run as a gate. passes now: non-interactive. The 2 dead-file errors are gone (files deleted by someone else). The only error left is src/lib/planQuality.test.js:3 importing ./planQuality, which belongs to an agent still working; lint exits 1 until that file lands.

**Description:** No ESLint config: npm run lint is not a working gate.

**Root cause / investigation status:** package.json has lint: next lint and eslint-config-next, but no .eslintrc* or eslint.config.* exists. Next build shows the 'Linting' step with no rules to apply. No React hooks or import rules are enforced. Backend has no linter either (no ruff or flake8).

**Reproduction:** 1. ls -a repo root for eslint files. Command not run because it may write a config.

**Expected:** Committed config and non-interactive lint in CI

**Actual:** No lint

**Proposed fix:** Commit .eslintrc.json extending next/core-web-vitals; expect a first-run backlog

**Regression test required:** npm run lint exits 0 in CI

**Dependencies / blockers:** None

### TEST-017

**Deploy has no rollback, no timeout, floating tags and no DB backup**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Configuration/deployment |
| Affected module | deploy.yml, docker-compose.deploy.yml |
| Finding status | confirmed |
| Duplicates merged | INFRA-027 |

**Phase 2 remediation (Fixed):** Backend: compose images pinned to IMAGE_TAG (commit sha), livekit v1.13.11, redis and pg tags fixed; concurrency, timeout 60, pg_dump before migrate, roll back to a locally tagged previous image. Frontend: concurrency, timeout, canary health check before swap, roll back.

**Test:** tests/integration/test_coverage_deploy_config.py; scripts/infra.test.mjs

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed. Compose validated by docker compose config. The workflow itself has not run on GitHub. Rollback restores code only, never the schema.

**Description:** Deploy has no rollback, no timeout, floating tags and no DB backup.

**Root cause / investigation status:** Backend compose uses :latest for backend, agent and interview-agent (lines 50, 66, 96), though deploy builds a sha tag; livekit and egress also :latest (38, 133). No timeout-minutes or concurrency: runs lasted 16h, 22h, 24h and overlapping runs were cancelled on 29 Oct. Frontend does docker rm -f before health check, with no way back. Backend migrations run at container start (Dockerfile:39) with no pre-deploy backup. On 31 Oct a failed health check left no recovery step; the fix landed 2 Nov, so API may have been down meanwhile (not confirmed).

**Reproduction:** 1. Read workflows and compose. 2. gh run list on both repos.

**Expected:** Pinned digests, single-flight deploys, timeout, automatic rollback, backup before migrate

**Actual:** A failed deploy leaves the failed version in place

**Proposed fix:** Deploy by sha, pin third-party images, add concurrency and timeout, rollback on failed health, pg_dump first

**Regression test required:** Staging deploy with a failing health check restores the previous image

**Dependencies / blockers:** None

### UX-001

**Classroom videos have no captions or transcript**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Accessibility |
| Affected module | Student classroom / edu-video pipeline |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** No code change. Captions need a pipeline, storage and player change plus a backfill.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** none until decided

**Evidence:** RefreshingVideo renders video with no track; backend has no vtt generation.

**Decision needed:** Should classroom lectures ship with captions generated from the stored narration script, and should existing videos be backfilled? Student-facing lecture accessibility (WCAG 1.2.2 A) depends on this, and it needs backend pipeline work.

**Description:** Classroom videos have no captions or transcript.

**Root cause / investigation status:** src/components/shared/RefreshingVideo.jsx:51 renders <video> with no <track>, and line 50 suppresses the jsx-a11y/media-has-caption lint. No srt/vtt/caption/subtitle handling in app/edu_video/routes.py or pipeline.py (grep).

**Reproduction:** 1. Sign in as student. 2. Open a chapter and press Resume lecture. 3. Inspect the video element.

**Expected:** WCAG 1.2.2 (A): prerecorded lectures carry synchronised captions; the player also has an accessible name.

**Actual:** Live: video element with tracks=0, aria-label null, title empty, on a 5:19 lecture. Deaf or hard-of-hearing students cannot use the core learning content, and watch progress gates the quizzes.

**Proposed fix:** Generate WebVTT from the narration script the pipeline already holds, store beside the MP4, serve it through a scoped endpoint, add <track kind="captions">, and pass aria-label with the chapter title.

**Regression test required:** Player test asserts a captions track exists for a finished video; pipeline test asserts a .vtt is produced with timings inside the video duration.

**Dependencies / blockers:** Needs a pipeline change; existing videos need a backfill from their stored plans.

### UX-002

**White text on the primary orange button is 2.59:1**

| Field | Value |
|---|---|
| Status | Accepted |
| Severity | Medium |
| Category | Accessibility |
| Affected module | All portals: primary buttons |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** No change: the orange and the white label are both locked.

**Owner decision (chat, 3 Nov 2026):** keep the guideline orange exactly as designed (white on `#F5821F`, orange status words). The contrast shortfall is accepted; the ink-text change was reverted.

**Test:** none until decided

**Evidence:** #FFFFFF on #F5821F computes 2.59:1 (needs 4.5:1).

**Decision needed:** White on #F5821F is 2.59:1. Keep #F5821F and change the button label to ink #102228 (about 6:1), or approve a darker button fill? #AC5B16 is banned in product UI, so a darker fill needs a new owner-approved value.

**Description:** White text on the primary orange button is 2.59:1.

**Root cause / investigation status:** src/styles/quirri-design.css:37 (--accent #F5821F) with :526 .btn-primary color #fff; src/styles/portal-b2c.css:139 and src/styles/student-learning.css:26 do the same for .sd-btn--amber.

**Reproduction:** 1. Run axe on /admin/students, /superadmin/colleges or any dialog with a primary button.

**Expected:** WCAG 1.4.3 (AA): 4.5:1 for normal text, 3:1 for large text.

**Actual:** axe reports 2.59:1 (#ffffff on #f5821f) on .sd-btn--amber and .btn-primary, in page scans and inside the Add college dialog. This fails even the 3:1 large-text threshold.

**Proposed fix:** Keep the orange fill and use dark ink text (#102228 is about 6:1 on #F5821F; verify with a checker), or get owner approval for a darker button shade.

**Regression test required:** axe colour-contrast check in CI for one primary button in each portal.

**Dependencies / blockers:** Standing design lock: "One orange #F5821F" and the login UI freeze. Owner must decide before any colour change.

### UX-003

**Orange text on white is 2.59:1 (status words, "Needs focus", reasons)**

| Field | Value |
|---|---|
| Status | Accepted |
| Severity | Medium |
| Category | Accessibility |
| Affected module | Faculty/admin status text, data-viz bands |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** No change: --accent-text is locked to #F5821F.

**Owner decision (chat, 3 Nov 2026):** keep the guideline orange exactly as designed (white on `#F5821F`, orange status words). The contrast shortfall is accepted; the ink-text change was reverted.

**Test:** none until decided

**Evidence:** #F5821F on white computes 2.59:1 (needs 4.5:1).

**Decision needed:** Orange status words ("Needs focus") are 2.59:1 on white. Approve a darker orange for text only (it must clear 4.5:1, and cannot be #AC5B16), or render these words in ink with an orange dot?

**Description:** Orange text on white is 2.59:1 (status words, "Needs focus", reasons).

**Root cause / investigation status:** src/styles/quirri-design.css:40 --accent-text is #F5821F and is documented for orange words on white. Seen on .dv-band--focus and .fa-reason.

**Reproduction:** 1. Run axe on a page listing a student flagged for low scores.

**Expected:** WCAG 1.4.3 (AA): 4.5:1.

**Actual:** axe: #f5821f on #ffffff = 2.59:1, for example "Needs focus" and "Low quiz scores (20%)". This is status information, not decoration.

**Proposed fix:** Use a dark orange text token for words only (must clear 4.5:1). The lock forbids #AC5B16 in product UI, so the owner must pick the token. Pair status with an icon.

**Regression test required:** axe colour-contrast on a seeded page containing every band and status chip.

**Dependencies / blockers:** Standing design lock: "One orange #F5821F" and the login UI freeze. Owner must decide before any colour change.

### UX-004

**Muted grey #707A7E fails contrast on white and on the canvas, on every page**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Accessibility |
| Affected module | All portals: secondary text |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** --neutral-500 changed from #707A7E to #626D71 (quirri-design.css); now 5.32:1 on white, 4.65:1 on canvas, 5.02:1 on mist. The frozen login keeps #707A7E through a scoped override in the login freeze guard. Stale colour comment in student-b2c.css updated.

**Test:** src/styles/contrast.test.js

**Evidence:** failed before: 3.85:1 on canvas; passes now: contrast.test.js; browser: axe color-contrast 98 nodes on 20 pages, muted-grey nodes 0; pairs {"#ffffff on #f5821f":26,"#46921a on #ffffff":48,"#f5821f on #ffffff":16,"#4d8691 on #ffffff":6,"#ffffff on #4d8691":2}; frozen login keeps --muted-2 #707a7e

**Description:** Muted grey #707A7E fails contrast on white and on the canvas, on every page.

**Root cause / investigation status:** src/styles/quirri-design.css:71 --neutral-500 #707A7E, used through :111 --muted-2 and src/app/globals.css:73.

**Reproduction:** 1. Run axe at 1440 and 390 on all role pages.

**Expected:** WCAG 1.4.3 (AA): 4.5:1.

**Actual:** color-contrast fired on 98 of 98 scans, 1,611 nodes in total. Worst page /superadmin/users, 53 nodes. Node samples (first 6 per page): 4.39:1 on #fff (439), 3.84:1 on #EEF0F0 (79), 4.14:1 on #F8F8F9 (5). Includes form hints, drawer labels (<dt>Email</dt>) and table text. A further 347 nodes were axe "incomplete" (needs manual review).

**Proposed fix:** Darken --neutral-500 by one step to clear 4.5:1 on #EEF0F0. It is a single-token change that clears nearly all contrast nodes.

**Regression test required:** Token contrast unit test against white, #EEF0F0 and #F8F8F9, plus axe in CI.

**Dependencies / blockers:** None

### UX-006

**Programmes list has invalid listbox markup**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Accessibility |
| Affected module | College admin: Programmes & subjects |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** AcademicStructureWorkspace programmes list: removed listbox/option roles; plain ul of buttons with aria-pressed.

**Test:** src/components/shared/a11yShell.test.js::programme list

**Evidence:** failed before: 43 of 50 new assertions red on the unfixed tree; passes now: npx vitest run; browser: axe across 20 mocked pages at 1440 and 390: aria-required-children, aria-required-parent, listitem 0 nodes; programmes rendered 2 buttons with aria-pressed; axe aria rules 0

**Description:** Programmes list has invalid listbox markup.

**Root cause / investigation status:** src/components/shared/AcademicStructureWorkspace.jsx:835-840: <ul role="listbox"> contains <li> elements wrapping <button role="option">.

**Reproduction:** 1. Sign in as college admin. 2. Open /admin/structure/programmes. 3. Run axe.

**Expected:** WCAG 1.3.1 / 4.1.2 (A): options are direct owned children of the listbox.

**Actual:** axe critical aria-required-children and aria-required-parent, serious listitem, at 1440 and 390. The superadmin academics page shares the component but did not fire in its scanned state.

**Proposed fix:** Remove the listbox/option roles and use a plain list of buttons with aria-pressed or aria-current, or add role="none" to the <li> and implement arrow-key behaviour.

**Regression test required:** axe on the programmes page with at least one programme.

**Dependencies / blockers:** None

### UX-015

**LiveKit (536 KB) is downloaded on the student home and subjects pages, with no code splitting anywhere**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance |
| Affected module | Student portal bundle |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** VoiceQnaPanel loads with next/dynamic (ssr:false) when the AI tutor tab opens.

**Test:** src/components/shared/bundleSplit.test.js::code splitting

**Evidence:** failed before: static import; passes now: test green and the build has no LiveKit chunk in any route manifest. /student/subjects First Load is 197 KB (audit: 430 KB gz); browser: no LiveKit script on /student/home; no LiveKit script on /student/subjects; LiveKit loads with the tutor tab (144d3bae.9769165231e31073.js)

**Description:** LiveKit (536 KB) is downloaded on the student home and subjects pages, with no code splitting anywhere.

**Root cause / investigation status:** src/components/student/VoiceQnaPanel.jsx:4 imports livekit-client statically. grep finds no next/dynamic or React.lazy in src/.

**Reproduction:** 1. Check E:/b2b_build_check_tmp/.next app-build-manifest. 2. Sign in as student and load /student/home. 3. List resource timing entries.

**Expected:** LiveKit loads only when a student opens the AI tutor voice panel.

**Actual:** Chunk 8c112f15 (536 KB raw, 136 KB gz) belongs to /student/subjects, which at 430 KB gz is the heaviest route. It also loaded on /student/home (largest chunk there) although home does not import it: Link prefetch pulls it in.

**Proposed fix:** Load VoiceQnaPanel with next/dynamic (ssr:false) when the AI tutor tab opens.

**Regression test required:** Bundle budget check: no livekit in the initial chunks for student routes.

**Dependencies / blockers:** Measured on the temporary build, because the repo production build currently fails.

### UX-016

**Recharts ships on 30 routes but only 2 files draw with it**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance |
| Affected module | Shared data-viz |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Recharts moved to src/components/shared/data-viz-charts.jsx, loaded with next/dynamic from data-viz.jsx. Importers are unchanged.

**Test:** src/components/shared/bundleSplit.test.js::code splitting

**Evidence:** failed before: data-viz.jsx imported recharts (30 routes); passes now: the recharts chunk is in 0 route manifests. /admin/dashboard First Load is 212 KB

**Description:** Recharts ships on 30 routes but only 2 files draw with it.

**Root cause / investigation status:** src/components/shared/data-viz.jsx imports recharts at :15 alongside SVG-only exports (BANDS, BandPill, ModernDonut, MetricList). ColumnChart/TrendChart are used only in src/app/student/(portal)/progress/page.jsx:332 and src/components/admin/InsightsView.jsx:445, while 26 files import the module.

**Reproduction:** 1. Read the app-build-manifest and count routes containing chunk 637.

**Expected:** Recharts only on routes that render those charts.

**Actual:** Chunk 637 (382 KB raw, 99 KB gz) is on 30 routes, including users, staff, students and dashboards. /admin/dashboard rendered 0 Recharts wrappers live.

**Proposed fix:** Move ColumnChart and TrendChart into their own module and load it with next/dynamic.

**Regression test required:** Bundle budget check per route.

**Dependencies / blockers:** None

### UX-017

**LCP is about 3.7-4.6 s on throttled mobile**

| Field | Value |
|---|---|
| Status | In Progress |
| Severity | Medium |
| Category | Performance |
| Affected module | Student home, admin dashboard, content |
| Finding status | confirmed |

**Phase 2 remediation (In Progress):** No separate code change; depends on UX-015 and UX-016, both done.

**Test:** CDP throttled measure, scratchpad audit/ux/lcp.cjs (mocked API, so server time is excluded)

**Evidence:** audit: 3.7-4.6 s; browser: mocked API, 390x844, 150 ms, 1.6 Mbps, 4x CPU, median of 3: /student/home 1508 ms, /admin/dashboard 2664 ms, /superadmin/content 4972 ms, /student/subjects 1328 ms (audit: home 4,592, dashboard 3,840, content 3,680). Target 2.5 s not met on 2 routes. /superadmin/content LCP is a paragraph that renders after hydration and fetch; this run is not directly comparable with the live audit run

**Blocked on:** Lighthouse budget in CI needs the CI owner.

**Description:** LCP is about 3.7-4.6 s on throttled mobile.

**Root cause / investigation status:** Driven by the two bundle findings above plus render-after-fetch pages. Transfer 585-752 KB per cold load.

**Reproduction:** 1. 390x844, cold cache, 150 ms latency, 1.6 Mbps, 4x CPU throttling via CDP. 2. Load each page.

**Expected:** LCP at or under 2.5 s.

**Actual:** /student/home LCP 4,592 ms, TBT 218, 752 KB. /admin/dashboard 3,840 ms, TBT 356, 674 KB. /superadmin/content 3,680 ms, TBT 513, 666 KB. /student/subjects 1,012 ms, but TBT 630. Single sample each. Unthrottled on localhost (49 routes): median LCP 448 ms, max 944 ms, TBT median 0, max 105.

**Proposed fix:** Fix the two bundle findings, then re-measure.

**Regression test required:** Lighthouse-style budget in CI on 4 key routes.

**Dependencies / blockers:** Depends on the LiveKit and Recharts findings.

### UX-022

**API startup takes about 2 minutes because the video pipeline is imported eagerly**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance |
| Affected module | Backend startup |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/main.py no longer loads moviepy, seaborn or matplotlib: routes.py has thin module-level run_pipeline, run_export and render_scene_image, and avatar listing moved to app/edu_video/avatars.py. The first scene preview in the API process pays the render import. openai is still imported eagerly by MCQ and voice. The CI time budget is not added (.github is another agent's); startup time was not re-measured.

**Test:** tests/integration/test_read_models.py::test_importing_the_api_leaves_the_render_stack_unloaded

**Evidence:** failed before: run on the unfixed code (18 of 21 failed); passes now: pytest

**Description:** API startup takes about 2 minutes because the video pipeline is imported eagerly.

**Root cause / investigation status:** app/main.py imports app.edu_video.routes, which pulls in app.edu_video.pipeline, renderers, moviepy and seaborn, plus openai.

**Reproduction:** 1. In WSL: python -X importtime -c "import app.main" (import only; no server started, no bytecode written).

**Expected:** API process ready in seconds; heavy libraries load in the worker that needs them.

**Actual:** import app.main took 110.9 s on /mnt/e. app.edu_video.routes 82.1 s, of which pipeline 66.1 s; openai 31.8 s; visual_renderer 17.6 s; seaborn 16.3 s; moviepy.editor 11.4 s. Figures are inflated by the /mnt/e filesystem. The ~80 s LiveKit job import was not measured.

**Proposed fix:** Import renderers inside the job functions. Keep the code on the Linux filesystem in development.

**Regression test required:** CI check with a time budget for import app.main.

**Dependencies / blockers:** None

### UX-023

**Production container runs a single uvicorn worker**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Performance |
| Affected module | Deployment |
| Finding status | suspected |

**Phase 2 remediation (Blocked):** Not changed.

**Test:** none

**Decision needed:** What worker count should production use, given ops_monitor keeps in-process metrics?

**Blocked on:** Dockerfile and deploy are outside my ownership.

**Description:** Production container runs a single uvicorn worker.

**Root cause / investigation status:** Dockerfile:39 runs uvicorn with no --workers and no compose override was found in docker-compose.deploy.yml. The same command also runs alembic upgrade head at container start.

**Reproduction:** 1. Read the Dockerfile. 2. Compare load-time API latencies with sequential ones.

**Expected:** Capacity sized for concurrent students.

**Actual:** Each page's parallel calls measured 200-630 ms during load; the same endpoints alone took 43-69 ms (last of 3 samples). This suggests queuing, but it was on a shared dev machine and the proxy may contribute. No load test was run, by brief. ops_monitor metrics are in-process, so adding workers needs care.

**Proposed fix:** Decide the worker count; move migrations to a release step.

**Regression test required:** Load test at target concurrency.

**Dependencies / blockers:** ops_monitor and any in-process state must be checked before adding workers.


## Low

### AUTH-014

**Password reset does not clear a lockout, though the login page says it will; the client lock is misleading**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | app/api/v1/auth.py reset_password, src/app/auth/login/page.js |
| Finding status | confirmed |
| Duplicates merged | FE-010 |

**Phase 2 remediation (Fixed):** reset_password clears the account lock and all per-source rows.

**Test:** tests/integration/test_auth_hardening.py::test_reset_ends_a_lockout

**Evidence:** failed before: run against unfixed code; passes now

**Blocked on:** Frontend part (FE-010): remove the browser-wide client lock counter in src/app/auth/login/page.js. Not assigned to me.

**Description:** Password reset does not clear a lockout, though the login page says it will; the client lock is misleading.

**Root cause / investigation status:** reset_password (auth.py:345-352) never clears locked_until or failed_login_count, but login page.js:242-243 tells users to 'reset your password to regain access now'. The client lock is separate: 3 failures in a browser-wide localStorage key (page.js:23-25, 107-116) shows 'Account temporarily locked' when the server has not locked anything, and 'Try again now' (page.js:249-252) dismisses it. It also spans users on a shared lab browser. The server's real 429 does not count as a credential failure (errors.js:32-35).

**Reproduction:** 1. Trigger a server lock with 5 wrong passwords. 2. Reset the password. 3. Sign in with the new password within 15 minutes: 429.

**Expected:** Reset clears the lock, and the lock message reflects the server's state.

**Actual:** User is told to reset, does so, and is still blocked. Another user of the same browser may see a lock for an account that is not locked.

**Proposed fix:** Clear both fields in reset_password. Remove the client counter and show the server's 429 message. Behavior only; the login card layout is unchanged except this notice's logic, and the login visuals are frozen.

**Regression test required:** Locked account + successful reset = immediate login success.

**Dependencies / blockers:** Login UI freeze: logic change only.

### AUTH-015

**No per-account limit on reset and OTP mail; public OTP endpoints serve no flow**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | app/api/v1/auth.py forgot_password, send_otp, verify_otp |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Done: 120 s per-account cooldown on reset and OTP mail, keeping the first link; OTP purpose validated; inactive accounts cannot verify.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** tests/integration/test_auth_hardening.py::test_reset_mail_has_a_cooldown_and_keeps_the_first_link, ::test_otp_purpose_is_validated_and_inactive_cannot_verify

**Evidence:** failed before: run against unfixed code; passes now

**Decision needed:** No flow uses the public OTP routes. Remove /auth/send-otp and /auth/verify-otp with OTPModal, or keep them? If kept they also need purpose bound to the stored code and salted hashes.

**Description:** No per-account limit on reset and OTP mail; public OTP endpoints serve no flow.

**Root cause / investigation status:** forgot_password (auth.py:293-319) and send_otp (auth.py:457-479) are limited only per IP, and each call invalidates the previous link or code, so repeated requests flood a victim and break the link they are trying to use. OTP is not used by any flow: verify_otp returns only {verified:true}, no session; OTPModal.jsx is not imported anywhere, and authApi.sendOtp/verifyOtp have no other callers. Its `purpose` is free text and unbound to the stored code; purpose=verify_email sets is_verified with no is_active check (auth.py:514-515). 6-digit codes are stored as unsalted SHA-256, reversible from the DB (auth.py:471).

**Reproduction:** 1. From a few IPs, repeatedly POST /auth/forgot-password or /auth/send-otp for one email. 2. Victim gets repeated mail, and only the newest link works.

**Expected:** Per-account cooldown; unused public endpoints absent.

**Actual:** Unauthenticated mail generation on a paid provider, and an attack surface with no product use.

**Proposed fix:** Add a per-email cooldown that keeps the existing link. Remove the OTP routes and OTPModal unless a flow is planned; if kept, validate purpose and bind it to the token.

**Regression test required:** A second request within the cooldown sends no mail and keeps the first link valid.

**Dependencies / blockers:** Owner decision on OTP.

### AUTH-017

**Security events are not audited**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | app/api/v1/auth.py |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Audit rows for failed sign-in (known accounts only, to bound growth), lock, sign-out, password change and reset, activation, refresh-token reuse.

**Test:** tests/integration/test_auth_hardening.py::test_security_events_reach_the_audit_log, ::test_refresh_reuse_is_audited

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Security events are not audited.

**Root cause / investigation status:** The only record_audit call in auth.py is login success (line 190). Failed logins, lockouts, logout, password change and reset, activation and token-reuse detection write no audit row; reuse is only a logger.warning (line 242). Local DB: module 'Authentication' has 810 'Signed in' rows and no other action.

**Reproduction:** 1. Query audit_logs where module='Authentication', grouped by action. Observed: only 'Signed in'.

**Expected:** Super Admin audit log shows authentication failures and credential changes.

**Actual:** An account takeover or brute-force attempt leaves no trace in the product's audit log.

**Proposed fix:** Add audit entries for those events, with care for unknown-user rows and table growth under attack.

**Regression test required:** Each event writes one audit row with the actor and IP.

**Dependencies / blockers:** None

### AUTH-020

**Sessions linger after credential changes, and password change leaves the access cookie behind**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Authentication |
| Affected module | app/api/v1/auth.py change_password, reset_password; src/components/shared/AccountSettings.jsx |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** users.token_version, carried as claim tv, bumped on password change and reset, checked in both get_current_user. change-password clears cookies. Tokens issued before this ships have no claim and count as version 0.

**Test:** tests/integration/test_auth_hardening.py::test_password_change_ends_access_tokens_and_clears_cookies, ::test_reset_ends_access_tokens

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Sessions linger after credential changes, and password change leaves the access cookie behind.

**Root cause / investigation status:** change_password and reset_password revoke refresh tokens only (auth.py:350,369). Access tokens have no version or denylist, so they stay valid for up to 30 minutes (config.py:178). signOutHere (AccountSettings.jsx:222-227) clears only frontend cookies and never calls /auth/logout, so the httpOnly access_token stays usable on that browser. The API message (auth.py:372) mentions only other devices, though the current session is revoked as well.

**Reproduction:** 1. Change password in one browser, or reset it after compromise. 2. Another signed-in browser continues to work until its access token expires.

**Expected:** Credential change ends all sessions at once.

**Actual:** Up to a 30-minute window, and with AUTH-001 up to 30 days until that is fixed.

**Proposed fix:** Add a token_version or password_changed_at claim checked in get_current_user; clear cookies in the change-password response.

**Regression test required:** An access token issued before a password change returns 401 afterwards.

**Dependencies / blockers:** Fix AUTH-001 first.

### AUTH-022

**Queued requests never settle when refresh fails**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Frontend defect |
| Affected module | src/lib/axios.js, src/lib/api/admin/eduVideo.js |
| Finding status | confirmed |
| Duplicates merged | FE-018 |

**Phase 2 remediation (Fixed):** No source change here: AUTH-003 removed the queues. Added the missing guard for the edu_video client (axios.js was already covered by sessionRefresh.test.js).

**Test:** src/lib/api/admin/eduVideo.refresh.test.js::rejects all parallel calls, src/lib/sessionRefresh.test.js::rejects every waiting request when the refresh fails

**Evidence:** The new test passed before any change of mine, because the defect was already gone. It is a guard, not a failed-then-passed test. Owner may close as resolved by AUTH-003.

**Description:** Queued requests never settle when refresh fails.

**Root cause / investigation status:** Queued 401 requests are promises with no reject path (axios.js:36, eduVideo.js:209); on failure the arrays are simply emptied (axios.js:47, eduVideo.js:217). handleSessionExpired normally redirects, but does nothing on /auth/* paths (sessionExpiry.js:13) or once `redirecting` is set, so spinners on those requests never resolve.

**Reproduction:** 1. Fire parallel calls with an expired session and a dead refresh token. 2. Queued calls stay pending indefinitely.

**Expected:** Queued requests reject when refresh fails.

**Actual:** Promises stay pending. Usually hidden by the redirect.

**Proposed fix:** Store resolve and reject pairs, and reject them all on failure. Combine with the shared refresh in AUTH-003.

**Regression test required:** Unit test: refresh failure rejects all queued requests.

**Dependencies / blockers:** AUTH-003.

### AUTH-023

**Single-use token checks are not atomic**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | app/api/v1/auth.py reset_password, activate_account, verify_otp, refresh_token |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** FOR UPDATE on reset, activation and OTP token reads; OTP lookup takes the newest row, so a duplicate no longer 500s.

**Test:** tests/integration/test_auth_hardening.py::test_a_reset_token_is_consumed_once_under_parallel_use, ::test_duplicate_live_otp_does_not_crash

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Single-use token checks are not atomic.

**Root cause / investigation status:** These read the token row without SELECT FOR UPDATE, then write used_at, attempts or is_revoked (auth.py:328-346, 383-404, 491-513, 225-258). Two parallel requests can both pass. OTP attempts can be under-counted the same way. Not reproduced: this needs concurrent POSTs. At auth.py:499 a duplicate live OTP would also raise MultipleResultsFound and return 500.

**Reproduction:** 1. Send two parallel POST /auth/reset-password with one token and different passwords. 2. Both may succeed.

**Expected:** Exactly one request consumes a token.

**Actual:** Small race window. Practical impact is low, since the token holder is already the legitimate party.

**Proposed fix:** Use `UPDATE ... WHERE used_at IS NULL RETURNING` or with_for_update().

**Regression test required:** Parallel consumption test: one success, one 400.

**Dependencies / blockers:** None

### AUTHZ-015

**Faculty can read staff data that docs reserve for HOD**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Authorization |
| Affected module | Academics |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Faculty: email omitted from colleagues in subject staff lists, /staff/{id}/subjects limited to themselves (403 otherwise), /staff-subjects limited to their own row. HOD and above unchanged. app/api/v1/academics.py

**Test:** tests/integration/test_api_rules.py::test_faculty_get_no_colleague_contact_data, ::test_hod_keeps_the_staff_view

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Faculty can read staff data that docs reserve for HOD.

**Root cause / investigation status:** app/api/v1/academics.py READ_ROLES includes faculty on /staff-subjects (857), /staff/{id}/subjects (775) and /semesters/{id}/subjects (514), which returns _person with email (214-216). Portal 404 on /faculty/staff is frontend only; GET /faculty/staff itself is correctly 403.

**Reproduction:** As Faculty: GET /api/v1/academics/staff-subjects 200; GET /api/v1/academics/staff/{hod id}/subjects 200 with staff fields id, name, email, role, is_active; GET /api/v1/academics/semesters/{id}/subjects 200, staff entries with the same fields.

**Expected:** staff-scope.md: department staff list is HOD only.

**Actual:** Faculty assemble colleague names, emails and teaching assignments for their department.

**Proposed fix:** Restrict these to HOD and above for Faculty, or drop email from the Faculty response, or change the rule in the docs.

**Regression test required:** Faculty gets 403 or email-free output on these three routes.

**Dependencies / blockers:** None

### AUTHZ-016

**Accounts with no department fall back to college-wide numbers**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Authorization |
| Affected module | Leaderboard, Academics summary |
| Finding status | confirmed |
| Duplicates merged | BACKEND-040 |

**Phase 2 remediation (Fixed):** Leaderboard and academics summary: staff with no department get 400, a student gets an empty board.

**Test:** tests/integration/test_api_rules.py::test_no_department_student_gets_an_empty_board, ::test_no_department_staff_get_400

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Accounts with no department fall back to college-wide numbers.

**Root cause / investigation status:** leaderboard.py:57-58, 64 and 83: department_id None drops the filter, and scope becomes college. academics.py:249-259: same for /summary. staff-scope.md says no-department staff see nothing (400). list_student_videos does this correctly with an empty list (routes.py:810).

**Reproduction:** Code-confirmed; no seed login without a department. SELECT shows 2 such students exist in other tenants.

**Expected:** Student without department gets an empty board; staff get 400.

**Actual:** They see the college-wide leaderboard with names and scores, and college-wide structure counts.

**Proposed fix:** Use require_department for staff and an empty result for students.

**Regression test required:** No-department student, HOD and Faculty get empty or 400 from both routes.

**Dependencies / blockers:** None

### AUTHZ-021

**Voice lesson check answers 403, so it discloses other tenants' lesson ids**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Authorization |
| Affected module | voice_qna |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** simple.py: out-of-scope and missing lessons answer the same 404 and detail. The old 403 test was replaced by the integration test, since the expected status changed on purpose.

**Test:** tests/integration/test_tutor_access.py::test_other_college_and_random_id_look_identical, tests/voice_qna/test_p2_tutor_rules.py::test_refused_lookup_is_a_404_for_a_missing_user

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Voice lesson check answers 403, so it discloses other tenants' lesson ids.

**Root cause / investigation status:** simple.py:114-117 and 126-129 return 403 for another department or college; a missing id gives 404 (simple.py:301, 486). tenant-scope.md requires 404 for anything outside scope.

**Reproduction:** Code-confirmed, POST only.

**Expected:** Out-of-scope and missing lessons both answer 404.

**Actual:** A caller can tell a real lesson or job id from a random one.

**Proposed fix:** Return the same 404.

**Regression test required:** Other-tenant lesson and random UUID give identical responses.

**Dependencies / blockers:** None

### BACKEND-002

**Committed migrations are broken: two revision 0040 files, and the fix (0045) is uncommitted**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Configuration/deployment |
| Affected module | alembic / deployment |
| Finding status | confirmed |
| Duplicates merged | DATA-001 |

**Phase 2 remediation (Blocked):** Added a test that history has one head and unique ids.

**Test:** tests/integration/test_platform_rules.py::test_one_linear_migration_history

**Evidence:** passes on the working tree; the defect is uncommitted state

**Blocked on:** Owner must commit the 0040 to 0045 rename or sync this branch with master. I may not change git state.

**Description:** Committed migrations are broken: two revision 0040 files, and the fix (0045) is uncommitted.

**Root cause / investigation status:** git ls-files shows alembic/versions/0040_qna_session_title.py and 0040_user_notifications.py both with revision='0040', down_revision='0039'. The working tree deletes the second and adds untracked 0045_user_notifications.py. Dockerfile:39 runs 'alembic upgrade head' at container start, from what is committed.

**Reproduction:** 1. git status in E:\b2b\b2b_projectk: ' D 0040_user_notifications.py', '?? 0045_user_notifications.py'. 2. git show HEAD:alembic/versions/0040_user_notifications.py shows revision 0040. Upgrade on a clean checkout was not run (read-only audit).

**Expected:** HEAD holds one linear history ending at 0045.

**Actual:** A deploy from git has a duplicate revision id, so one of the two 0040 migrations (qna title or user_notifications) can be skipped; the bell or /voice_qna endpoints then fail on a missing table or column. 0045 exists only on this machine.

**Proposed fix:** Commit the rename when the owner allows it; add a CI check that 'alembic heads' returns one head and that revision ids are unique.

**Regression test required:** CI test: alembic upgrade head on an empty database, then compare with the models.

**Dependencies / blockers:** Owner must approve the commit.

**Verification:** partially: Local branch arun_master_24082026 HEAD ed34cc5 does have two 0040 files. Remote master (0222129) has only 0040_qna_session_title plus 0041-0045 by gh api. Run 41208396845 'migration issue fixed' succeeded 2026-10-31T14:04Z. Local origin/master ref is stale at c522602. Note: Downgraded from High. Claims that 0045 exists only on this machine, and that any deploy from git breaks, are wrong for master. Only this dev branch lags. Fix: sync the branch with master.

### BACKEND-034

**Failed email rows keep one-time links in plain text, retries resend stale ones, retry runs inside the request**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | notifications |
| Finding status | confirmed |
| Duplicates merged | AUTH-016, DATA-026, INFRA-033 |

**Phase 2 remediation (Fixed):** One-time link and code events are never stored in the failed body and never retried; old bodies purged by _prune; retry claims each row (status retrying) so two clicks send once. Retry still runs inside the request (via to_thread) to keep the response the UI shows.

**Test:** tests/integration/test_platform_rules.py::test_one_time_links_are_not_stored_on_failure, ::test_retry_skips_stale_links_and_claims_once, ::test_old_stored_links_are_purged

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Failed email rows keep one-time links in plain text, retries resend stale ones, retry runs inside the request.

**Root cause / investigation status:** _record keeps the body when status=failed (notification_service.py:408) with no purge. retry_failed_sync (:648-697) resends 7-day-old password-reset and activation links and verification codes. retry-failed runs up to 200 sends in one request (notifications.py:229); SMTP timeout is 30 s each. No lock, so two clicks send twice.

**Reproduction:** Code review. Live: 0 failed rows today (POST not sent).

**Expected:** Secrets are not stored, or are purged; time-limited mails are not retried.

**Actual:** Tokens sit in the table; a user may get an expired link.

**Proposed fix:** Exclude mandatory token events from retry (issue new ones), purge bodies, run the retry as a background job with a claim.

**Regression test required:** Retry skips password_reset; two concurrent retries send once.

**Dependencies / blockers:** None

### BACKEND-035

**In-app docs promise all 15 events and an inbox row for test sends; code delivers 8 events and none for tests**

| Field | Value |
|---|---|
| Status | Accepted |
| Severity | Low |
| Category | Integration |
| Affected module | notifications |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** No change.

**Owner decision (3 Nov 2026):** accepted as is per [OWNER_DECISIONS.md](OWNER_DECISIONS.md).

**Test:** not applicable

**Evidence:** code confirmed, no change

**Decision needed:** Which events belong in the bell: the 8 today or all 15 (adding account, role and placement events)? Should Send a test write an inbox row? Then the catalogue or docs/knowledge/api/notifications.md follows.

**Description:** In-app docs promise all 15 events and an inbox row for test sends; code delivers 8 events and none for tests.

**Root cause / investigation status:** docs/knowledge/api/notifications.md section 'In-app / desktop (all 15 catalogue events)' and 'Send a test ... an inbox row'. notification_catalog.py gives in_app to 8 events; notification_events.py calls _inbox only for those; send_test_sync (notification_service.py:636-643) writes only a delivery. scenarios.js maps 15.

**Reproduction:** Code review. Live: user_notifications is empty while notification_deliveries holds 132 rows.

**Expected:** Docs and code agree.

**Actual:** Account, role and placement events never reach the bell, and 'Send a test' never appears there.

**Proposed fix:** Decide in-app coverage; update the catalogue or docs; add an inbox write to test sends if wanted.

**Regression test required:** Each catalogue event with in_app creates one inbox row.

**Dependencies / blockers:** None

### BACKEND-036

**Provider error text is shown to users and emailed**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | edu_video / notifications |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New app/edu_video/job_errors.py: public_error maps exceptions to a plain sentence, PublicJobError separates the sentence from the detail. pipeline.py stores only that; the raw text goes to the log (and so the health page). /jobs, /status and the e-mail read the clean column.

**Test:** tests/edu_video/test_p2_pipeline.py::test_a_provider_error_never_reaches_the_job_row, ::test_a_failed_export_stores_only_the_plain_sentence

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Blocked on:** Existing FAILED rows keep their old text: owner may want a one-off UPDATE (not run; no dev-database writes).

**Description:** Provider error text is shown to users and emailed.

**Root cause / investigation status:** run_pipeline stores str(e) (pipeline.py:~331-333); it is returned by /jobs and /status (routes.py:758,997), put in the uploader's inbox and email as 'reason' (notification_events.py:507,514).

**Reproduction:** Live: a FAILED job holds text naming an LLM provider with a billing-related HTTP error.

**Expected:** A plain message for users; the detail stays in logs.

**Actual:** Internal vendor and billing details reach College Admins.

**Proposed fix:** Map exceptions to safe messages; keep raw text in a staff-only field.

**Regression test required:** Provider error: API response has only the friendly message.

**Dependencies / blockers:** None

### BACKEND-037

**Report PDF subtitle is not escaped for institution names**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | API defect |
| Affected module | reports |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** PDF subtitle and text cells escaped; text cells wrap in Paragraphs with computed column widths.

**Test:** tests/integration/test_api_rules.py::test_pdf_survives_markup_in_a_name

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Report PDF subtitle is not escaped for institution names.

**Root cause / investigation status:** reports.py:621-622 passes subtitle with college and department names into a reportlab Paragraph without escape(), unlike mcq routes. Table cells are plain strings with no wrapping or colWidths, so long names can run off the page.

**Reproduction:** Not executed with such a name; standard PDF with current data returned 200.

**Expected:** Any name renders.

**Actual:** A name with '<' may raise a parser error (500); wide tables are clipped.

**Proposed fix:** Escape the subtitle; use Paragraph cells and computed widths.

**Regression test required:** Institution 'A<B & Co' exports to PDF.

**Dependencies / blockers:** None

### BACKEND-038

**Invalid range values are accepted silently on reports and dashboard**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | API defect |
| Affected module | reports / dashboard |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** reports.check_range gives 400 on preview, download and dashboard.

**Test:** tests/integration/test_api_rules.py::test_unknown_range_is_400

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Invalid range values are accepted silently on reports and dashboard.

**Root cause / investigation status:** reports._since falls back to 30 days (:125-138); preview echoes the bad value (:539). analytics.py rejects with 400.

**Reproduction:** Live: /reports/preview?range=garbage and /dashboard?range=garbage return 200; /analytics/department?range=garbage returns 400.

**Expected:** 400 everywhere.

**Actual:** Inconsistent status, and the UI may label the wrong period.

**Proposed fix:** Validate against RANGES in a shared dependency.

**Regression test required:** range=garbage gives 400 on every route.

**Dependencies / blockers:** None

### BACKEND-039

**Date logic uses UTC, not IST**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | reports / audit |
| Finding status | confirmed |
| Duplicates merged | DATA-029 |

**Phase 2 remediation (Fixed):** app/utils/ist.py; this_semester boundary, export dates, filenames, generated date and audit 'today' use IST.

**Test:** tests/integration/test_api_rules.py::test_ist_day_boundary, ::test_exported_date_is_the_ist_date, ::test_this_semester_starts_at_ist_midnight

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Date logic uses UTC, not IST.

**Root cause / investigation status:** _since this_semester uses UTC boundaries (reports.py:132-135); date.today() in filenames and 'generated' (:698,:701) uses server time; _cell date (:551-555) formats the UTC date; audit 'today' is UTC midnight. mcq PDF does use IST.

**Reproduction:** Code review: activity at 02:00 IST shows as the previous day in exports.

**Expected:** IST for an India product.

**Actual:** Dates are off by one for 00:00-05:30 IST.

**Proposed fix:** Convert with a shared IST helper.

**Regression test required:** Boundary test at 18:45 UTC.

**Dependencies / blockers:** None

### BACKEND-041

**student_detail pass_rate covers only the latest 20 attempts**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | faculty_directory |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** pass_rate comes from a separate aggregate over all in-scope attempts.

**Test:** tests/integration/test_api_rules.py::test_student_detail_pass_rate_uses_every_attempt

**Evidence:** failed before: run against unfixed code; passes now

**Description:** student_detail pass_rate covers only the latest 20 attempts.

**Root cause / investigation status:** faculty_directory.py:310,322,331 LIMIT 20 then computes pass_rate from that list; metrics use all attempts.

**Reproduction:** Code review with a student above 20 quizzes.

**Expected:** Pass rate over all attempts.

**Actual:** The figure disagrees with the metrics block next to it.

**Proposed fix:** Compute with a separate aggregate.

**Regression test required:** 25 attempts fixture.

**Dependencies / blockers:** None

### BACKEND-042

**Ingestion reconciliation sees only the newest 200 jobs, and work on deleted jobs continues**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | voice_qna / ingestion_worker |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/voice_qna/services/ingestion_worker.py: reconciliation is an anti-join (unlinked jobs only), and a deleted job's lesson is marked failed instead of paying for embeddings.

**Test:** tests/integration/test_chapter_workflow.py::test_an_old_unlinked_job_is_registered_behind_many_newer_ones (batch size patched to 2 with 3 newer linked jobs)

**Evidence:** failed before: code selected newest N regardless of link; passes now

**Description:** Ingestion reconciliation sees only the newest 200 jobs, and work on deleted jobs continues.

**Root cause / investigation status:** ingestion_worker.py:101-105 selects newest 200 with no 'unlinked' filter, so the comment 'picked up on a later tick' is false once 200 newer jobs exist. _process_due_lessons loads the job without deleted_at, paying for embeddings.

**Reproduction:** Code review.

**Expected:** All unlinked jobs drain.

**Actual:** Older missing lessons are never registered.

**Proposed fix:** Use an anti-join against lessons; skip deleted jobs.

**Regression test required:** Seed 250 jobs with an old unlinked one.

**Dependencies / blockers:** None

### BACKEND-043

**Recovery counter is lifetime, and legacy pre-render endpoints stay live**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | edu_video / job_recovery |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/edu_video/job_recovery.py counts RESUMED events since the last PENDING/DONE/FAILED event. run_pipeline claims AWAITING_REVIEW to RENDERING and only the winner renders. A stale AWAITING_REVIEW job is now recovered. Legacy routes stay (removing them is an API change).

**Test:** tests/integration/test_chapter_workflow.py::test_a_regenerate_after_three_restarts_survives_the_next_one, ::test_a_job_that_keeps_dying_still_gives_up, tests/edu_video/test_p2_pipeline.py::test_a_stale_awaiting_review_job_is_resumed

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Recovery counter is lifetime, and legacy pre-render endpoints stay live.

**Root cause / investigation status:** recover_stalled_jobs counts all RESUMED events for a job (job_recovery.py:136-138), never reset by regenerate. PUT /plan, /submit and /send_to_teacher remain though AWAITING_REVIEW is transient (pipeline.py docstring). A /submit in that instant and run_pipeline's own RENDERING update (pipeline.py:341-345) can start two renders; a worker dying there leaves AWAITING_REVIEW, which recovery ignores (IN_FLIGHT).

**Reproduction:** Code review.

**Expected:** Attempts count per render; one state machine.

**Actual:** An old job with 3 restarts fails at once on its next restart; rare double render or stuck job.

**Proposed fix:** Count resumes since the last PENDING or regenerate; make run_pipeline claim AWAITING to RENDERING; remove or wire the legacy routes.

**Regression test required:** Regenerate after 3 resumes survives one restart.

**Dependencies / blockers:** None

### BACKEND-046

**Academic edge cases: resize re-enables semesters, reactivation skips checks**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | academics |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Resize keeps manual semester flags and only revives semesters newly in range; chapter reactivation checks clashes; add_semester needs an active programme; programme reactivation needs an active department.

**Test:** tests/integration/test_api_rules.py::test_resize_keeps_a_manual_semester_deactivation, ::test_chapter_reactivation_checks_for_a_clash, ::test_inactive_parents_block_children

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Academic edge cases: resize re-enables semesters, reactivation skips checks.

**Root cause / investigation status:** _sync_semesters reactivates all of 1..N (academics.py:402-404), undoing a manual deactivate. update_chapter reactivates with no clash check although duplicates are only barred among active chapters (:648-652,:686-687). add_semester works on inactive programmes (:463-466), and a later resize deactivates it. Reactivating a programme ignores its department.

**Reproduction:** Code review.

**Expected:** Consistent state.

**Actual:** Duplicate titles and unexpected active semesters.

**Proposed fix:** Keep manual flags; check clashes on reactivate; check the parent.

**Regression test required:** Each sequence.

**Dependencies / blockers:** None

### BACKEND-047

**MCQ generate: database errors return 400, runs on non-DONE jobs and holds the HTTP request**

| Field | Value |
|---|---|
| Status | Accepted |
| Severity | Low |
| Category | API defect |
| Affected module | mcq |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Done: DatabaseError answers 503; a job that is not DONE, or deleted, answers 409 before any model call (JobNotReadyError). Not done: the model call still runs inside the request.

**Owner decision (3 Nov 2026):** accepted as is per [OWNER_DECISIONS.md](OWNER_DECISIONS.md).

**Test:** tests/integration/test_mcq_rules.py::test_a_job_with_no_finished_video_cannot_generate, ::test_a_database_fault_is_503_not_400

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Decision needed:** Move generation to a background job with polling? It changes the response of POST /mcq/jobs/{id}/generate and needs the frontend, which waits up to 120 s today.

**Description:** MCQ generate: database errors return 400, runs on non-DONE jobs and holds the HTTP request.

**Root cause / investigation status:** mcq/api/routes.py:181-182 maps every MCQAppException, including DatabaseError, to 400. MCQGenerationService.generate has no job status or deleted check. The OpenAI call runs in the request (openai_service: 60 s with 2 retries), beyond typical proxy timeouts.

**Reproduction:** Code review.

**Expected:** 500 or 503 for DB faults; 409 for jobs not ready; background generation.

**Actual:** Misleading status; the client may time out while generation continues.

**Proposed fix:** Map DatabaseError to 503; require a usable job; move generation to a background job with polling.

**Regression test required:** Failed job generate gives 409.

**Dependencies / blockers:** None

### BACKEND-048

**Voice API docs differ from code**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Integration |
| Affected module | voice_qna |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/voice_qna/api/simple.py _ensure_student_caller: staff get 403 before any lesson lookup on /conversation and /chat, matching the docs and the UI (only the student portal mounts the tutor). Module header corrected.

**Test:** tests/integration/test_tutor_access.py::test_faculty_may_not_use_the_tutor

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Blocked on:** docs/knowledge/api/voice-qna.md: change the 30 s timeout to 40 s (not mine).

**Description:** Voice API docs differ from code.

**Root cause / investigation status:** docs/knowledge/api/voice-qna.md lists student only, but simple.py checks department only, so faculty and HOD pass. Doc says 30s timeout; text_chat_service.py REPLY_DEADLINE_SECONDS is 40. Header of simple.py still says 4 endpoints.

**Reproduction:** Code review.

**Expected:** Docs match.

**Actual:** Staff can spend paid tutor calls; docs mislead.

**Proposed fix:** Restrict to students or update docs.

**Regression test required:** Faculty /chat gives 403 if restricted.

**Dependencies / blockers:** None

### BACKEND-049

**Swagger and OpenAPI are public; some edu_video metadata routes have no auth**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | main |
| Finding status | confirmed |
| Duplicates merged | AUTH-019, AUTHZ-018, INFRA-030 |

**Phase 2 remediation (Fixed):** app/main.py api_docs_urls: /api/docs and /api/openapi.json exist only for local environments (same allow-list as is_local), so staging is off too. /voice_qna/health stays public as a health probe.

**Test:** tests/integration/test_platform_limits.py::test_api_docs_only_exist_locally

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** Swagger and OpenAPI are public; some edu_video metadata routes have no auth.

**Root cause / investigation status:** main.py:48-49 sets docs_url and openapi_url with no environment gate. edu_video/routes.py:633-652 themes, designs, avatars have no dependency. CLAUDE.md says /docs is 404, which is true only for that exact path.

**Reproduction:** Live, no cookie: /api/docs 200, /api/openapi.json 200 (164 KB), /edu_video/themes 200, /edu_video/avatars 200, /voice_qna/health 200.

**Expected:** Docs off in production.

**Actual:** The full route map, including /setup/superadmin, is public.

**Proposed fix:** Disable by ENVIRONMENT; add get_current_user to metadata routes.

**Regression test required:** Production settings: /api/docs 404.

**Dependencies / blockers:** None

### BACKEND-050

**create_user and update_user accept inconsistent placement**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | users |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Students need a college and department on create; staff PATCH ignores academic fields; null names refused; bulk import keeps the department name. POST department with hod_user_id still gets 422: correct, since a new department has no members.

**Test:** tests/integration/test_api_rules.py::test_student_needs_a_department, ::test_staff_patch_ignores_academic_fields, ::test_user_patch_rejects_null_name, ::test_bulk_import_keeps_the_department_name

**Evidence:** failed before: run against unfixed code; passes now

**Description:** create_user and update_user accept inconsistent placement.

**Root cause / investigation status:** create_user allows a student with no tenant (users.py:337 skips the check) or with a programme and no department (_resolve_academic only compares when department_id is set, :122). update_user applies program_id unvalidated for non-students (:458 guards students only), so a bad id gives an FK 500. Explicit first_name:null clears the name. Bulk import omits legacy department; create keeps it. POST department with hod_user_id can never pass assert_hod_eligible for a new department.

**Reproduction:** Code review. Live: 2 students without a department.

**Expected:** Same rules as bulk import.

**Actual:** Students with programme but no department see an empty classroom.

**Proposed fix:** Require tenant and department for students; ignore academic fields for staff; reject null names.

**Regression test required:** Schema tests per role.

**Dependencies / blockers:** None

### BACKEND-051

**Uncaught unique-violation races**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | API defect |
| Affected module | users / departments / academics |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** IntegrityError gives 409 in create_user, bulk_import, create_department; colleges and universities refresh current_user after the code-retry rollback.

**Test:** tests/integration/test_api_rules.py::test_parallel_create_with_one_email_gives_one_409, ::test_code_retry_keeps_the_audit_actor

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Uncaught unique-violation races.

**Root cause / investigation status:** create_user, bulk_import and create_department have no IntegrityError handling. colleges.py:262-264 and universities.py:244-246 roll back then use current_user in record_audit; rollback expires it, so async lazy load may raise MissingGreenlet. resolve_code advisory lock makes this rare.

**Reproduction:** Not reproduced (no concurrent POST).

**Expected:** 409.

**Actual:** 500 on rare races.

**Proposed fix:** Catch IntegrityError; capture actor fields before retry.

**Regression test required:** Concurrent create with the same email.

**Dependencies / blockers:** None

### BACKEND-052

**Quiz PDF bands do not match the pass mark**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | mcq |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/mcq/api/routes.py: score_band uses 80 and 60, the same as college_insights.

**Test:** tests/integration/test_mcq_rules.py::test_55_percent_is_not_called_good_progress

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Quiz PDF bands do not match the pass mark.

**Root cause / investigation status:** routes.py:446 labels 50-74 'Good progress'; PASS_MARK is 60; design bands in college_insights.py:310 use 60 and 80.

**Reproduction:** Code review: 55% prints 'Good progress' but counts as failed.

**Expected:** One threshold set.

**Actual:** Student and teacher see different meanings.

**Proposed fix:** Share constants.

**Regression test required:** 55% case.

**Dependencies / blockers:** None

### DATA-019

**N+1 queries and unpaginated list endpoints**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | users, academics, colleges, universities, departments, edu_video, reports |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New app/services/batch_lookup.py. Batched: GET /users, /academics/programs, /departments, /colleges, /universities. Query count no longer grows with rows. list_programs stays unpaginated, /staff-subjects has no limit, and reports._students still loads the whole scope: adding limits would break callers that expect the full list.

**Test:** tests/integration/test_read_models.py::test_lists_run_the_same_queries_for_more_rows, test_platform_lists_run_the_same_queries_for_more_rows

**Evidence:** failed before: run on the unfixed code (18 of 21 failed); passes now: pytest

**Description:** N+1 queries and unpaginated list endpoints.

**Root cause / investigation status:** Per-row awaits: users.py:269 (tenant, department and academic names, up to 100 rows), academics.py:323 (_program_out runs 5 queries per programme and list_programs has no limit), colleges.py:192, universities.py:87, departments.py:129. edu_video routes.py:782 calls scene_progress per job, loading all scene rows. academics /staff-subjects has no limit, and reports._students loads all students in scope.

**Reproduction:** Read code. Query counts not captured; local volume is too small to show latency.

**Expected:** Batched lookups and bounded lists.

**Actual:** Query count grows linearly with rows.

**Proposed fix:** Batch with IN/group-by as _mcq_states already does; paginate list_programs; aggregate scene counts in SQL.

**Regression test required:** Query-count assertion per endpoint.

**Dependencies / blockers:** None

### DATA-020

**Watch progress first write race and lost update**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | edu_video watch progress |
| Finding status | suspected |
| Duplicates merged | BACKEND-045 |

**Phase 2 remediation (Fixed):** app/edu_video/routes.py: an existing row is refreshed with FOR UPDATE, so concurrent heartbeats serialise and the later one sees the higher percent; a lost first-insert race is caught and answered from the row that won.

**Test:** tests/integration/test_chapter_workflow.py::test_two_first_heartbeats_both_answer, ::test_a_late_heartbeat_cannot_lower_the_percent

**Evidence:** failed before: IntegrityError path unhandled; passes now

**Description:** Watch progress first write race and lost update.

**Root cause / investigation status:** upsert_watch_progress (routes.py:910-953) reads, then inserts or sets in Python. Two first heartbeats: the second hits uq_video_watch_progress_user_job with no IntegrityError handling, giving a 500. Two updates: the later commit can write a lower percent, breaking the monotonic rule in the model docstring.

**Reproduction:** Not reproduced. Two tabs or a retry send simultaneous PUTs on a new row.

**Expected:** Atomic upsert with GREATEST.

**Actual:** Occasional 500, and a brief percent regression (next heartbeat recovers).

**Proposed fix:** INSERT ... ON CONFLICT DO UPDATE SET percent = GREATEST(...).

**Regression test required:** Concurrent PUT test on real Postgres.

**Dependencies / blockers:** None

### DATA-021

**Migration downgrades are unsafe or impossible**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Database integrity |
| Affected module | alembic/versions |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Added a real downgrade/upgrade test across 0047 and 0048.

**Test:** tests/integration/test_platform_rules.py::test_recent_migrations_go_down_and_up

**Evidence:** new test only

**Blocked on:** docs (forward-only policy and rollback runbook) and alembic/versions/0029 downgrade are outside my ownership.

**Description:** Migration downgrades are unsafe or impossible.

**Root cause / investigation status:** 0024 downgrade raises NotImplementedError, so nothing below 0024 can be reached. 0005 downgrade is 'pass' despite schema changes. 0029 downgrade sets option_c/option_d NOT NULL, which fails on true_false rows, and keeps only the first correct option. 0010 downgrade deletes role 'hod' while users may hold it. 0003 downgrade drops extension vector. Many revisions drop data columns without warning.

**Reproduction:** Read downgrade() in each file. Not executed.

**Expected:** Documented forward-only policy or working downgrades.

**Actual:** A rollback beyond the last few revisions is not reliable. No rollback runbook; backup is the only safe path.

**Proposed fix:** State the forward-only policy; make 0029 safe; test downgrade of recent revisions.

**Regression test required:** upgrade head / downgrade -1 / upgrade head on a scratch DB in CI.

**Dependencies / blockers:** A disposable test database

### DATA-023

**No purge for expired tokens; error table has no flood control**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Database integrity |
| Affected module | auth tokens / ops_monitor |
| Finding status | confirmed |
| Duplicates merged | AUTH-026 |

**Phase 2 remediation (Fixed):** ops_monitor._prune removes expired tokens and old throttle rows; record_error stores at most 20 of one fingerprint per minute. Revoked unexpired refresh tokens stay for replay detection.

**Test:** tests/integration/test_platform_rules.py::test_prune_removes_dead_tokens_and_keeps_live_ones, ::test_one_error_loop_is_capped_per_minute

**Evidence:** failed before: run against unfixed code; passes now

**Description:** No purge for expired tokens; error table has no flood control.

**Root cause / investigation status:** refresh_tokens and auth_tokens have no cleanup path (grep finds only the invite-cancel delete at users.py:559). ops_monitor._prune covers only health checks and error events (ops_monitor.py:211-215). record_error has a fingerprint but stores every occurrence.

**Reproduction:** Live: refresh_tokens 1099 rows (178 expired, 907 revoked, 128 live); auth_tokens 20 of 20 dead. platform_error_events 13,521 rows, 17 MB and the largest table: 13,090 Voice tutor errors on one day (2026-10-14) from 9 fingerprints overall.

**Expected:** Scheduled retention and per-fingerprint throttling.

**Actual:** Token tables grow indefinitely. One failure loop writes thousands of rows until the 30-day prune.

**Proposed fix:** Add token purge to the ops loop; store a count per fingerprint per minute.

**Regression test required:** Prune test and flood test on record_error.

**Dependencies / blockers:** None

### DATA-024

**Missing indexes on foreign keys and frequent filters**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | Schema |
| Finding status | confirmed |
| Duplicates merged | UX-030 |

**Phase 2 remediation (Fixed):** Migration 0048 adds the FK indexes plus partial job indexes. No volume EXPLAIN was run.

**Test:** tests/integration/test_platform_rules.py::test_listed_indexes_exist

**Evidence:** temporary test at revision 0047 showed bad seat cap, year, role and a cross-college chapter were accepted and the indexes absent (passed, then deleted); the constraint tests pass at head; query plans on volume not measured

**Description:** Missing indexes on foreign keys and frequent filters.

**Root cause / investigation status:** FKs with no leading index: edu_video_jobs.changes_requested_by_user_id, published_by_user_id, sent_to_hod_by_user_id; edu_video_review_events.actor_user_id; livekit_sessions.resume_id; mcq_attempt_resets.reset_by_user_id; notification_rules.updated_by. These force scans on user delete with SET NULL. edu_video_jobs has no index on status, deleted_at, published_at or created_at, though list_jobs filters on them. tenant_id indexes exist on users and jobs, so basic tenant scoping is fine.

**Reproduction:** pg_index query on pg_constraint; pg_indexes for edu_video_jobs lists only pkey, tenant_id, created_by_user_id, department_id, chapter_id.

**Expected:** Indexes for FK columns and the student and review lists.

**Actual:** Harmless at 13 jobs; will degrade with volume.

**Proposed fix:** Add partial index (tenant_id, department_id, published_at) WHERE deleted_at IS NULL, plus FK indexes.

**Regression test required:** EXPLAIN check on seeded volume.

**Dependencies / blockers:** None

### DATA-025

**Hard-coded credentialed DATABASE_URL default, and URL echoed in exceptions**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | app/config.py, app/db/async_session.py, app/voice_qna/db.py |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** DATABASE_URL is now required (no built-in default) in app/config.py. app/db/async_session.py no longer echoes the URL. A deployment with no DATABASE_URL now refuses to start.

**Test:** tests/integration/test_platform_limits.py::test_database_url_has_no_built_in_default, test_bad_database_url_is_not_echoed

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** Hard-coded credentialed DATABASE_URL default, and URL echoed in exceptions.

**Root cause / investigation status:** app/config.py:18 default for DATABASE_URL embeds a password (value not reproduced). async_session.py:31 and voice_qna/db.py (_async_database_url) raise RuntimeError containing the full URL with !r.

**Reproduction:** Inspect the field default (checked programmatically for a password component). Read the raise statements.

**Expected:** No default credentials; errors never include the URL.

**Actual:** A missing env var silently uses default credentials. A malformed URL prints the password into logs and possibly platform_error_events.

**Proposed fix:** Make DATABASE_URL required; redact in messages.

**Regression test required:** Settings fail without the variable.

**Dependencies / blockers:** Overlaps SECURITY area

### DATA-027

**attempt reset has no lock; double submit returns 500**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | mcq |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** app/mcq/api/routes.py reset_attempt: conditional DELETE ... RETURNING decides the winner and shares a transaction with the reset record; the loser gets 404 and writes nothing.

**Test:** tests/integration/test_mcq_rules.py::test_the_second_reset_is_a_clean_404, tests/mcq/test_question_editing.py::test_resetting_an_attempt_deletes_it_and_keeps_an_audit_row_with_the_cleared_score

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** attempt reset has no lock; double submit returns 500.

**Root cause / investigation status:** reset_attempt (mcq/api/routes.py:670-682) uses an unlocked document and ORM delete. Two concurrent resets: the second raises StaleDataError on commit (no handler) and could write a second reset record first. Other MCQ edits use lock=True.

**Reproduction:** Not reproduced. Double-click Reset.

**Expected:** One reset and a clean 404 for the second.

**Actual:** 500 possible.

**Proposed fix:** Use a conditional DELETE and check rowcount, with the reset row in the same transaction.

**Regression test required:** Concurrent reset test.

**Dependencies / blockers:** None

### DATA-028

**Two published videos on one chapter; no rule in the schema**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Database integrity |
| Affected module | edu_video |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Nothing changed.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** depends on the rule

**Evidence:** not applicable

**Decision needed:** One published video per chapter, or several by design? If one: partial unique index on chapter_id WHERE published_at IS NOT NULL AND deleted_at IS NULL (agent api), a replace flow, and a decision for the 1 chapter that already has 2.

**Description:** Two published videos on one chapter; no rule in the schema.

**Root cause / investigation status:** No unique constraint or publish check on chapter_id. Knowledge docs state 'per chapter video' for MCQ but no one-video rule was found.

**Reproduction:** Live: 1 chapter has more than 1 published live job (2 jobs).

**Expected:** To be decided by owner: one published video per chapter, or several by design.

**Actual:** Students see two entries, each with separate watch and quiz records.

**Proposed fix:** If one is intended, add a partial unique index on chapter_id WHERE published_at IS NOT NULL AND deleted_at IS NULL, and a replace flow.

**Regression test required:** Publish second video behaviour per decision.

**Dependencies / blockers:** Owner decision

### FE-009

**Failures of supporting lookups are silent; some cards stay on Loading forever**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Frontend defect |
| Affected module | Admin/SA list pages, ChapterLinkModal, StudentPlacementFields, EduVideoContentStudio |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** useAsyncResource gains { lookup }: a failed supporting list shows one toast (not on 401/403). Inline errors: admin Students by department card (Try again), StudentPlacementFields, ChapterLinkModal. About 25 lookups across 14 files are named.

**Test:** src/lib/api/batch2.test.js::FE-009; browser check

**Evidence:** failed before: unit suite could not load, audit screenshot shows permanent Loading; passes now: unit tests plus Browser check on the production build at :3199 with all API calls mocked by Playwright route (fe_verify.cjs), no real data or writes: PASS: department card shows an error; PASS: card is not stuck on Loading

**Description:** Failures of supporting lookups are silent; some cards stay on Loading forever.

**Root cause / investigation status:** About 50 useAsyncResource calls destructure only data, e.g. admin/students/page.jsx:445, admin/staff/page.jsx:317, components/shared/StudentPlacementFields.jsx:16,24, ChapterLinkModal.jsx:26-43, EduVideoContentStudio.jsx:372-411. A failed lookup is indistinguishable from an empty list.

**Reproduction:** 1. CA session. 2. Force /api/v1/departments to 500. 3. Open /admin/students. Screenshot E:/b2b_superAdmin_frontend/.playwright-mcp/audit-fe-fail-departments.png.

**Expected:** An inline error with retry on the dependent card and dropdowns.

**Actual:** "Students by department" stays on "Loading…" indefinitely and no error is shown. By code, placement forms would read as "no programmes exist".

**Proposed fix:** Expose error from those lookups; show an inline error state on the dropdown or card.

**Regression test required:** Playwright: a lookup 500 shows an error and never a permanent Loading.

**Dependencies / blockers:** None

### FE-011

**Reset password button says Save & sign in but does not sign in**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Frontend defect |
| Affected module | src/app/auth/reset-password/page.js |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** No change. The label is on the reset-password card, a frozen auth surface (.cursor/rules/quirri-login-freeze.mdc lists it). Signing in after reset is not possible: the reset response has no session and the page does not know the e-mail.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** No automated test: no change made.

**Evidence:** Not changed.

**Decision needed:** May the button on /auth/reset-password change from "Save & sign in" to "Save password"? This is a copy change on a frozen surface.

**Description:** Reset password button says Save & sign in but does not sign in.

**Root cause / investigation status:** The submit label is "Save & sign in" but onSubmit only calls authApi.resetPassword and then shows "Go to sign in".

**Reproduction:** Code trace only (mutation not run).

**Expected:** The label matches the behaviour.

**Actual:** The user must still sign in manually.

**Proposed fix:** Change the label to "Save password", or sign in after reset.

**Regression test required:** Component test on the label and post-submit state.

**Dependencies / blockers:** Login UI freeze: owner approval for the copy change.

### FE-012

**Raw validator messages are shown to users on malformed URLs**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Frontend defect |
| Affected module | department detail, college detail, academics, faculty students |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** readableValidationParts in lib/api/errors.js hides path/query validator text in both error helpers and keeps body-field messages. isUuid/notFoundError in lib/utils.js; department detail and college detail treat a bad id as not found without a request; academics ignores bad college/department ids; faculty students falls back on bad status/program/semester/year.

**Test:** src/lib/api/batch2.test.js::FE-012; browser check on the four URLs

**Evidence:** failed before: unit suite could not load, audit reproduced the text on all four URLs; passes now: unit tests plus Browser check on the production build at :3199 with all API calls mocked by Playwright route (fe_verify.cjs), no real data or writes: PASS: /admin/structure/departments/abc: no validator text; PASS: /admin/structure/departments/abc: no malformed request; PASS: /superadmin/colleges/abc: no validator text; PASS: /superadmin/colleges/abc: no malformed request; PASS: /superadmin/academics?college=abc: no validator text; PASS: /superadmin/academics?college=abc: no malformed request; PASS: /faculty/students?status=zzz: no validator text; PASS: /faculty/students?status=zzz: no malformed request

**Description:** Raw validator messages are shown to users on malformed URLs.

**Root cause / investigation status:** Error states print the API detail verbatim with no UUID or enum check before the call. The student assessment page already has this guard (UUID_RE in assessment/page.jsx).

**Reproduction:** Open /admin/structure/departments/abc, /superadmin/colleges/abc, /superadmin/academics?college=abc, /faculty/students?status=zzz.

**Expected:** A friendly not-found message.

**Actual:** Text such as "Input should be a valid UUID, invalid length…" and "String should match pattern …" is displayed; all four fire 422s.

**Proposed fix:** Validate ids and enum params before fetching; map 422 on route params to the not-found state.

**Regression test required:** Playwright on each URL: no Pydantic text is visible.

**Dependencies / blockers:** None

### FE-013

**MCQ deep links to a missing or removed chapter fail silently**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Frontend defect |
| Affected module | src/components/shared/McqReviewWorkspace.jsx |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** McqReview: once jobs load, a ?job= not in the chapter list shows the same toast as Video review and clears the param.

**Test:** Browser check with mocked API

**Evidence:** failed before: audit reproduced silent load; passes now: Browser check on the production build at :3199 with all API calls mocked by Playwright route (fe_verify.cjs), no real data or writes: PASS: /faculty/mcq?job=abc: message shown; PASS: /faculty/mcq?job=abc: param cleared; PASS: /admin/mcq?job=11111111-1111-4111-8111-111111111111: message shown; PASS: /admin/mcq?job=11111111-1111-4111-8111-111111111111: param cleared

**Description:** MCQ deep links to a missing or removed chapter fail silently.

**Root cause / investigation status:** McqReviewWorkspace.jsx:95,105 seeds selectedId from ?job= with no not-found handling; faculty/videos/page.jsx:165-181 by contrast shows a toast and clears the param.

**Reproduction:** Open /faculty/mcq?job=abc and /admin/mcq?job=<valid-format unknown uuid>.

**Expected:** A message that the chapter is gone, as on /faculty/videos.

**Actual:** The page loads normally with no message and ?job= stays in the URL, so a stale alert appears to do nothing.

**Proposed fix:** Reuse the videos page behaviour.

**Regression test required:** Playwright: unknown job on /faculty/mcq and /admin/mcq shows a message and clears the param.

**Dependencies / blockers:** None

### FE-014

**Bell deep links ignore the per-event map for jobs, so some alerts open the wrong page**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | src/lib/notifications/scenarios.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** scenarios.js: MCQ_EVENTS for faculty/admin, assessment_result uses the HREF table.

**Test:** src/lib/notifications/scenarios.test.js (table of 91 cases)

**Evidence:** failed before: 6 failed (faculty/admin assessment events); passes now: all.

**Description:** Bell deep links ignore the per-event map for jobs, so some alerts open the wrong page.

**Root cause / investigation status:** inboxItemHref (scenarios.js:166-187) branches on resource_id first and only special-cases mcq_ready_for_review, so faculty assessment_available and assessment_result go to /faculty/videos?job= although HREF maps them to /faculty/mcq and /faculty/students; admin assessment_available and assessment_result go to /admin/content instead of /admin/mcq and /admin/analytics.

**Reproduction:** Code trace. Call inboxItemHref({event:"assessment_result",resource_type:"edu_video_job",resource_id:id},"faculty").

**Expected:** The alert opens the page its table says.

**Actual:** It opens Video review.

**Proposed fix:** Add assessment events to the role branches.

**Regression test required:** Table-driven unit test of every event, portal and resource_type.

**Dependencies / blockers:** Whether the backend writes these events for faculty/admin rows was not checked.

### FE-015

**Bell actions do not refresh an open inbox page**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Frontend defect |
| Affected module | SystemNotificationInbox |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** SystemNotificationInbox listens to ALERTS_REFRESH and reloads silently; the hook dispatches it after markRead/markAllRead. Also fixed a crash found here: `markAll` was read during render before its const declaration, so the page threw a ReferenceError whenever unread_count > 0.

**Test:** Browser check with mocked API (scratchpad audit/fe_verify.cjs)

**Evidence:** failed before: code trace (no listener). The markAll ordering crash was found by code reading and not reproduced on the old build. Passes now: Browser check on the production build at :3199 with all API calls mocked by Playwright route (fe_verify.cjs), no real data or writes: PASS: page renders with an unread row (no page errors); PASS: row starts unread; PASS: bell Mark all as read updates the open page

**Description:** Bell actions do not refresh an open inbox page.

**Root cause / investigation status:** SystemNotificationInbox.jsx dispatches ALERTS_REFRESH but never listens for it; useSystemNotifications markRead/markAllRead do not dispatch it. The reverse direction (inbox to bell) works.

**Reproduction:** Code trace. 1. Open /faculty/notifications. 2. Open the bell and choose Mark all as read.

**Expected:** Rows on the page update.

**Actual:** Rows stay unread until reload.

**Proposed fix:** Add a listener in the inbox, and dispatch from the hook.

**Regression test required:** Playwright with mutations in a test tenant.

**Dependencies / blockers:** None

### FE-016

**Interview filter hides legitimate alerts containing the word mock while the badge still counts them**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | src/lib/product/interviewOff.js, useSystemNotifications |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** interviewOff.js gains isInterviewEvent (id only); bell (inboxPoller.isInboxRow), NotificationRules, ReportsWorkspace columns and superadmin/notifications filter by id. isInterviewOff stays for system text (health service names, dashboard metric titles, InsightsView reasons).

**Test:** src/lib/product/interviewOff.test.js

**Evidence:** failed before: suite failed to load; passes now: unit tests plus Browser check on the production build at :3199 with all API calls mocked by Playwright route (fe_verify.cjs), no real data or writes: PASS: mock-titled row is listed on the page; PASS: mock-titled row is also in the bell

**Description:** Interview filter hides legitimate alerts containing the word mock while the badge still counts them.

**Root cause / investigation status:** INTERVIEW_LABEL (interviewOff.js:7) matches the words mock and interview anywhere in free text. isInboxRow in useSystemNotifications.js tests event + label + title, and titles can contain chapter names. unread_count is not filtered.

**Reproduction:** Code trace: isInterviewOff("Mock test paper published") returns true.

**Expected:** Only interview events are filtered, by event id.

**Actual:** A chapter titled "Mock test…" or "Interview skills" disappears from the bell while the dot stays on. The inbox page does not filter, so the two surfaces disagree. The same regex is used by ReportsWorkspace, InsightsView and NotificationRules.

**Proposed fix:** Filter on the event id only, never on titles.

**Regression test required:** Unit test: a mock-titled assessment_available row stays listed.

**Dependencies / blockers:** None

### FE-017

**Faculty scope cache survives the password-change sign-out**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | AccountSettings.jsx, useAuth.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New src/lib/auth/signOut.js clearClientSession(); used by every logout path and AccountSettings signOutHere. Also clears voiceQnaToken, pk_user, pk_plan and quiz drafts.

**Test:** src/lib/auth/signOut.test.js::drops the faculty scope so the next user reloads it

**Evidence:** failed before: module missing, signOutHere did not clear the cache; passes now.

**Description:** Faculty scope cache survives the password-change sign-out.

**Root cause / investigation status:** useFacultyScope.js caches /faculty/me in module scope. Only RolePortalSidebar clears it. AccountSettings signOutHere and useAuth.logout use a soft router navigation without clearing it.

**Reproduction:** Code trace (needs a password change). 1. Faculty changes password. 2. An HOD signs in on the same tab without reload.

**Expected:** Scope reloads for the new user.

**Actual:** The previous user scope is used: the HOD sees the Faculty menu and a 404 on Staff and Reports until reload, or the reverse (APIs still enforce).

**Proposed fix:** Shared clearClientSession(), as in FE-005.

**Regression test required:** Same-tab user-switch Playwright test.

**Dependencies / blockers:** Same fix as FE-005.

### FE-019

**Unknown backend roles default to student**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Role/permission |
| Affected module | src/lib/auth/rbac.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** rbac.js mapUserTypeToRole returns null for empty or unknown values, so the isPortalRole refusal at login is reachable.

**Test:** src/lib/auth/rbac.test.js

**Evidence:** failed before: 5 failed (student returned); passes now.

**Description:** Unknown backend roles default to student.

**Root cause / investigation status:** mapUserTypeToRole (rbac.js:35-43) returns ROLES.STUDENT for empty or unknown values, so the isPortalRole rejection in auth/login/page.js is unreachable.

**Reproduction:** Code trace: mapUserTypeToRole("something_new") returns student.

**Expected:** An unknown role is rejected at login.

**Actual:** The user is routed to the student portal shell; the APIs still decide access.

**Proposed fix:** Return null for unknown roles.

**Regression test required:** Unit test on mapUserTypeToRole.

**Dependencies / blockers:** None

### FE-020

**Dropdown lookups fetch one page of 100 with no paging**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | all filter and picker lookups |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New src/lib/api/fetchAllPages.js, used at all dropdown and picker sites, student video lists and staff loads. One deliberate exception: college detail department report (reports preview, rows table, not a picker).

**Test:** src/lib/api/batch2.test.js::FE-020 (250 rows)

**Evidence:** failed before: suite failed to load; passes now.

**Description:** Dropdown lookups fetch one page of 100 with no paging.

**Root cause / investigation status:** 33 call sites hard-code a page size of 100 (backend le=100), e.g. admin/students/page.jsx:446; assessment/page.jsx uses listStudentVideos pageSize 100 for context. Only EduVideoContentStudio.jsx:58,77 pages through.

**Reproduction:** Code trace; seed data is too small to reproduce.

**Expected:** All options are reachable.

**Actual:** Beyond 100 rows, options silently vanish (e.g. Super Admin college filters).

**Proposed fix:** Shared fetchAllPages helper or a server-side search combobox.

**Regression test required:** Unit test with 101 mocked rows.

**Dependencies / blockers:** None

### FE-021

**In-progress quiz answers are lost on reload**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | src/components/shared/McqStudentQuiz.jsx |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New src/lib/student/quizDraft.js (sessionStorage per job, validated against the current questions, cleared on submit, already-attempted and sign-out); McqStudentQuiz saves and restores.

**Test:** src/lib/student/quizDraft.test.js (7 tests); browser reload check

**Evidence:** failed before: unit suite could not load; passes now: unit tests plus Browser check on the production build at :3199 with all API calls mocked by Playwright route (fe_verify.cjs), no real data or writes: PASS: answer recorded; PASS: answer survives a reload

**Description:** In-progress quiz answers are lost on reload.

**Root cause / investigation status:** Answers live only in component state (setAnswers); no storage or beforeunload guard was found. Submission itself is well guarded (confirm dialog, Retry-After).

**Reproduction:** Code trace. Answer questions and press F5.

**Expected:** Draft answers survive, or the user is warned.

**Actual:** All answers are gone with no warning.

**Proposed fix:** Save drafts per job in sessionStorage, or add a beforeunload prompt.

**Regression test required:** Playwright reload restores answers.

**Dependencies / blockers:** None

### FE-022

**Sign-out reports success even when the server call failed**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Authentication |
| Affected module | all logout paths |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** signOut() warns with a toast.error when /auth/logout fails (401 counts as already signed out); all four logout paths use it.

**Test:** src/lib/auth/signOut.test.js (4 tests)

**Evidence:** failed before: module missing; old paths swallowed errors; passes now.

**Description:** Sign-out reports success even when the server call failed.

**Root cause / investigation status:** useAuth.js logout and each sidebar handleLogout swallow errors from POST /auth/logout, then show a success toast.

**Reproduction:** Code trace (logout not run, per brief).

**Expected:** The user is warned that the session may still be active.

**Actual:** Client state clears and a success toast shows while the httpOnly cookies can stay valid.

**Proposed fix:** Warn on failure.

**Regression test required:** Mock logout 500: warning shown.

**Dependencies / blockers:** None

### FE-023

**useLiveRefresh fires two refreshes when a tab regains focus**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | src/hooks/useLiveRefresh.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New src/lib/refreshGate.js; useLiveRefresh gates visibilitychange and focus with a 5 s gap. The interval is not gated.

**Test:** src/lib/refreshGate.test.js

**Evidence:** failed before: module missing; passes now. Tests the gate, not the hook.

**Description:** useLiveRefresh fires two refreshes when a tab regains focus.

**Root cause / investigation status:** Both visibilitychange and focus call run with no debounce. The leaderboard page has its own 5 s guard (leaderboard/page.jsx:170-172); this hook does not.

**Reproduction:** Code trace.

**Expected:** One refresh.

**Actual:** Duplicate GETs each time the tab regains focus.

**Proposed fix:** Add the same minimum-gap guard.

**Regression test required:** Hook unit test.

**Dependencies / blockers:** None

### FE-024

**DM Sans still loads on every page, and Poppins 300 is loaded, against the font lock**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Frontend defect |
| Affected module | src/app/layout.js, src/lib/student/fonts.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Deleted src/lib/student/fonts.js, removed the layout import, dropped Poppins 300.

**Test:** src/app/fonts.test.js; production build

**Evidence:** failed before: 2/2 failed; passes now. Stale "#efefef" comment in student-b2c.css:6 left: src/styles is not mine.

**Description:** DM Sans still loads on every page, and Poppins 300 is loaded, against the font lock.

**Root cause / investigation status:** layout.js:17 imports dmSans and applies dmSans.variable on <html>; fonts.js loads DM Sans 400/500/600/700. No CSS uses --font-student (grep finds no consumers), so it is purely wasted. layout.js also requests Poppins 300, outside the 400/500/700 lock. student-b2c.css:6 has a stale comment naming canvas #efefef; the computed canvas is correct.

**Reproduction:** Grep font-student and DM Sans in src. Live: computed body font is Poppins on all 228 navigations.

**Expected:** Poppins only, at locked weights.

**Actual:** A second family and an extra weight are declared for every page, although rendering is correct.

**Proposed fix:** Delete fonts.js and the layout import; drop weight 300; fix the comment.

**Regression test required:** Check that no DM Sans font file is requested.

**Dependencies / blockers:** None

### INFRA-028

**LiveKit dev credentials tracked; production key name is the literal devkey**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | docker/egress.yaml, docker/livekit.yaml, .env.example, deploy.yml |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** docker/livekit.yaml has no keys (docker-compose.yml passes LIVEKIT_KEYS from .env), egress.yaml deleted, .env.example placeholder, deploy.yml derives the key name from the LIVEKIT_API_KEY secret.

**Test:** tests/integration/test_coverage_deploy_config.py::test_tracked_livekit_files_hold_no_secret_value; ::test_livekit_key_name_comes_from_the_secret

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed Secret stays in git history; rotation is INFRA-004 (coordinator). Local LiveKit needs `docker compose up -d livekit` once to pick up LIVEKIT_KEYS.

**Description:** LiveKit dev credentials tracked; production key name is the literal devkey.

**Root cause / investigation status:** docker/egress.yaml:6 and docker/livekit.yaml hold a literal dev secret, and .env.example has a different non-placeholder LIVEKIT_API_SECRET. app/config.py's comment says never to bake one into tracked source. deploy.yml hardcodes the key name devkey in generated YAML while LIVEKIT_API_KEY is a separate secret.

**Reproduction:** 1. Read those files (value not reproduced).

**Expected:** No secret values in tracked files, and one source for the key pair.

**Actual:** Harmless if production uses a different secret, which could not be checked. If the LIVEKIT_API_KEY secret is ever not devkey, dispatch and webhook verification both fail. Webhook signature verification itself is correct (livekit_service.py:165-185).

**Proposed fix:** Use placeholders and generate local values; derive the YAML key name from the secret.

**Regression test required:** Secret scan.

**Dependencies / blockers:** Rotation finding.

### INFRA-029

**EMAIL_TEST_RECIPIENT has no production guard**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Configuration/deployment |
| Affected module | app/services/notification_service.py:273 |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** deploy.yml writes EMAIL_TEST_RECIPIENT= empty explicitly.

**Test:** tests/integration/test_coverage_deploy_config.py::test_deploy_fixes_debug_off_and_leaves_no_test_redirect

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed

**Blocked on:** app/config.py: model_validator raising when ENVIRONMENT=production and EMAIL_TEST_RECIPIENT is set; plus a Settings test.

**Description:** EMAIL_TEST_RECIPIENT has no production guard.

**Root cause / investigation status:** apply_test_redirect sends every e-mail to the configured inbox whenever the value is set. It is set in the local .env. The deploy workflow does not write it, and .dockerignore keeps .env out of images, so production is currently unaffected.

**Reproduction:** 1. Read the function. 2. Check .env for presence only (value not read out).

**Expected:** A go-live cannot silently redirect real users' mail.

**Actual:** Only manual care prevents it. The Super Admin page does surface a test_redirect flag (notifications.py:116).

**Proposed fix:** Refuse the setting when ENVIRONMENT=production, or log a startup warning.

**Regression test required:** Settings test.

**Dependencies / blockers:** None

### INFRA-031

**Document text reaches the planner and MCQ prompts without an untrusted-data boundary**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Security |
| Affected module | app/mcq/services/openai_service.py, app/edu_video/stages/structurer.py, scripter.py |
| Finding status | suspected |

**Phase 2 remediation (Blocked):** Nothing changed: app code.

**Test:** None yet

**Evidence:** Not started.

**Blocked on:** app/mcq/services/openai_service.py:41 and app/edu_video/stages/structurer.py, scripter.py: wrap source text in delimiters and state it is data; add an eval fixture.

**Description:** Document text reaches the planner and MCQ prompts without an untrusted-data boundary.

**Root cause / investigation status:** _build_prompt (openai_service.py:41) and the structurer concatenate document text with no delimiter or 'treat as data' rule. The tutor prompt does have this (tutor_text.py rules 8 and 11). Not exploited, since it would need generation.

**Reproduction:** 1. Read the prompts. 2. grep for ignore, untrusted, injection found nothing in those pipelines.

**Expected:** Uploaded text cannot steer generation.

**Actual:** A crafted document could skew questions or answers. Staff review before publishing limits this. Outputs are schema-validated and React-escaped (no dangerouslySetInnerHTML in src), and generated text is XML-escaped in the SVG renderer, so no execution path was found.

**Proposed fix:** Wrap source text in delimiters and state it is data, for each pipeline.

**Regression test required:** Eval fixture with an embedded instruction.

**Dependencies / blockers:** None

### INFRA-035

**Repository and image hygiene**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Configuration/deployment |
| Affected module | Both repos |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Both .dockerignore extended; frontend .tmp-* deleted from disk and ignored; .playwright-mcp/ and /.next-*/ ignored; .gitattributes for *.sh.

**Test:** scripts/infra.test.mjs repository hygiene; tests/integration/test_coverage_deploy_config.py::test_dockerignore_keeps_local_data_out

**Evidence:** failed before: 26 of 27 static gates failed before the deploy edits; passes now: 27 passed

**Blocked on:** At commit time: `git rm --cached` the 3 .tmp-* files (frontend) and .idea/ (backend, 5 files). Owner: may the 40 tracked files in ProjectK_Client_Demo, client_UI_final, new_updated_design_four go?

**Description:** Repository and image hygiene.

**Root cause / investigation status:** Frontend tracks .tmp-cookies.txt (header only, no cookies), .tmp-dash.html, .tmp-dash2.html and about 40 files of old design folders. Backend tracks .idea/. Backend .dockerignore omits uploads, recordings, logs and graphify-out. Frontend .dockerignore omits .env*, .data, docs and .next-preview, so a local build would bake in those files (CI is unaffected, since the checkout is clean).

**Reproduction:** 1. git ls-files. 2. Read .dockerignore files.

**Expected:** Only source enters git and images.

**Actual:** A manual docker build on a dev machine could put resumes or local env values in an image.

**Proposed fix:** Delete the files, and extend both .dockerignore files.

**Regression test required:** Image content check.

**Dependencies / blockers:** None

### PIPE-014

**Quiz generator accepts questions that the reviewer rules reject**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | mcq / openai_service, validation |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/mcq/services/openai_service.py: _validate_item runs check_question on every generated item and drops failures; capped at MAX_QUESTIONS_PER_SET.

**Test:** tests/mcq/test_p2_generation.py::test_shapes_the_reviewer_rules_reject_are_dropped, ::test_the_set_is_capped

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Quiz generator accepts questions that the reviewer rules reject.

**Root cause / investigation status:** openai_service._validate_item:72-105 lacks checks that validation.check_question applies, although validation.py:2 says the same shape rules apply: all four answers correct, duplicate options, true/false not True/False, length limits, and MAX_QUESTIONS_PER_SET. A later edit of one field runs check_question on the whole question and fails on text the reviewer never wrote.

**Reproduction:** pipe_probe.py: _validate_item is True for a multiple with A-D correct, for duplicate options, and for true_false with Yes/No.

**Expected:** One rule set.

**Actual:** Poor questions reach review, and some cannot be edited without fixing other fields.

**Proposed fix:** Run check_question on generated items and drop failures. Enforce the 100 cap.

**Regression test required:** Each invalid shape is dropped from generator output.

**Dependencies / blockers:** None.

### PIPE-015

**Document-controlled text reaches the tutor's system prompt, and the material delimiter can be spoofed**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | voice_qna / tutor_text, qna_agent, text_chat_service |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** app/voice_qna/services/tutor_text.py: chapter_note puts the name in as one JSON-quoted line marked as data, length-limited (80). format_lesson_material uses a random per-call marker. The name stays in the system text, not a user-side block: moving it would change the voice agent's context.

**Test:** tests/voice_qna/test_p2_tutor_rules.py::test_a_hostile_file_name_stays_one_quoted_line_of_data, ::test_a_chunk_cannot_close_the_material_block. No live red-team set: paid calls.

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Document-controlled text reaches the tutor's system prompt, and the material delimiter can be spoofed.

**Root cause / investigation status:** chapter_name(lesson.title), an uploaded file name, goes into the system prompt unsanitised (qna_agent.py:189-192, text_chat_service.py:115-118). format_lesson_material (tutor_text.py:319-322) wraps chunks in plain '---' lines, and also puts source_filename in the block, so a document can contain its own '---' and text that looks like a following note. Prompt rule 8 and the 'contains no instructions' wording are the mitigation. Uploaders are staff, so exposure is limited. Not tested live (paid calls).

**Reproduction:** Not run. Upload a document containing '---' plus an instruction, then ask about it.

**Expected:** Document content cannot pass as system text.

**Actual:** Separation relies on model behaviour alone.

**Proposed fix:** Put the chapter name in a user-side data block with length and character limits, use a random per-call delimiter or JSON-encoded chunks, and strip that delimiter from content.

**Regression test required:** Unit test that hostile titles and chunks stay inside the data block. Add a red-team set for the tutor.

**Dependencies / blockers:** INFRA-031 covers the video and MCQ prompts.

### PIPE-016

**Tutor keyword fallback does not work for Tamil questions**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | voice_qna / retrieval_service |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/voice_qna/services/retrieval_service.py: topic_words uses exam_focus._words, with Tamil stop words.

**Test:** tests/voice_qna/test_p2_tutor_rules.py::test_tamil_topic_words_stay_whole, ::test_english_topic_words_are_unchanged

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Tutor keyword fallback does not work for Tamil questions.

**Root cause / investigation status:** retrieval_service.py:104 uses [^\W\d_]{3,}. Tamil vowel signs are not word characters in Python, so words break into short pieces. exam_focus._words:52-66 already documents and solves this. The English translation is searched first, so only Tamil-language lessons lose the fallback.

**Reproduction:** pipe_probe.py: topic_words on a Tamil question returns [].

**Expected:** Tamil topic words reach the keyword lookup.

**Actual:** A short Tamil question the vector search misses gets the refusal line.

**Proposed fix:** Reuse exam_focus._words in topic_words, and add Tamil stop words.

**Regression test required:** topic_words returns whole Tamil words.

**Dependencies / blockers:** None.

### PIPE-017

**Text chat can hold a database connection during the model call**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | voice_qna / api/simple.py, text_chat_service |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** simple.py commits after the reads, returning the connection before the model call; text_chat_service runs each lesson search in its own short session.

**Test:** tests/voice_qna/test_p2_tutor_rules.py::test_the_connection_is_released_before_the_model_is_called. No concurrency load test.

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** Text chat can hold a database connection during the model call.

**Root cause / investigation status:** api/simple.py:492-497 reads with the request session then waits on reply_within_deadline for up to 40 s with no commit, so the SQLAlchemy transaction keeps its connection while OpenAI answers. Pool is 10+20 with a 30 s wait (db.py:60-62). Not load tested.

**Reproduction:** Not run: 31 concurrent slow chats would exhaust the pool and affect all voice routes.

**Expected:** No connection held across a network call.

**Actual:** A class using chat together can queue or fail requests.

**Proposed fix:** Commit or close after reads, and use short sessions inside the search tool.

**Regression test required:** Concurrency test with a stub slow model; assert pool checkouts during the wait.

**Dependencies / blockers:** BACKEND-029 (limits per IP).

### PIPE-018

**No maximum length for a voice call**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | voice_qna / qna_agent |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/voice_qna/agents/qna_agent.py _enforce_call_limit: VOICE_MAX_CALL_MINUTES (env, default 30), spoken warning a minute before, then _announce_and_leave with reason time_limit.

**Test:** tests/voice_qna/test_p2_tutor_rules.py::test_a_long_call_is_warned_then_ended, ::test_the_call_limit_is_configured_and_bounded

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Decision needed:** Is 30 minutes the right cap?

**Description:** No maximum length for a voice call.

**Root cause / investigation status:** The only ends are goodbye, session errors, disconnect, and idle flow, which needs mutual silence (qna_agent.py:647, 689-704). Background noise or a playing video keeps user state active, so paid speech and LLM keep running. session_reaper only closes empty calls.

**Reproduction:** Read the code. A long noisy call was not run.

**Expected:** A hard cap with a warning.

**Actual:** Open-ended billing per student.

**Proposed fix:** Add VOICE_MAX_CALL_MINUTES with a spoken warning, then hang up through _announce_and_leave.

**Regression test required:** Timer test with a fake session.

**Dependencies / blockers:** INFRA-016.

### PIPE-019

**A resumed call can be marked ended while it is live**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | voice_qna / qna_agent, session_reaper, qna_session_repository |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** Migration 0050 adds qna_sessions.last_started_at, set by reactivate. New QnaSessionRepository.end_run ends only the matching run; the agent shutdown callback uses it (app/voice_qna/agents/qna_agent.py). The sweep and the empty-call cutoff count from the latest start. Only the repository and sweep are tested; the agent callback and a live LiveKit call were not run. If a tutor is reused across a resume, its shutdown no longer ends the session; the webhook or sweep does.

**Test:** tests/integration/test_read_models.py::test_late_shutdown_of_the_old_run_leaves_the_resumed_call_active, test_the_sweep_gives_a_resumed_call_a_fresh_grace_period

**Evidence:** failed before: run on the unfixed code (18 of 21 failed); passes now: pytest

**Description:** A resumed call can be marked ended while it is live.

**Root cause / investigation status:** webhooks.py:39-45 protects against a late room_finished for a reused room name, but the previous job's shutdown callback (qna_agent.py:550-568) has no such check, though livekit_service.py:41-43 says old jobs do wind down after a resume. reactivate (qna_session_repository.py:104-119) keeps the old started_at, so session_reaper treats a resumed session as past grace and may end it if the room is not yet up. Effect is a wrong status: turns still save, and DELETE then skips closing the room (api/simple.py:433-437).

**Reproduction:** Not run. End a call and resume within seconds, then read the session status.

**Expected:** Status reflects the live call.

**Actual:** Status may read ended during the call.

**Proposed fix:** Add a run token or last_started_at on reactivate, and end only when the token matches.

**Regression test required:** Late shutdown of run A does not end run B.

**Dependencies / blockers:** None.

### PIPE-020

**S3 upload failures break the 'never raises' promise in asset_storage**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Backend defect |
| Affected module | edu_video / asset_storage, storage |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** app/edu_video/asset_storage.py and storage.py also catch Boto3Error (S3UploadFailedError).

**Test:** tests/edu_video/test_p2_pipeline.py::test_asset_upload_keeps_its_promise_not_to_raise, ::test_video_upload_failure_is_a_storage_error

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** S3 upload failures break the 'never raises' promise in asset_storage.

**Root cause / investigation status:** boto3 raises S3UploadFailedError (boto3/exceptions.py:84, subclass of Boto3Error, raised at s3/transfer.py:458). asset_storage.py:74 catches only BotoCoreError, ClientError and OSError, so the docstring at 10-12 is wrong: routes.py:581 returns 500 with the document already on disk, and pipeline.py:301 fails the job. storage._save_to_s3:135 has the same gap, so StorageError is skipped, but the job still fails cleanly. Not run against real S3.

**Reproduction:** Stub upload_file to raise S3UploadFailedError and call asset_storage.upload_file: the exception escapes.

**Expected:** Logged and returns False, as documented.

**Actual:** A storage permission error can fail uploads and jobs.

**Proposed fix:** Catch boto3.exceptions.Boto3Error too.

**Regression test required:** Stubbed failure returns False for upload_file and upload_dir.

**Dependencies / blockers:** None.

### PIPE-021

**Local disk grows without a bound: orphan temp files, source images and a count-limited audio cache**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Configuration/deployment |
| Affected module | edu_video / storage layers |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Done: temp_audiofile beside the job's output (renderer._encode); WORK_DIR_PREFIX plus clean_stale_work_dirs at worker start; TTS_CACHE_MAX_BYTES byte budget, default 5 GB.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** tests/edu_video/test_p2_pipeline.py::test_the_encoder_keeps_its_temp_audio_with_the_job, ::test_the_narration_cache_has_a_byte_budget, ::test_a_dead_workers_folder_is_swept_and_a_live_one_is_not

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Decision needed:** How long should a deleted job's video, document and source images be kept before they are removed? Nothing is removed for a deleted job today.

**Description:** Local disk grows without a bound: orphan temp files, source images and a count-limited audio cache.

**Root cause / investigation status:** Nothing removes tempfile work dirs left by a killed worker (pipeline.py:195). moviepy 1.0.3 writes its temp audio into the working directory (VideoClip.py:287) because renderer.py:732 sets no temp_audiofile, so a kill leaves it in the app directory, and a duplicate worker for one job collides on that name. media/uploads/source_images and generated_images are never cleaned, and soft delete keeps everything (job_tracker.py:422-426; storage.delete_video has no caller). tts_cache is limited by file count, 20000 WAV files (config.py:316), with no byte limit. Size at scale not measured; local media is 233 MB.

**Reproduction:** Read paths. Killing a worker mid-render would leave the temp dir (not run).

**Expected:** Bounded disk use and cleanup at startup.

**Actual:** A slow fill on the container disk, which can then fail renders.

**Proposed fix:** Pass temp_audiofile inside work_dir, add a startup janitor, add a byte budget to the caches, and add retention for deleted jobs.

**Regression test required:** temp_audiofile path test. Prune by bytes test.

**Dependencies / blockers:** INFRA-013, INFRA-022, BACKEND-021.

### PIPE-023

**Slide layouts are tuned on Windows Arial, but production measures with the wider DejaVu**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Test coverage |
| Affected module | edu_video / svg_renderer, tests |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Same bundled font everywhere (PIPE-002). capacity.TEXT_BUDGET gains recap and summary so long lists split; list_layout shrinks to 11 px rather than run off the slide.

**Test:** tests/edu_video/test_layout_and_source.py::test_list_layout_shrinks_instead_of_dropping_or_overflowing, tests/edu_video/test_diagram_wave_layouts.py::test_wave_labels_never_overlap_and_are_all_readable

**Evidence:** failed before: both in the baseline run; see final report

**Description:** Slide layouts are tuned on Windows Arial, but production measures with the wider DejaVu.

**Root cause / investigation status:** list_layout (svg_renderer.py:491-522) keeps min_size when text does not fit, and capacity.TEXT_BUDGET has no limit for recap or summary. With DejaVu the test's 8 long points end at y=788 on a 720 px slide; with Arial at 640. Wave legend gets one overlap with DejaVu metrics and none with Arial. Input is extreme, and the overflow on recap is positional so it applies whichever font draws it; the wave overlap may not be visible because the render font differs (PIPE-002). Developers on Windows and WSL see different results.

**Reproduction:** pipe_probe2.py with _font_candidates pointed at each font. Also the two failing tests in WSL.

**Expected:** Tests and layouts use the deployed font.

**Actual:** Passes on the developer machine, fails on the Linux font; extreme text runs off the slide.

**Proposed fix:** Bundle the fonts in the repo and use them everywhere, add a text budget for list slides that splits instead of overflowing.

**Regression test required:** Run the layout tests in the container font set in CI.

**Dependencies / blockers:** PIPE-002. INFRA-010 (no CI gates).

### PIPE-024

**English lines are spoken inside Tamil videos**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | edu_video / scripter |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** scripter: _source_image_scene and _truncation_notice_scene take the language, with Tamil text.

**Test:** tests/edu_video/test_p2_pipeline.py::test_a_tamil_video_speaks_tamil_in_its_fixed_lines, ::test_english_fixed_lines_are_unchanged

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Description:** English lines are spoken inside Tamil videos.

**Root cause / investigation status:** _source_image_scene narration (scripter.py:411) and _truncation_notice_scene (424-435) are English constants, regardless of language, and are sent to the ta-IN voice. All other narration follows the job language.

**Reproduction:** Tamil job on a PDF with an image: the plan has the English sentence.

**Expected:** The line is in the video's language.

**Actual:** An English sentence read by the Tamil voice.

**Proposed fix:** Add Tamil versions keyed on language.

**Regression test required:** language=tamil gives no Latin-only narration for those scenes.

**Dependencies / blockers:** None.

### PIPE-025

**Pipeline and assessment emails: wrong page for some uploaders, conflicting advice, repeat sends, unactivated recipients**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Functional bug |
| Affected module | services / notification_events, email_templates |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** (a) Page by role, /faculty/videos for HOD and Faculty, with wording that does not say send to the HOD. (b) One failure instruction: Press Regenerate for admins; 'Ask your College Admin' for HOD/Faculty, because REGENERATE_ROLES excludes them. (c) Assessment mail skips anyone who already has that bell row. Limit: a student with the bell switched off has no row and would be mailed again. (d) _department_students requires is_verified.

**Test:** tests/integration/test_read_models.py::test_pipeline_mail_opens_the_uploaders_portal, test_staff_are_not_told_to_send_to_the_hod, test_failure_mail_gives_the_one_instruction, test_reapproval_mails_nobody_twice, test_a_student_who_never_activated_gets_no_content_mail

**Evidence:** failed before: run on the unfixed code (18 of 21 failed); passes now: pytest

**Description:** Pipeline and assessment emails: wrong page for some uploaders, conflicting advice, repeat sends, unactivated recipients.

**Root cause / investigation status:** (a) notification_events._pipeline_finished:506 sends every non-superadmin to /admin/content, but upload allows hod and faculty (routes.py:112, 428), who cannot use that portal, and the body says to send it to the HOD. (b) email_templates.py:283 says remove it and upload again, while narrator and pipeline errors say Press Regenerate. (c) notification MCQ approval: each re-approval after an edit (mcq/api/routes.py:402-411) emails all students; only the bell has a dedupe key. (d) _department_students:426-429 filters is_active, not is_verified, so invited students who never activated get content mail (suspected: depends on is_active for pending users, see BACKEND-010). Escaping was checked and is sound: all ctx values go through esc, CTA regex only sees escaped text, and all CTA paths exist in the frontend. Subjects are header-encoded (notification_service.py:216).

**Reproduction:** (a) A HOD uploads through the API and reads the email link. (c) Edit an approved quiz, approve again, and count emails.

**Expected:** Right link per role, one instruction, one announcement per assessment.

**Actual:** As described.

**Proposed fix:** Pick the page by role, align the failure text after BACKEND-004 is decided, dedupe email by job and event, and filter is_verified.

**Regression test required:** Template test per role. Re-approval sends no second email.

**Dependencies / blockers:** BACKEND-004, BACKEND-010, BACKEND-031, BACKEND-036.

### PIPE-028

**Three voice tests depend on the developer's .env, which differs from the code default**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Test coverage |
| Affected module | tests/voice_qna |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** tests/conftest.py pins TOP_K to the shipped default.

**Evidence:** 3 voice keyword tests pass.

**Description:** Three voice tests depend on the developer's .env, which differs from the code default.

**Root cause / investigation status:** tests/voice_qna/test_text_chat_and_history.py:353, 364, 371 hard-code 4 while retrieval_service reads settings.TOP_K. Local .env sets TOP_K=3, whereas config.py:157 and .env.example:77 say 4, and config.py:150-153 explains that more small chunks are needed. So this machine's tutor gets fewer passages than designed. Whether production overrides it could not be checked.

**Reproduction:** Run with TOP_K=4 in WSL: 3 passed.

**Expected:** Tests independent of .env.

**Actual:** 3 failures on this machine, not a product bug.

**Proposed fix:** Use settings.TOP_K in the tests or set it in a fixture, ignore .env under pytest, and set the local value to 4 (owner action).

**Regression test required:** Suite passes with any TOP_K.

**Dependencies / blockers:** None.

### TEST-015

**No type-check; tsc rejects jsconfig, TypeScript is only transitive**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Configuration/deployment |
| Affected module | frontend |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Removed baseUrl, ignoreDeprecations and .next/types from jsconfig.json; pinned typescript 7.0.2 as a devDependency; added npm run typecheck. import/no-unresolved finds the dead imports.

**Test:** scripts/infra.test.mjs jsconfig test; npm run typecheck

**Evidence:** failed before: tsc TS5102 on baseUrl. passes now: typecheck exit 0; next build succeeds without baseUrl. BlurredSection.jsx and PremiumFeatureGate.jsx are already deleted.

**Description:** No type-check; tsc rejects jsconfig, TypeScript is only transitive.

**Root cause / investigation status:** Project is JS with no checkJs. typescript 7.0.2 arrives transitively, not declared. tsc -p jsconfig.json fails at once: TS5102, option baseUrl removed (jsconfig.json:17; also ignoreDeprecations 6.0). With a scratchpad config and checkJs, about 1,059 output lines, mostly prop-shape noise (TS2741, TS2739). It exposed real dead code: src/components/shared/BlurredSection.jsx:6 and PremiumFeatureGate.jsx:6 import missing @/lib/constants/upgrade; only those two files reference them, and premium gating contradicts the no-plan rule.

**Reproduction:** 1. node node_modules/typescript/bin/tsc -p jsconfig.json --noEmit --incremental false.

**Expected:** Editor config valid; dead files removed

**Actual:** Invalid for installed tsc; two unreachable premium components

**Proposed fix:** Pin typescript or fix jsconfig; delete dead components; optionally run checkJs on selected folders

**Regression test required:** Import resolution check in lint (import/no-unresolved)

**Dependencies / blockers:** None

### TEST-020

**Preview scripts missing while config and docs still describe them**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Configuration/deployment |
| Affected module | frontend tooling |
| Finding status | confirmed |
| Duplicates merged | INFRA-036 |

**Phase 2 remediation (Fixed):** Restored scripts/preview.mjs and warm-routes.mjs read from stash@{3}^3 without touching the stash; added npm scripts preview and warm.

**Test:** scripts/infra.test.mjs package scripts point at files that exist

**Evidence:** failed before: scripts missing. passes now.

**Description:** Preview scripts missing while config and docs still describe them.

**Root cause / investigation status:** scripts/preview.mjs and warm-routes.mjs are absent, never committed (git log --all empty) and only exist in stash@{3} untracked. package.json has no preview or warm scripts. next.config.js:9 comment still says npm run preview; docs/agent/HANDOFF.md:348 presents them as added, and the user memory 'Build check isolation' requires them. docs/agent/memory.md:47 and log.md 2026-10-26 do state they are stashed. A dropped stash loses them; building to .next while dev runs is the risk they prevented.

**Reproduction:** 1. ls scripts. 2. git show 'stash@{3}^3' --stat.

**Expected:** Scripts committed, or references removed

**Actual:** Dangling references

**Proposed fix:** Commit the scripts, or remove the distDir comment and update docs

**Regression test required:** A doc path checker in CI

**Dependencies / blockers:** Owner decision

### TEST-021

**Docs reference missing files; log claims check-knowledge is in the repo**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Configuration/deployment |
| Affected module | AGENTS.md, CLAUDE.md, docs/knowledge/log.md |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** check-knowledge --paths (npm run check:docs) fails on missing doc paths in AGENTS.md, CLAUDE.md, docs/agent. Default run unchanged. graphify npm scripts use py -m graphify.

**Test:** scripts/infra.test.mjs check-knowledge --paths

**Evidence:** Fails on a missing path and passes on a real one. Live run lists 8 broken references. Not in CI because docs/ is gitignored.

**Blocked on:** AGENTS.md:36, docs/agent/architecture.md, prod.md: point API truth at docs/knowledge/api. AGENTS.md rule 4 drop docs/QUIRRI_UI_REFERENCE.md. rules.md drop docs/QUIRRI_PRODUCT_UI_RULES.md. Mark the superseded log.md 2026-10-31 bell line. scripts/check-knowledge.mjs must be committed.

**Description:** Docs reference missing files; log claims check-knowledge is in the repo.

**Root cause / investigation status:** AGENTS.md:36 names docs/BACKEND_STATUS_REPORT.md and docs/FRONTEND_BACKEND_ALIGNMENT.md as 'API truth'; neither exists. AGENTS.md rule 4 names docs/QUIRRI_UI_REFERENCE.md, also missing. Also missing across docs/agent: docs/FIGMA_SUPER_ADMIN.md, docs/QUIRRI_PRODUCT_UI_RULES.md. log.md 2026-11-02 says scripts/check-knowledge.mjs 'is in the repo', but git status shows it untracked, so clones do not get it; the CLAUDE.md gate depends on it. check-knowledge passes (63 files) but checks only front matter and internal links, not code truth, index completeness or AGENTS links. log.md 2026-10-31 has conflicting bell lines in one section (polls /notifications/mine vs uses /notifications/inbox*) with no superseded mark. package.json graphify scripts call graphify.exe, which CLAUDE.md says is blocked on this machine; AGENTS.md:29 repeats it.

**Reproduction:** 1. ls docs/BACKEND_STATUS_REPORT.md. 2. git ls-files scripts. 3. node scripts/check-knowledge.mjs.

**Expected:** Every doc path resolves; gate script is tracked

**Actual:** Agents are pointed to absent API sources

**Proposed fix:** Point API truth at docs/knowledge/api; commit the script when owner asks; extend it to check AGENTS and docs/agent paths; mark the superseded log line

**Regression test required:** check-knowledge fails on a broken doc path

**Dependencies / blockers:** Commit only when owner asks

### TEST-022

**Disabled and environment-conditional tests hide coverage; 8 of 14 in one file never run**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Test coverage |
| Affected module | tests/test_teaching_portal_routers.py, tests/voice_qna |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** CI has Redis, so the rate-limit test runs. New CI step runs the interview router tests with INTERVIEWS_ENABLED=true. pytest -ra prints every skip.

**Test:** ci.yml Interview router guards; tests/test_teaching_portal_routers.py

**Evidence:** With the flag on: 14 passed, 0 skipped. In the main run the 8 still skip, visibly.

**Description:** Disabled and environment-conditional tests hide coverage; 8 of 14 in one file never run.

**Root cause / investigation status:** 8 tests skip on INTERVIEWS_ENABLED false (test_teaching_portal_routers.py:24,88-190). They guard unmounted routers, which is consistent with the owner decision, but the HOD-scoping logic is unverified if the flag returns, and interview_assignments is misleadingly 'covered'. One Redis test (test_text_chat_and_history.py:229) silently skips when no Redis on 6379, so multi-process rate limiting goes unproved where Redis is off. No skip reason is reported by CI, as CI runs nothing.

**Reproduction:** 1. grep -rn skipif tests/.

**Expected:** Skips visible, Redis available in CI

**Actual:** Conditional silence

**Proposed fix:** Run Redis in CI; force interview flag on in a dedicated test settings run, or remove them with the module

**Regression test required:** CI reports zero unexpected skips

**Dependencies / blockers:** TEST-003

### TEST-023

**Timing-based tests are likely flaky on slow disks**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Test coverage |
| Affected module | tests/edu_video, tests/voice_qna |
| Finding status | suspected |

**Phase 2 remediation (Blocked):** CI prints --durations=20.

**Test:** Repeat run

**Evidence:** Not reproduced: the 3 listed files ran 5 times with 8 CPU-burn loops, 290 passed. 5 repeats, not the 20 the register asks for.

**Blocked on:** Replacing sleeps with events means editing existing tests, which my brief forbids.

**Description:** Timing-based tests are likely flaky on slow disks.

**Root cause / investigation status:** Real sleeps decide ordering: edu_video/test_speed_caches.py:133,153; test_job_recovery_and_providers.py:38,41; voice_qna/test_voice_flow_fixes.py:205,215,302,305. Watch tests use datetime.now against windows (test_watch_verification.py:160-177). A prior targeted run of 35 tests took 101s on /mnt/e (scratchpad a6-pytest-after.log), mostly import cost (not profiled). No flake was observed: suite not run here.

**Reproduction:** Not reproduced. Run the listed tests repeatedly under CPU load.

**Expected:** Deterministic tests

**Actual:** Wall-clock dependence

**Proposed fix:** Use events or fake clocks; add pytest --durations to CI

**Regression test required:** Run these files 20 times under load with no failure

**Dependencies / blockers:** None

### UX-005

**Tinted status pills miss 4.5:1 by a small margin**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Accessibility |
| Affected module | data-viz .mdc-pill |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Pill text mix changed from 72% to 62% hue in data-viz.css (.mdc-pill). Every series, band and tone hue now clears 4.5:1.

**Test:** src/styles/contrast.test.js::data pills

**Evidence:** failed before: 4.05-4.35:1 on 5 hues; passes now: lowest 5.14:1

**Description:** Tinted status pills miss 4.5:1 by a small margin.

**Root cause / investigation status:** Pill colour pairs used by .mdc-pill in the donut and metric cards (src/components/shared/data-viz.jsx, src/styles/data-viz.css).

**Reproduction:** 1. Run axe on a page with ModernDonut percent pills.

**Expected:** 4.5:1.

**Actual:** #198385 on #E2F6F6 4.05; #42820E on #EAF5E0 4.20; #B05E16 on #FEEFE2 4.18; #3C7F3F on #E9F5E9 4.34.

**Proposed fix:** Darken the four pill text colours slightly.

**Regression test required:** Contrast unit test over the pill palette.

**Dependencies / blockers:** None

### UX-007

**Line and column charts have no text alternative**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Accessibility |
| Affected module | Student progress, college insights |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** ColumnChart and TrendChart wrappers are role="img" with a generated summary (columnSummary, trendSummary) and a label prop; callers pass one.

**Test:** src/components/shared/bundleSplit.test.js::chart text alternatives

**Evidence:** failed before: no role or name; passes now: rendered markup asserted

**Description:** Line and column charts have no text alternative.

**Root cause / investigation status:** src/components/shared/data-viz.jsx:128 and :165: ResponsiveContainer has no role/aria-label and no fallback table. ModernDonut (:271) correctly has role="img" and a full label.

**Reproduction:** 1. Read data-viz.jsx. 2. Open /student/progress with quiz history.

**Expected:** WCAG 1.1.1 (A): charts expose a summary or data table.

**Actual:** Code has no alternative. Not exercised live: seeded pages rendered no Recharts wrapper on the checked dashboards, and I did not check whether the same figures appear as text nearby.

**Proposed fix:** Wrap in role="img" with a generated summary, as ModernDonut does.

**Regression test required:** Component test asserts an accessible name on ColumnChart and TrendChart.

**Dependencies / blockers:** None

### UX-008

**No skip link on any page**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Accessibility |
| Affected module | All portal layouts |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New src/components/shared/SkipLink.jsx, first child of all four portal shells; main is id=main-content tabindex=-1 everywhere.

**Test:** src/components/shared/a11yShell.test.js::portal shell

**Evidence:** failed before: 43 of 50 new assertions red on the unfixed tree; passes now: npx vitest run; browser: first Tab lands on "Skip to content" at x=8; Enter moves focus to #main-content (outline none)

**Description:** No skip link on any page.

**Root cause / investigation status:** No skip link in the portal layouts (src/app/superadmin/layout.jsx, src/app/faculty/(portal)/layout.jsx, src/app/student/(portal)/layout.jsx, CollegeAdminSidebar).

**Reproduction:** 1. Load a portal page. 2. Press Tab repeatedly.

**Expected:** A first-tab "Skip to content" link. WCAG 2.4.1 is arguably met by the <main> landmark, so this is a usability gap.

**Actual:** 0 of 98 scans had one. Keyboard users cross the sidebar, account and bell controls first on every navigation.

**Proposed fix:** Add a visually hidden skip link in the shared shell targeting <main tabindex="-1">.

**Regression test required:** Keyboard test: first Tab lands on the skip link and Enter moves focus to main.

**Dependencies / blockers:** None

### UX-009

**Page h1 sits outside all landmarks**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Accessibility |
| Affected module | All portal layouts |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Super Admin, Faculty and Student top bars are now <header> (College Admin already was).

**Test:** src/components/shared/a11yShell.test.js::portal shell

**Evidence:** failed before: 43 of 50 new assertions red on the unfixed tree; passes now: npx vitest run; browser: axe across 20 mocked pages at 1440 and 390: region 0 nodes

**Description:** Page h1 sits outside all landmarks.

**Root cause / investigation status:** .topbar-copy is outside <main> and has no header landmark: src/app/superadmin/layout.jsx:55, src/app/faculty/(portal)/layout.jsx:61, src/app/student/(portal)/layout.jsx:64, src/components/shared/PageHeader.jsx:93.

**Reproduction:** 1. Run axe best-practice rules on any portal page.

**Expected:** All content inside landmarks.

**Actual:** axe region fired on 76 of 98 scans (78 nodes). Mostly the topbar copy, sometimes a topbar action link.

**Proposed fix:** Render the topbar as <header> (banner).

**Regression test required:** axe region rule in CI.

**Dependencies / blockers:** None

### UX-010

**Heading levels skip from h1 to h3**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Accessibility |
| Affected module | Module cards across portals |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Card titles are h2: Panel, data-viz cards, NotificationRules groups, McqDocumentReview, student progress cards. Sub-headings moved h4 to h3 (mq-group-h, fa-day-h). CSS selectors widened with :is(h2,h3), so looks are unchanged.

**Test:** src/components/shared/a11yShell.test.js::heading order

**Evidence:** failed before: 43 of 50 new assertions red on the unfixed tree; passes now: npx vitest run; browser: axe across 20 mocked pages at 1440 and 390: heading-order 0 nodes; panel h2 computed {"size":"18px","w":"500","lh":"26px","before":"none"}

**Description:** Heading levels skip from h1 to h3.

**Root cause / investigation status:** Card titles are h3 directly under the topbar h1, for example "Students by college", "Chapters", "Staff directory", "Your alerts".

**Reproduction:** 1. Run axe on /superadmin/colleges.

**Expected:** Sequential heading order.

**Actual:** heading-order fired on 68 of 98 scans.

**Proposed fix:** Make card titles h2, or add a visually hidden h2 for each section. Styling can stay the same.

**Regression test required:** axe heading-order rule in CI.

**Dependencies / blockers:** None

### UX-011

**Two unnamed complementary landmarks on dashboards**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Accessibility |
| Affected module | Dashboards |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Sidebars get aria-label="Sidebar"; the hero side aside is named from its title.

**Test:** src/components/shared/a11yShell.test.js::portal shell

**Evidence:** failed before: 43 of 50 new assertions red on the unfixed tree; passes now: npx vitest run; browser: axe across 20 mocked pages at 1440 and 390: landmark-unique 0 nodes

**Description:** Two unnamed complementary landmarks on dashboards.

**Root cause / investigation status:** Dashboards contain a second <aside> and the sidebar <aside className="sidebar"> has no aria-label (for example src/components/admin/CollegeAdminSidebar.jsx:189).

**Reproduction:** 1. Run axe on /admin/dashboard.

**Expected:** Each landmark distinguishable by name.

**Actual:** landmark-unique fired on 8 scans, with <aside class="sidebar"> reported.

**Proposed fix:** Use <nav aria-label="Main"> for the sidebar and label the other aside.

**Regression test required:** axe landmark-unique in CI.

**Dependencies / blockers:** None

### UX-012

**Focus indicator not detected on student subject-card title links**

| Field | Value |
|---|---|
| Status | Accepted |
| Severity | Low |
| Category | Accessibility |
| Affected module | Student subjects |
| Finding status | suspected |

**Phase 2 remediation (Needs Business Decision):** Not a defect, nothing changed: .sl-scard:has(.sl-scard-link:focus-visible) draws the ring on the card; the audit measured only the link element.

**Owner decision (3 Nov 2026):** accepted as is per [OWNER_DECISIONS.md](OWNER_DECISIONS.md).

**Test:** browser check of the computed outline on the card while the link has keyboard focus

**Evidence:** rule at student-learning.css:163; browser: focused card outline {"link":"sl-scard-link","w":"2px","st":"solid","col":"rgb(14, 92, 107)"}

**Decision needed:** Not a defect: 2px teal outline confirmed on the focused card. Close this issue as withdrawn?

**Description:** Focus indicator not detected on student subject-card title links.

**Root cause / investigation status:** a.sl-scard-link has neither outline nor box-shadow when focused. A stretched-link pseudo-element may draw the ring; computed style on ::after was not checked.

**Reproduction:** 1. Sign in as student. 2. Open /student/subjects. 3. Tab to a subject title.

**Expected:** WCAG 2.4.7: a visible focus indicator.

**Actual:** 2 of 14 tab stops (Data Structures, Other lectures) had no outline or shadow on the element. All other stops measured for superadmin (45) and college admin (33) had one.

**Proposed fix:** Confirm visually; if absent, add :focus-visible styling on the card.

**Regression test required:** Keyboard test asserting focus style on the card link.

**Dependencies / blockers:** None

### UX-013

**Generic document title on three public auth pages**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Accessibility |
| Affected module | Auth pages |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New server layouts set metadata.title for /auth/forgot-password, /auth/reset-password and /activate. The pages themselves are untouched.

**Test:** src/components/shared/a11yShell.test.js::document titles

**Evidence:** failed before: 43 of 50 new assertions red on the unfixed tree; passes now: npx vitest run; browser: /auth/forgot-password title "Forgot password · Quirri"; /auth/reset-password?token=x title "Reset password · Quirri"; /activate?token=x title "Activate account · Quirri"

**Description:** Generic document title on three public auth pages.

**Root cause / investigation status:** Metadata title not set per page for /auth/forgot-password, /auth/reset-password and /activate. /auth/login does set "Sign in · Quirri".

**Reproduction:** 1. Open each page and read document.title.

**Expected:** WCAG 2.4.2: a descriptive title.

**Actual:** All three read "Quirri".

**Proposed fix:** Set the title only; this does not touch the frozen login visuals.

**Regression test required:** Test asserting document.title per route.

**Dependencies / blockers:** None

### UX-014

**Login field error is not tied to its input**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Accessibility |
| Affected module | Frozen login (report only) |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** QuirriControlledField links its error with aria-describedby; PasswordInput gets aria-invalid, aria-describedby and role=alert on its error. Attributes only, no visual change.

**Test:** src/components/shared/a11yShell.test.js::field errors

**Evidence:** failed before: 43 of 50 new assertions red on the unfixed tree; passes now: npx vitest run; browser: login after empty submit [{"id":"email","invalid":"true","d":"email-error","text":"Email is required"},{"id":"password","invalid":"true","d":"password-error","text":"Password must be at least 6 characters"}]

**Description:** Login field error is not tied to its input.

**Root cause / investigation status:** src/app/auth/login/page.js: email input gets aria-invalid="true" but no aria-describedby; the password input has no aria-invalid. Attributes only, so visuals stay unchanged.

**Reproduction:** 1. Open /auth/login. 2. Submit empty.

**Expected:** WCAG 3.3.1: error programmatically linked to its field.

**Actual:** The error text is in a role=alert region and is announced, labels and autocomplete are correct, and axe reports 0 violations at 1440 and 390. Only the aria-describedby link is missing.

**Proposed fix:** Add aria-describedby. No visual change, so compatible with the freeze.

**Regression test required:** Form test asserting aria-describedby on error.

**Dependencies / blockers:** Login UI is frozen; attribute-only change.

### UX-018

**Layout shift above 0.1 on superadmin list pages**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | Superadmin lists |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** New DvGridPlaceholder in src/components/shared/data-viz.jsx plus .dv-ph in src/styles/data-viz.css (552px, about one eight-row card). Used in src/app/superadmin/{colleges,universities,departments}/page.jsx only while totals are loading and there is no data, so a failed load does not leave blank cards. With 0 or 1 rows the cards never show, so the placeholder collapses and the list moves up once.

**Test:** No automated CLS test in the repo. Verified by scratchpad audit/f2_cls.cjs on a production build: mocked 300 ms API, 8 rows.

**Evidence:** before: 0.137, 0.137, 0.132 (P2_UX.json, same mocked delay); after at 1440: colleges 0.003, universities 0.004, departments 0.001; at 390: 0.000 on all three. No placeholder left after load. The collapse case (0-1 rows) was not measured.

**Description:** Layout shift above 0.1 on superadmin list pages.

**Root cause / investigation status:** Content replaces smaller loading states after the API returns (not traced to specific elements).

**Reproduction:** 1. Load the page cold at 1440 and read layout-shift entries.

**Expected:** CLS under 0.1.

**Actual:** /superadmin/colleges 0.179, /superadmin/universities 0.179, /superadmin/departments 0.133. Others 0.07-0.096. Median across routes 0.002.

**Proposed fix:** Reserve KPI and table height in loading states.

**Regression test required:** CLS budget on these routes.

**Dependencies / blockers:** None

### UX-019

**Duplicate API calls on a few pages**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | Settings, student subjects |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** src/lib/api/user.js getMe shares one in-flight request and never reuses a finished one; settingsApi.get in src/lib/api/superadmin/modules.js now calls it, so useHydrateProfile and useAccountScope share. The quiz-state half was done by the UX agent.

**Test:** src/lib/api/user.test.js (3 tests), src/components/student/quizStates.test.js

**Evidence:** failed before: 2 calls for overlapping loads; passes now: 1 call. Unit level; the live settings page was not counted in a browser.

**Description:** Duplicate API calls on a few pages.

**Root cause / investigation status:** Independent fetches: useHydrateProfile and useAccountScope both call /auth/me (src/hooks/useHydrateProfile.js, src/hooks/useAccountScope.js). Student subjects and classroom repeat quiz-state loads.

**Reproduction:** 1. Load the page and count identical URLs during load.

**Expected:** One call per URL per load.

**Actual:** /auth/me twice on ca, hod and faculty settings; /mcq/my-attempts and /mcq/jobs/:id twice on /student/subjects and /student/classroom. The other 45 routes had no duplicates; maximum 9 API calls on a page.

**Proposed fix:** Share these through the existing react-query cache.

**Regression test required:** Request-count assertion per page.

**Dependencies / blockers:** None

### UX-020

**Leaderboard polls 100 rows every 15 s and ranks in Python without a cache**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | Student leaderboard |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Poll is now 60 s: LEADERBOARD_REFRESH_MS in src/lib/api/leaderboard.js, used by src/app/student/(portal)/leaderboard/page.jsx (constant moved because a Next page cannot export it); page comment updated. Focus refresh is unchanged. A new score can take up to 60 s to appear in a tab left open.

**Test:** src/lib/api/leaderboard.test.js (2 tests)

**Evidence:** failed before: constant missing, page used 15000; passes now: full vitest 283/283. The backend load test named in the register was not run, and the backend cache was not added.

**Decision needed:** The UX agent asked the page owner to confirm a delay of up to 60 s. Applied as instructed; the owner can veto.

**Description:** Leaderboard polls 100 rows every 15 s and ranks in Python without a cache.

**Root cause / investigation status:** src/app/student/(portal)/leaderboard/page.jsx:24 REFRESH_MS=15000; app/api/v1/leaderboard.py runs several queries and ranks in Python per request, with no cache found in that file.

**Reproduction:** 1. Stay on /student/leaderboard for 95 s and count requests.

**Expected:** A refresh rate matched to how often scores change.

**Actual:** 6 leaderboard requests in 95 s (limit=100), alongside 2 bell polls. 1,000 open tabs would be about 67 req/s. That load figure is arithmetic, not measured. Polling does pause when the tab is hidden.

**Proposed fix:** Poll at 60 s like useLiveRefresh, or cache the result per cohort briefly.

**Regression test required:** Load test of the endpoint at the expected cohort size.

**Dependencies / blockers:** None

### UX-025

**College analytics runs one pass-rate query per department**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | Analytics |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** college_overview gets pass rates from one grouped query (pass_stats_by_department) and the totals from the same result. Deleted chapters' attempts are excluded too.

**Test:** tests/integration/test_read_models.py::test_college_analytics_query_count_ignores_departments, test_department_pass_rate_is_per_department

**Evidence:** failed before: query count grew with departments (test_department_pass_rate_is_per_department passed before and guards the numbers); passes now: pytest

**Description:** College analytics runs one pass-rate query per department.

**Root cause / investigation status:** app/services/college_insights.py:277 calls pass_stats inside the department loop at :269, and :167 loads all students for the college.

**Reproduction:** 1. Read college_overview. 2. Load /admin/analytics.

**Expected:** Set-based aggregation.

**Actual:** First load took up to 582 ms with 1-19 users per table. It will grow with departments and students; not measured at scale.

**Proposed fix:** Group by department in one query.

**Regression test required:** Query-count test with several departments.

**Dependencies / blockers:** None

### UX-026

**API has no response compression of its own**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance |
| Affected module | Backend |
| Finding status | suspected |

**Phase 2 remediation (Fixed):** ApiGZipMiddleware in app/main.py (minimum 1 KB). /edu_video/download is excluded: gzip would break Range seeking. Nginx example has no gzip, so the API does it.

**Test:** tests/integration/test_platform_limits.py::test_json_is_compressed, test_video_is_private_and_never_compressed

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** API has no response compression of its own.

**Root cause / investigation status:** app/main.py adds CORSMiddleware but no GZipMiddleware.

**Reproduction:** 1. Fetch through :3100 and note content-encoding: gzip, added by Next.

**Expected:** JSON compressed in production.

**Actual:** /api/v1/health/errors returns 72 KB of JSON. Nginx may compress in production; its config was not reviewed.

**Proposed fix:** Enable gzip in Nginx or add GZipMiddleware.

**Regression test required:** Header check on the deployed API.

**Dependencies / blockers:** None

### UX-027

**Global CSS for all portals loads on every route**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Performance |
| Affected module | Root layout |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Not changed.

**Test:** none

**Blocked on:** Needs src/app/layout.js, outside my src/app scope, and full visual regression: the shared stylesheets rely on load order (quirri-accents.css must stay last, and the login guard sits in quirri-design.css). 51 KB gz, cached immutably, so the gain is small against the cascade risk.

**Description:** Global CSS for all portals loads on every route.

**Root cause / investigation status:** src/app/layout.js:2-16 imports the stylesheets for superadmin, admin, faculty and student portals at root.

**Reproduction:** 1. Read the app-build-manifest for /layout.

**Expected:** Portal CSS loads with its portal.

**Actual:** Root layout carries 51 KB gz CSS on every route, including login. Static CSS is cached immutably, so the cost is mainly first load.

**Proposed fix:** Move portal CSS imports into portal layouts. Check for cascade order changes.

**Regression test required:** Visual regression after the move.

**Dependencies / blockers:** None

### UX-028

**Oversized logo SVG and missing favicon**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Performance |
| Affected module | Static assets |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Favicon 404 already resolved by src/app/icon.svg. Logo and icon size not changed.

**Test:** none

**Evidence:** public/quirri-logo.svg is 128,154 bytes; src/app/icon.svg transfers 124 KB on each cold load (measured).

**Blocked on:** public/ and src/app/icon.svg are outside my ownership and the logo appears on the frozen login. Needs an SVG optimiser (svgo is not a dependency; dev dependency for the package.json owner) or a small hand-made icon.svg, then a render comparison on login.

**Description:** Oversized logo SVG and missing favicon.

**Root cause / investigation status:** public/quirri-logo.svg is 128,154 bytes (25 KB gz). public/ contains no favicon and /favicon.ico returns 404.

**Reproduction:** 1. curl -I /favicon.ico. 2. ls public/.

**Expected:** Logo of a few KB, and a favicon.

**Actual:** 128 KB logo used in every sidebar; favicon 404 on each new session.

**Proposed fix:** Optimise the SVG (it probably embeds raster or long paths) and add app/icon.

**Regression test required:** Asset size budget.

**Dependencies / blockers:** None

### UX-033

**No automated accessibility or bundle checks in CI**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Test coverage |
| Affected module | CI |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Added devDependencies axe-core 4.12.1 and svgo 3.3.2, e2e/a11y.spec.js, npm run test:a11y, and a CI step that runs it on the production build. Fails on serious or critical violations. Public pages only: signed-in pages need an API in CI.

**Evidence:** failed before: no check. passes now: 2 of 2 locally on a production build. The workflow itself has not run on GitHub.

**Description:** No automated accessibility or bundle checks in CI.

**Root cause / investigation status:** .github/workflows/deploy.yml is the only workflow and has no axe, Lighthouse or Playwright reference (grep).

**Reproduction:** 1. Grep .github/workflows.

**Expected:** Accessibility and bundle budgets are enforced on change.

**Actual:** Nothing guards these areas, so regressions go unnoticed.

**Proposed fix:** Add an axe run and a route-size budget.

**Regression test required:** The CI job itself.

**Dependencies / blockers:** The repo production build currently fails (known to the main session); that blocks any build-based check.


## Informational

### AUTH-025

**Password policy is minimal, with a byte-truncation edge**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Security |
| Affected module | app/utils/security.py, app/schemas/auth.py |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Common-password list and 72-byte limit in validate_password_strength; new password must differ from the old on change and reset.

**Test:** tests/integration/test_auth_hardening.py::test_common_and_overlong_passwords_are_refused, ::test_new_password_must_differ

**Evidence:** failed before: run against unfixed code; passes now

**Description:** Password policy is minimal, with a byte-truncation edge.

**Root cause / investigation status:** validate_password_strength (security.py:49-65) needs 8 characters plus upper, lower and digit, with no common or breached password check and no check that the new password differs from the old. max_length=72 (schemas/auth.py:28,46,64) counts characters, while bcrypt uses 72 bytes, so long non-ASCII passwords are truncated silently. setup.py:37 has no maximum. The frontend matches the backend policy (fields.js:446-449). The frozen login schema allows length 6-128, which is harmless because existing accounts must still match.

**Reproduction:** Code reading.

**Expected:** Common passwords refused; byte limit explicit.

**Actual:** Passwords such as a keyboard pattern with one capital and one digit pass.

**Proposed fix:** Add a common-password list, and validate length in UTF-8 bytes.

**Regression test required:** Common password rejected; 73-byte multibyte password rejected.

**Dependencies / blockers:** None

### AUTH-027

**Middleware trusts client-writable pk_ cookies, for page shell routing only**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Authentication |
| Affected module | src/middleware.js, src/lib/tokens.js |
| Finding status | confirmed |
| Duplicates merged | AUTHZ-022, FE-027 |

**Phase 2 remediation (Fixed):** The optional cleanup that remained: pk_role now follows the server. syncRoleCookie in src/lib/auth/rbac.js, called from useHydrateProfile after /auth/me. Dev-bypass and PortalLoginPage were already gone. Limit: admin and faculty layouts hydrate on every load; student and superadmin layouts only when the profile is missing, so a stale role there re-syncs in a new tab or at the next sign-in. Middleware remains convenience only; the backend guard is test_forged_portal_cookies_get_no_data.

**Test:** src/lib/auth/rbac.test.js::syncRoleCookie (3 tests)

**Evidence:** failed before: 3 tests failed, function missing; passes now: full vitest 283/283

**Description:** Middleware trusts client-writable pk_ cookies, for page shell routing only.

**Root cause / investigation status:** middleware.js:52-54 and :78-90 route on pk_session and pk_role, which are plain script-set cookies (tokens.js:10-14, 37-41). Anyone can set them. Portal pages are client components, and data comes from the API. pk_role also goes stale after a role change until re-login, and mapUserTypeToRole sends unknown roles to student (rbac.js:32-40). The login page's NEXT_PUBLIC_DEV_BYPASS_AUTH branch (page.js:135-154) fakes a superadmin shell in the same way; it is false in .env.local and .env.example, and the API still rejects it. src/components/auth/PortalLoginPage.jsx is dead code, imported by no page in src/app.

**Reproduction:** 1. GET :3100/superadmin/dashboard with Cookie pk_session=1; pk_role=superadmin and no real session. Observed: 200, 17.8 KB HTML shell, no user data. Without cookies: 307 to /auth/login.

**Expected:** Middleware is a convenience, never the boundary.

**Actual:** That is what happens: backend enforces identity on each call. No data exposure found. A user whose role changed sees the old portal with API errors until they sign in again.

**Proposed fix:** Optional: drop the dev-bypass branch and PortalLoginPage, and re-sync pk_role from /auth/me.

**Regression test required:** Forged pk_ cookies never yield data from any portal page.

**Dependencies / blockers:** None

### BACKEND-053

**Documentation and label drift**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Informational |
| Category | Informational |
| Affected module | docs |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Backend done: request_job_changes and edu_video_bridge docstrings corrected. Earlier: health.py labels, users.py header.

**Test:** No automated test: docstrings. Verified by reading them.

**Evidence:** Not applicable: documentation

**Blocked on:** The rest is in the frontend repo, outside my ownership. docs/knowledge/flows/content-review-loop.md steps 1-2: replace the manual plan review and POST /submit with 'the pipeline renders automatically after upload'. docs/knowledge/api/interview-assignments.md and docs/knowledge/api/livekit-interview.md: mark as not mounted (INTERVIEWS_ENABLED false). CLAUDE.md: /docs note; /api/docs is now local only. Then log.md and node scripts/check-knowledge.mjs.

**Description:** Documentation and label drift.

**Root cause / investigation status:** content-review-loop.md steps 1-2 describe AWAITING_REVIEW and manual submit; run_pipeline auto-renders. routes.py request_job_changes docstring says note is not persisted, but it is. edu_video_bridge docstring says no changes_requested column. health.py hard-codes 'Email (Amazon SES)' for SMTP and the text 'resume or remove in Content' with no resume action. users.py header says college_admin creates only faculty or student; code also allows hod. docs/knowledge/api/interview-assignments.md and livekit-interview.md describe unmounted routes.

**Reproduction:** Compare docs with routes.

**Expected:** Docs match.

**Actual:** Readers are misled.

**Proposed fix:** Update docs.

**Regression test required:** node scripts/check-knowledge.mjs plus a route-list diff.

**Dependencies / blockers:** None

### DATA-030

**Model and schema drift, and dead columns**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Database integrity |
| Affected module | Models |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** ORM now declares both edu_video_review_events FKs, uq_qna_turns_session_turn_number and ix_users_tenant_id. Docstrings were fixed earlier. NOT clean: autogenerate still reports about 60 DB-only indexes, CHECKs and composite FKs, and the FKs on lessons and lesson_chunks cannot be declared because the tutor Base does not contain those parent tables. So 'alembic check' cannot be a CI gate yet.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** tests/integration/test_platform_limits.py::test_orm_declares_the_constraints_named_in_the_drift_report

**Evidence:** failed before: drift listing showed these missing from the ORM; passes now: pytest

**Decision needed:** Drop edu_video_scenes.video_path, video_provider_job_id, video_status (all empty) and users.plan / tenants.plan?

**Description:** Model and schema drift, and dead columns.

**Root cause / investigation status:** No missing tables or columns, and no nullability or type drift. Differences: edu_video_scenes has 3 unmapped columns (video_path, video_provider_job_id, video_status; all empty). FKs in DB but not ORM: edu_video_review_events (2), lessons (2), lesson_chunks (1); index and unique differences such as uq_qna_turns_session_turn_number and ix_users_tenant_id are absent from ORM declarations. Many server_defaults exist only in DB. ORM docs cite migration 0026_drop_users_department_freetext, which does not exist, and users.department is still written. users.plan and tenants.plan remain with no plan product (15 users have plan other than free). All columns are timestamptz (0 without time zone).

**Reproduction:** drift.py comparison against information_schema/inspector.

**Expected:** ORM mirrors the DB.

**Actual:** Harmless now, but create_all-based tests would differ from production.

**Proposed fix:** Declare the FKs and uniques in ORM; drop dead columns; correct the docstrings.

**Regression test required:** alembic check in CI (DATA-004).

**Dependencies / blockers:** DATA-004

### FE-026

**Dead code from B2C, plans, payments, jobs, OTP and old portals is still in src (38 unreachable modules)**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Frontend defect |
| Affected module | components/*, lib/* |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Deleted 37 unreachable modules plus fonts.js (FE-024); removed plan state from authSlice, store, rbac, useAuth, utils, login; removed uncalled userApi methods and reportsApi.generate.

**Test:** src/unusedModules.test.js; src/lib/auth/rbac.test.js::carries no plan state; production build

**Evidence:** failed before: unusedModules failed listing 37 files; passes now.

**Description:** Dead code from B2C, plans, payments, jobs, OTP and old portals is still in src (38 unreachable modules).

**Root cause / investigation status:** An import-graph walk from pages, layouts and middleware finds 38 unreachable files, including PremiumFeatureGate, UpgradeBanner, BlurredSection, PlanBadge, OTPModal, PortalLoginPage, RoleGuard, BulkUploadModal, lib/plans.js, lib/api/{plans,payments,jobs,dashboard}.js, lib/api/admin/{analytics,auth,reports,students}.js, lib/api/faculty/{auth,content,students}.js and lib/api/superadmin/auth.js. PremiumFeatureGate.jsx:6 and BlurredSection.jsx:6 import @/lib/constants/upgrade, which does not exist. Live modules also hold uncalled methods for removed routes: userApi.updateMe/uploadAvatar/uploadResume/getProfile (lib/api/user.js:8-29) and reportsApi.generate (lib/api/superadmin/modules.js:100). Plan state survives in authSlice, store/index.js and rbac.js. Six CSS lines mention plan, upgrade, interview or WhatsApp terms. None is reachable: no plan, interview or WhatsApp UI appeared on any walked page, and no live call hits a removed interview, profile, plan or /notifications/preferences route.

**Reproduction:** Run the graph walk (scratchpad audit/fe/dead.py).

**Expected:** No plan UI or dead modules in src, per the standing locks.

**Actual:** Dead code only; no user impact, but a future import would fail or revive plan UI.

**Proposed fix:** Delete in one commit after a build check; remove plan fields from the store.

**Regression test required:** Add an unused-module check to CI.

**Dependencies / blockers:** None

### FE-028

**Repository housekeeping: tracked temp files, hard-coded test IP, client-side auth bypass flag**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Informational |
| Category | Configuration/deployment |
| Affected module | repo root, apiConfig.js, next.config.js |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** No change in src: no DEV_BYPASS remains (grep). PRODUCTION_HOST in src/lib/apiConfig.js left as instructed.

**Test:** grep finds no DEV_BYPASS in src

**Evidence:** Verified by grep after this work.

**Blocked on:** Deploy must set NEXT_PUBLIC_TEST_SERVER_HOST in the test-server build first; then apiConfig.js can read it (also used by eduVideo.js and livekitUrl.js). Repo-root items stay with infra: tracked .tmp files, .playwright-mcp in .gitignore, NEXT_PUBLIC_RAZORPAY_KEY_ID in .env.example, IP in next.config images.

**Description:** Repository housekeeping: tracked temp files, hard-coded test IP, client-side auth bypass flag.

**Root cause / investigation status:** .tmp-cookies.txt, .tmp-dash.html and .tmp-dash2.html are tracked in git (no JWT-shaped strings found; contents not reproduced here). A raw http test-server IP is hard-coded at src/lib/apiConfig.js:2 and in next.config images. NEXT_PUBLIC_DEV_BYPASS_AUTH (auth/login/page.js:21) only fakes client state, so the API still rejects it. .env.example lists NEXT_PUBLIC_RAZORPAY_KEY_ID although payments are out of scope. .playwright-mcp is not gitignored, so the audit screenshots show as untracked.

**Reproduction:** git ls-files; inspect the named lines.

**Expected:** No temp files in git; config from environment.

**Actual:** As listed.

**Proposed fix:** Remove the temp files, move the IP to env, ignore .playwright-mcp.

**Regression test required:** None.

**Dependencies / blockers:** None

### INFRA-037

**Dead code and unused dependencies, including an LLM-code runner**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Backend defect |
| Affected module | app/edu_video/stages/visualizer.py, requirements.txt, app/livekit_interview |
| Finding status | confirmed |

**Phase 2 remediation (Blocked):** Removed edge-tts and piper-tts from requirements.txt and the lock (no import in app; not even installed in b2b_env). Image builds without them.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** tests/integration/test_coverage_deploy_config.py::test_unused_tts_packages_are_gone

**Evidence:** failed before: pinned. passes now.

**Blocked on:** app/edu_video/stages/visualizer.py: delete _render_manim, _render_mermaid, _render_graphviz. PIPER_MODEL in app/config.py and deploy.yml can then go. python-jose vs PyJWT and passlib left: both JWT libraries are imported.

**Description:** Dead code and unused dependencies, including an LLM-code runner.

**Root cause / investigation status:** _render_manim, _render_mermaid and _render_graphviz (visualizer.py:89,132,172) have no callers, so no generated code runs today; wiring them back would execute model output. edge-tts and piper-tts are pinned but unused by live paths. python-jose and PyJWT are both pinned, and passlib is unmaintained upstream. With INTERVIEWS_ENABLED=true, routes such as GET /normalize/{session_id} (livekit_routes.py:123) have no auth dependency.

**Reproduction:** 1. grep callers. 2. Read livekit_routes.py.

**Expected:** No unreachable execution paths; interview restore is safe.

**Actual:** Latent only.

**Proposed fix:** Remove the renderers and unused packages; add auth before ever restoring interviews.

**Regression test required:** None

**Dependencies / blockers:** None

### PIPE-026

**A crisis message alerts nobody**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Functional bug |
| Affected module | voice_qna |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Nothing changed: the owner's call, per the brief.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** depends on policy

**Evidence:** not applicable

**Decision needed:** When a student's message trips the crisis check, who if anyone is told? Options in the register: an opt-in alert to a named counsellor, or an anonymous count. Today only a log line is written, and the transcript is visible to the student alone.

**Description:** A crisis message alerts nobody.

**Root cause / investigation status:** qna_agent.py:225 and text_chat_service.py:111 only write a log line. The turn is stored in the transcript, which only the student can read. This is an owner and college policy decision, not a code defect.

**Reproduction:** Read the code.

**Expected:** To be decided by the owner.

**Actual:** A student's self-harm statement reaches no person.

**Proposed fix:** Decide a policy with legal and counselling input, considering privacy. Options: an opt-in alert to a named counsellor, or an anonymous count.

**Regression test required:** Depends on policy.

**Dependencies / blockers:** INFRA-022.

### PIPE-027

**Dead pipeline code and stale comments mislead readers**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Backend defect |
| Affected module | edu_video |
| Finding status | confirmed |

**Phase 2 remediation (Needs Business Decision):** Stale text fixed: planner prompt, verifier comment, LessonPlan docstring, ingestion_worker docstring. Dead code left in place.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Test:** tests/edu_video/test_p2_pipeline.py::test_no_stale_descriptions_of_the_old_system

**Evidence:** failed before: new test run before the fix (FAILED); passes now: full owned-area run

**Decision needed:** May I delete pptx_exporter.export_pptx, set_job_pptx, gemini_genai_client, fix_stray_scene_closing_brace, wan_service and scene_renderer? salvage_json_objects is now in use (PIPE-009).

**Description:** Dead pipeline code and stale comments mislead readers.

**Root cause / investigation status:** pptx_exporter.export_pptx and set_job_pptx have no caller and no download route, so pptx_path is never set. gemini_genai_client, salvage_json_objects, fix_stray_scene_closing_brace, wan_service and scene_renderer are unused. Stale text: scripter prompt says live browser canvas and no pre-rendered video, narrator comment in verifier mentions edge-tts, LessonPlan says Web Speech, ingestion_worker docstring says BackgroundTasks queue after the video task (it is a process pool now).

**Reproduction:** grep for callers.

**Expected:** Code and comments describe the current system.

**Actual:** A reader, or the planner model itself, gets outdated context.

**Proposed fix:** Delete after owner approval. Note that editing the prompt invalidates the plan cache, which is harmless.

**Regression test required:** None.

**Dependencies / blockers:** INFRA-037.

### UX-031

**Observation: video delivery works; no Cache-Control and a single rendition**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Performance |
| Affected module | Edu-video download |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Download route sends Cache-Control: private, no-cache. Chosen over max-age so a regenerated video or lost access takes effect; ETag revalidation keeps it cheap. A lower-bitrate rendition is not done (product work).

**Test:** tests/integration/test_platform_limits.py::test_video_is_private_and_never_compressed

**Evidence:** failed before: run on the unfixed code (11 + 16 failures); passes now: pytest, 27 passed

**Description:** Observation: video delivery works; no Cache-Control and a single rendition.

**Root cause / investigation status:** app/edu_video/routes.py:1524-1526 FileResponse.

**Reproduction:** 1. Fetch /edu_video/download/:id with Range in a student session.

**Expected:** Not applicable.

**Actual:** Range returns 206 with Accept-Ranges and ETag, 47-59 ms locally. 9.6 MB for 5:19 at 1496x720, preload=metadata. No Cache-Control, so an explicit private policy would be clearer for authenticated media. One rendition only, no adaptive streaming, which matters on slow college networks. S3 mode (redirect) was not tested.

**Proposed fix:** Add Cache-Control: private. Consider a lower-bitrate rendition.

**Regression test required:** Header test on the download route.

**Dependencies / blockers:** None

### UX-032

**Observation: stale @react-pdf/renderer config**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Configuration/deployment |
| Affected module | next.config.js |
| Finding status | confirmed |

**Phase 2 remediation (Fixed):** Removed the experimental.serverComponentsExternalPackages entry for the uninstalled @react-pdf/renderer from next.config.js.

**Evidence:** failed before: entry present. passes now; next build exit 0 without it.

**Description:** Observation: stale @react-pdf/renderer config.

**Root cause / investigation status:** next.config.js lists @react-pdf/renderer in serverComponentsExternalPackages, but package.json has no such dependency.

**Reproduction:** 1. Compare next.config.js with package.json.

**Expected:** Not applicable.

**Actual:** Harmless leftover. No react-pdf code is in the bundles.

**Proposed fix:** Remove the entry.

**Regression test required:** None.

**Dependencies / blockers:** None


## Withdrawn findings

| ID | Reason |
|---|---|
| AUTH-028 | Not a defect: auditor's 'checked and sound' note |
| UX-029 | Not a defect: slowness did not reproduce |
| DATA-031 | Not a defect: data snapshot, counts only |
| BACKEND-054 | Intentional: interview module off, routes unreachable; live leftover is AUTHZ-001 |

## Phase 3 issues (3 Nov 2026)

Found while executing the full QA suite and exploratory testing. Same fields as above.

| ID | Severity | Status | Title |
|---|---|---|---|
| [QA-001](#qa-001) | High | Fixed | Backend dependencies carried 77 known vulnerabilities, two with no patched release |
| [QA-002](#qa-002) | High | Needs Business Decision | Next.js 14 has unpatched critical and high advisories (XSS, cache poisoning, request smuggling, DoS) |
| [QA-003](#qa-003) | Low | Fixed | zod 3 has a memory-exhaustion advisory fixed only in zod 4 |
| [QA-004](#qa-004) | Low | Blocked | opentelemetry-api advisory cannot be patched while livekit-agents pins <1.45 |
| [QA-005](#qa-005) | Low | Fixed | SHA1 flagged by bandit in error fingerprints |
| [QA-006](#qa-006) | Low | Blocked | Build output and dev keys committed to git history |
| [APIX-001](#apix-001) | High | Fixed | A single signed-in request with an oversized field blocks the API event loop for minutes |
| [APIX-002](#apix-002) | High | Fixed | Voice tutor routes accept a platform cookie the rest of the API has already revoked |
| [APIX-003](#apix-003) | Medium | Fixed | A NUL character in a JSON body gives HTTP 500 on many write routes |
| [APIX-004](#apix-004) | Low | Fixed | Reactivating a user revives the access cookie issued before deactivation |
| [APIX-005](#apix-005) | Medium | Fixed | Access cookie keeps working for up to 30 minutes after logout |
| [APIX-006](#apix-006) | Informational | Fixed | No request body size limit on the API |
| [UIX-001](#uix-001) | Medium | Fixed | A taken university or college code is silently replaced and reported as plain success |
| [UIX-002](#uix-002) | Medium | Accepted | White on #F5821F primary buttons and #F5821F words fail contrast on 58 of 92 signed-in scans (UX-002, UX-003 still reproduce) |
| [UIX-003](#uix-003) | Medium | Fixed | Green status text, student teal labels and secondary buttons, and Neutral 400 labels fail AA contrast (not covered by UX-002/UX-003) |

### QA-001

**Backend dependencies carried 77 known vulnerabilities, two with no patched release**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Security |
| Affected module | requirements*.txt, app/services/token_service.py |
| Classification | genuine defect |

**Root cause:** pip-audit on requirements.lock.txt: 77 advisories in 11 packages (pillow 39, pyjwt 15, aiohttp 8, others). python-jose and ecdsa have no fixed version.

**Reproduction:** pip-audit -r requirements.lock.txt --no-deps --disable-pip

**Expected:** No known vulnerabilities

**Actual:** 77

**Fix:** Pinned patched versions (aiohttp 3.14.4, certifi 2026.10.18, dnspython 2.9.0, multidict 6.9.1, pillow 13.0.0, pyasn1 0.6.5, PyJWT 2.15.0, urllib3 2.8.0); moved token signing from python-jose to PyJWT and removed python-jose and ecdsa.

**Regression test:** tests/test_token_signing.py (alg none, wrong key, wrong algorithm, expired, junk); pip-audit in CI

**Evidence:** pip-audit 77 -> 1 (QA-004). Token tests pass; full backend suite 1,531 passed on the upgraded packages.


### QA-002

**Next.js 14 has unpatched critical and high advisories (XSS, cache poisoning, request smuggling, DoS)**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | High |
| Category | Security |
| Affected module | frontend: next 14.2.35 |
| Classification | genuine defect |

**Root cause:** npm audit: 9 advisories on next with fixes only in 15.5.16+/16.x; postcss is bundled by next.

**Reproduction:** npm audit --omit=dev

**Expected:** 0 critical/high

**Actual:** 1 critical, 2 high (next, postcss, zod)

**Fix:** Upgrade to Next 15/16 (React 19, async request APIs). Non-breaking fixes applied with npm audit fix.

**Regression test:** npm audit gate in CI; full e2e suite after the upgrade

**Evidence:** npm audit after fixes: 1 critical (next), 2 high (postcss via next, zod).

**Decision needed:** Approve a major Next.js upgrade (breaking change); until then put the image optimiser and rewrites behind nginx limits.


### QA-003

**zod 3 has a memory-exhaustion advisory fixed only in zod 4**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | frontend forms (10 files) |
| Classification | genuine defect |

**Root cause:** Advisory affects zod <4.6.6; the app uses zod 3 for client-side form validation only.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Reproduction:** npm audit --omit=dev

**Expected:** patched

**Actual:** zod 3.x

**Fix:** Migrate forms to zod 4 (API changes).

**Regression test:** vitest form tests + e2e journeys

**Evidence:** npm audit lists zod high, fix 4.6.7.

**Decision needed:** Approve the zod 4 migration; exposure is the user's own browser.


### QA-004

**opentelemetry-api advisory cannot be patched while livekit-agents pins <1.45**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Security |
| Affected module | voice agent dependencies |
| Classification | environment |

**Root cause:** Fix is 1.45.1; livekit-agents 1.6.8 requires opentelemetry-api<1.45.

**Reproduction:** pip install opentelemetry-api==1.45.1 && pip check

**Expected:** patched and consistent

**Actual:** pip check fails

**Fix:** Upgrade livekit-agents when a release allows 1.45+.

**Regression test:** pip-audit + pip check in CI

**Evidence:** pip check reported 3 conflicts with 1.45.1; reverted to 1.44.0.

**Blocked on:** An upstream livekit-agents release.


### QA-005

**SHA1 flagged by bandit in error fingerprints**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Security |
| Affected module | app/services/ops_monitor.py:85 |
| Classification | test defect |

**Root cause:** hashlib.sha1 without usedforsecurity=False; the hash only groups repeated errors.

**Reproduction:** bandit -r app

**Expected:** no high findings

**Actual:** B324 high

**Fix:** usedforsecurity=False

**Regression test:** bandit in CI

**Evidence:** Not a security use; flag documents intent. Backend suite passes.


### QA-006

**Build output and dev keys committed to git history**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Security |
| Affected module | frontend .next/prerender-manifest.json (19e0991); backend docker/livekit.yaml, docker/egress.yaml |
| Classification | genuine defect |

**Root cause:** gitleaks (redacted) found a Next preview key in committed .next output and LiveKit keys in docker YAML, plus the .env.example/config.py items already covered by INFRA-005.

**Reproduction:** gitleaks detect --redact on both repos

**Expected:** no secrets in history

**Actual:** 2 frontend, 7 backend matches

**Fix:** Rotate LiveKit keys if those values were ever used outside local dev; .next is no longer tracked.

**Regression test:** gitleaks in CI

**Evidence:** gitleaks JSON, values redacted.

**Blocked on:** Owner key rotation (same as INFRA-005).


### APIX-001

**A single signed-in request with an oversized field blocks the API event loop for minutes**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Availability |
| Affected module | ops monitor / voice tutor |
| Classification | genuine defect |

**Root cause:** app/services/ops_monitor.py record_error ran the redaction regexes (quadratic on long word runs) over the full text before truncating; app/voice_qna/db.py get_db logged every validation error, with the input, as a database failure

**Reproduction:** Any signed-in user sends one voice-tutor request whose field is far over its length limit; the API stops answering everyone for minutes.

**Expected:** Fast 422, nothing else affected

**Actual:** Event loop blocked about 200 s per request

**Fix:** Truncate before redacting; do not log validation errors as database failures

**Regression test:** tests/test_ops_monitor_redaction.py; tests/integration/test_api_abuse.py::test_a_refused_voice_body_is_not_logged_as_a_database_failure

**Evidence:** failed before: 212 s for one record; passes now: under 1 s


### APIX-002

**Voice tutor routes accept a platform cookie the rest of the API has already revoked**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Session management |
| Affected module | voice tutor |
| Classification | genuine defect |

**Phase 4 revalidation:** not verified as claimed (paid voice routes were missed); completed by SEC-001.

**Root cause:** app/voice_qna/security.py _platform_user_id checked only is_active, not token_version or institution status

**Reproduction:** Sign in as a student; change the password, or deactivate the college; reuse the old cookie on a voice route.

**Expected:** 401 as on every other route

**Actual:** 200, including routes that start paid model work

**Fix:** Same token_version and institution checks as app/api/deps.get_current_user

**Regression test:** tests/integration/test_api_abuse.py (3 voice cookie tests)

**Evidence:** failed before: assert 200 == 401 (x3); passes now


### APIX-003

**A NUL character in a JSON body gives HTTP 500 on many write routes**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Input validation |
| Affected module | all JSON write routes |
| Classification | genuine defect |

**Root cause:** Postgres text rejects NUL and bcrypt rejects it in passwords; BACKEND-011 guarded query strings only (app/utils/request_guard.py)

**Reproduction:** Send a NUL in a profile, user, department, academics, comment, login tenant slug or new-password field.

**Expected:** 422

**Actual:** 500

**Fix:** App-wide dependency reject_nul_in_json_body in app/utils/request_guard.py, registered in app/main.py

**Regression test:** tests/integration/test_api_abuse.py (6 NUL tests)

**Evidence:** failed before: CharacterNotInRepertoireError / PasswordValueError 500; passes now: 422


### APIX-004

**Reactivating a user revives the access cookie issued before deactivation**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Session management |
| Affected module | users |
| Classification | genuine defect |

**Root cause:** app/api/v1/users.py deactivate_user did not bump token_version

**Reproduction:** Sign in; admin deactivates then reactivates the account; the old cookie works again.

**Expected:** Old cookie stays dead

**Actual:** 200

**Fix:** Bump token_version on deactivation

**Regression test:** tests/integration/test_api_abuse.py::test_a_cookie_does_not_come_back_to_life_on_reactivation

**Evidence:** failed before: assert 200 == 401; passes now


### APIX-005

**Access cookie keeps working for up to 30 minutes after logout**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Session management |
| Affected module | auth logout |
| Classification | genuine defect |

**Root cause:** app/api/v1/auth.py logout revokes the refresh token only; access tokens are stateless

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Reproduction:** Sign in, copy the access cookie, log out, reuse it.

**Expected:** 401

**Actual:** 200 until expiry

**Fix:** Options: a jti denylist (new table) or a shorter access lifetime; bumping token_version would sign out every device

**Evidence:** live: old access after logout 200

**Decision needed:** Accept the window, add a per-session denylist, or shorten the access lifetime


### APIX-006

**No request body size limit on the API**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Availability |
| Affected module | app/main.py / proxy |
| Classification | genuine defect |

**Root cause:** No body limit in the app; relies on the reverse proxy

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Reproduction:** A 12 MB login body is read and processed.

**Expected:** 413 above a set limit

**Actual:** Processed

**Fix:** Set a limit at nginx (client_max_body_size) or in the app

**Evidence:** live: 12 MB body answered 401 after full read

**Decision needed:** Limit and where to enforce it


### UIX-001

**A taken university or college code is silently replaced and reported as plain success**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Functional bug |
| Affected module | Super Admin: universities, colleges |
| Classification | genuine defect |

**Phase 4 revalidation:** college half did not work; completed by FUN-003.

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Root cause:** src/app/superadmin/universities/page.jsx onSave and src/components/superadmin/colleges/collegeParts.jsx onSave ignored the returned code; the API (app/services/code_series.py:110 resolve_code) swaps a taken code for the next series code by design

**Reproduction:** SA > Universities > Add university; type a code that already exists; fill location; Create university

**Expected:** The admin is told the typed code was taken (the hint says 'Must be unique.')

**Actual:** Saved as UNI-0001, toast 'University created', dialog closes; the typed code is lost without notice

**Fix:** src/lib/superadmin/savedCode.js createdMessage(); both forms read the created record and toast 'University created as UNI-0001. The code X was already in use.'

**Regression test:** e2e/journeys-superadmin.spec.js 'a taken university code is never swapped silently'; src/lib/superadmin/savedCode.test.js

**Evidence:** failed before: :3200 row saved as UNI-0001, no message; passes now: :3201 fix build 10/10, unit 3/3

**Decision needed:** Should the API refuse a taken code (409) instead of reassigning it? The UI now reports either outcome.


### UIX-002

**White on #F5821F primary buttons and #F5821F words fail contrast on 58 of 92 signed-in scans (UX-002, UX-003 still reproduce)**

| Field | Value |
|---|---|
| Status | Accepted |
| Severity | Medium |
| Category | Accessibility |
| Affected module | All portals |
| Classification | genuine defect |

**Root cause:** UX-002 / UX-003: src/styles/quirri-design.css --accent #F5821F with white label; --accent-text #F5821F

**Owner decision (chat, 3 Nov 2026):** keep the guideline orange exactly as designed (white on `#F5821F`, orange status words). The contrast shortfall is accepted; the ink-text change was reverted.

**Reproduction:** npx playwright test e2e/journeys-a11y.spec.js

**Expected:** WCAG AA 4.5:1

**Actual:** 203 serious nodes after UIX-003, all #F5821F: white on orange buttons 2.59:1 (.sd-btn--amber, .btn-primary, student primary buttons) and orange words on white 2.59:1 (.sp-pill--low 'Pending activation', .pm-missing, .an-reason, .fa-reason, .sd-kpi-v.is-focus, .fa-chapter-tag 2.36:1 on #F1F5F6, SA health counts)

**Fix:** None: colour is locked

**Regression test:** e2e/journeys-a11y.spec.js

**Evidence:** axe 4.12.1 on :3201 fix build: 32/92 scans pass, every failing node is #F5821F

**Decision needed:** Same as UX-002/UX-003


### UIX-003

**Green status text, student teal labels and secondary buttons, and Neutral 400 labels fail AA contrast (not covered by UX-002/UX-003)**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Accessibility |
| Affected module | All portals: status pills, student portal, programmes list |
| Classification | genuine defect |

**Root cause:** src/styles/quirri-design.css --progress-text #46921A (3.89:1 on white); src/styles/data-viz.css --band-strong-text #46921A; src/styles/student-b2c.css and portal-b2c.css --sb-secondary teal-400 behind white (4.09:1); --sb-index teal-400 used as text in student-dashboard/progress/learning/b2c css (4.09:1); src/styles/portal-modules.css .as-sems small and .cs-where small.is-muted use --neutral-400 (2.63:1), which design-system.md reserves for placeholders

**Reproduction:** Run e2e/journeys-a11y.spec.js; e.g. /superadmin/universities 'Active' pill, /student/home 'Your next step', /student/leaderboard 'Clear', /admin/structure/programmes 'No subjects'

**Expected:** WCAG 1.4.3 AA 4.5:1

**Actual:** 46 + 8 + 2 serious color-contrast nodes

**Fix:** --progress-text and --band-strong-text -> #387614 (5.6:1 white, 4.9:1 canvas, 5.1:1 on #EEF7E6); --sb-secondary -> teal-500 in both files; new --sb-index-text (teal-500) for every text use of the index teal, decorative uses keep teal-400; the two grey small labels -> --neutral-500. No orange, radius, font or layout change.

**Regression test:** src/styles/contrast.test.js 'progress and student text tokens' (8 tests); e2e/journeys-a11y.spec.js

**Evidence:** failed before: contrast.test.js 8 failed, axe 56 non-orange nodes; passes now: contrast.test.js 21/21, axe on :3201 0 non-orange nodes, journeys 158/158

**Decision needed:** Owner may want to confirm the darker green #387614 for --progress-text (same approach as UX-004).

## Phase 4 issues (3 Nov 2026, independent audit)

| ID | Severity | Status | Title |
|---|---|---|---|
| [SEC-001](#sec-001) | High | Fixed | Voice tutor start and chat accept a login cookie or bearer that a password change, reset or deactivation already ended |
| [SEC-002](#sec-002) | Medium | Fixed | Voice bearer token survives a password change, reset or deactivate/reactivate for its full hour |
| [FUN-001](#fun-001) | Medium | Fixed | A second year promotion in one academic year dead-ends: the 409 says 'Confirm to promote them again' but the UI cannot confirm |
| [FUN-002](#fun-002) | Low | Fixed | Retry is offered on chapters that failed during planning; the API always refuses it |
| [FUN-003](#fun-003) | Medium | Fixed | UIX-001 college half never worked: a taken college code is still swapped silently |
| [FUN-004](#fun-004) | Low | Fixed | After Save & regenerate the chapter stays in Change requests with 'Review edits' while it renders; regenerating again gets 400 |
| [FUN-005](#fun-005) | Informational | Fixed | Superadmin all-colleges promotion: one already-promoted college blocks every college, and repeat_confirmed re-promotes it |

### SEC-001

**Voice tutor start and chat accept a login cookie or bearer that a password change, reset or deactivation already ended**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Authentication / session revocation |
| Affected module | voice_qna |
| Classification | genuine defect |

**Root cause:** app/voice_qna/api/simple.py:_resolve_identity (old lines 190-199) decoded the platform token and checked only is_active + institution (user_is_active), never predates_credential_change. APIX-002 fixed only security._platform_user_id, which serves the history routes

**Reproduction:** Sign in as a student and keep the access_token cookie; change the password (or have an admin deactivate then reactivate). Send the old cookie, or the same JWT as Authorization: Bearer, to POST /voice_qna/chat?lesson_id=<id> or POST /voice_qna/conversation?lesson_id=<id>

**Expected:** 401, as /auth/me and every other route

**Actual:** Identity accepted (404 for a random lesson; for a real lesson the route starts a LiveKit room and paid agent, or a paid model call, and mints a fresh voice token)

**Fix:** New security.platform_user_id_from_token (is_access_payload + is_active + token_version + institution) used by both _platform_user_id and _resolve_identity

**Regression test:** tests/integration/test_voice_identity_revocation.py::test_a_cookie_from_before_a_password_change_cannot_start_tutor_work[conversation,chat], ::test_a_stale_login_token_sent_as_bearer_cannot_start_tutor_work[conversation,chat]

**Evidence:** failed before: 4 failed, assert 404 == 401; passes now: 4 passed; tests/voice_qna + test_api_abuse + test_tutor_access + test_platform_limits + new file: 251 passed


### SEC-002

**Voice bearer token survives a password change, reset or deactivate/reactivate for its full hour**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Session revocation |
| Affected module | voice_qna |
| Classification | genuine defect |

**Root cause:** app/voice_qna/security.py:create_access_token carried no token_version; _bearer_user_id and _resolve_identity checked only is_active

**Reproduction:** Start a tutor call (the response includes user_token). Change the password. Send Authorization: Bearer <user_token> to GET /voice_qna/conversations or POST /voice_qna/chat within the hour

**Expected:** 401

**Actual:** 200 on history; start/chat accepted

**Fix:** Voice token carries tv (users.token_version at issue, via issue_voice_token); decode_access_claims returns it; user_is_active(..., token_version) refuses a mismatch. Tokens without tv count as version 0, so tokens in flight keep working unless the version moved

**Regression test:** tests/integration/test_voice_identity_revocation.py::test_a_voice_token_from_before_a_password_change_is_refused

**Evidence:** failed before: assert 200 == 401; passes now; voice suites 251 passed

**Blocked on:** Not blocking: the frontend already ignores user_token (AUTH-010); dropping it from StartConversationResponse is an API contract change for the owner


### FUN-001

**A second year promotion in one academic year dead-ends: the 409 says 'Confirm to promote them again' but the UI cannot confirm**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Integration mismatch |
| Affected module | College Admin > Students > Promote to next year |
| Classification | genuine defect |

**Root cause:** src/app/admin/(portal)/students/page.jsx PromoteYearModal.confirm sent only dry_run; src/lib/api/superadmin/users.js bulkPromoteYear had no repeat_confirmed; app/api/v1/users.py dry-run response did not say the college was already promoted

**Reproduction:** Promote (200), open the modal again, Promote: toast with the 409 text, no confirm control

**Expected:** Preview warns the college was already promoted this year; admin can deliberately promote again or cancel

**Actual:** Preview looks normal, confirm always fails

**Fix:** Backend: additive BulkPromoteYearResponse.already_promoted_this_year. FE: lib/admin/promotion.js (promotionBody, isAlreadyPromoted); modal shows a danger note and 'Promote again: N students', sends repeat_confirmed; a 409 switches to that state

**Regression test:** tests/integration/test_fun_audit.py::test_promotion_preview_says_when_the_college_was_already_promoted; src/lib/admin/promotion.test.js

**Evidence:** failed before: KeyError already_promoted_this_year; vitest module missing. passes now: test_fun_audit + test_api_rules 81 passed; promotion.test.js 3/3; vitest 304/304; build exit 0


### FUN-002

**Retry is offered on chapters that failed during planning; the API always refuses it**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Integration mismatch |
| Affected module | Content studio |
| Classification | genuine defect |

**Root cause:** src/components/shared/EduVideoContentStudio.jsx failed-stage Retry for every FAILED job; app/edu_video/routes.py regenerate_job returns 400 'No plan available to regenerate from' when planning failed

**Reproduction:** A chapter whose planning fails shows Retry; Retry toasts 'No plan available to regenerate from.'

**Expected:** Retry only where a re-render from the saved plan is possible

**Actual:** A button that never works

**Fix:** lib/admin/videoRetry.js canRetryFailedJob (FAILED and total_scenes > 0; scenes exist only after planning)

**Regression test:** src/lib/admin/videoRetry.test.js 'FUN-002 retry a failed chapter'

**Evidence:** failed before: module missing; passes now 3/3, vitest 304/304, build exit 0

**Decision needed:** Should a planning failure be retryable (re-runs paid planning) or re-upload only? Also PLANNING_UNAVAILABLE in app/edu_video/job_errors.py says 'Please try again later', which needs a new upload today.


### FUN-003

**UIX-001 college half never worked: a taken college code is still swapped silently**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Integration mismatch |
| Affected module | Super Admin > Colleges |
| Classification | genuine defect |

**Root cause:** src/components/superadmin/colleges/collegeParts.jsx:154 read saved?.code; POST /colleges returns CollegeCreateResponse {college, admins_invited} (app/schemas/college.py:142)

**Reproduction:** Add college with an existing code > Create

**Expected:** 'College created as COL-000N. The code X was already in use.'

**Actual:** 'College created'

**Fix:** lib/superadmin/savedCode.js savedCodeOf() reads response.college.code or response.code; used by collegeParts.jsx and universities/page.jsx

**Regression test:** src/lib/superadmin/savedCode.test.js 'reads the saved code from a college create response'

**Evidence:** failed before: savedCodeOf is not a function; passes now 5/5, vitest 304/304, build exit 0. e2e covers only the university case; live check not run (stack down)


### FUN-004

**After Save & regenerate the chapter stays in Change requests with 'Review edits' while it renders; regenerating again gets 400**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Regression (Phase 2, from BACKEND-004) |
| Affected module | Content studio > Change requests |
| Classification | genuine defect |

**Root cause:** BACKEND-004 keeps changes_requested_at until a render succeeds; EduVideoContentStudio.jsx queue assumed regenerate clears it and offered Review edits on a RENDERING job (openFeedbackEdit forces status DONE)

**Reproduction:** Change requests > Review edits > Save & regenerate; row still offers Review edits; Save & regenerate again: 'Job can only be regenerated once rendering has finished. Current status: RENDERING'

**Expected:** Row shows the chapter is regenerating, then leaves the queue (or becomes editable again if the render failed)

**Actual:** Looks like nothing happened; a second try errors

**Fix:** lib/admin/videoRetry.js isRegenerating(); the row shows a disabled 'Regenerating…' button while the job is not DONE/FAILED

**Regression test:** src/lib/admin/videoRetry.test.js 'FUN-004 change request while regenerating'

**Evidence:** failed before: isRegenerating is not a function; passes now 5/5, vitest 304/304, build exit 0


### FUN-005

**Superadmin all-colleges promotion: one already-promoted college blocks every college, and repeat_confirmed re-promotes it**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Business rule |
| Affected module | app/api/v1/users.py bulk_promote_year (tenant_id omitted) |
| Classification | genuine defect |

**Root cause:** app/api/v1/users.py bulk_promote_year: the 409/repeat check is any() over all tenants

**Owner decision (3 Nov 2026):** implemented per [OWNER_DECISIONS.md](OWNER_DECISIONS.md), with regression tests; full suites green.

**Reproduction:** Code reading; no UI calls the platform-wide variant

**Expected:** Per-college decision

**Actual:** All or nothing

**Fix:** None

**Evidence:** code reading

**Decision needed:** Keep platform-wide promotion, or require tenant_id?

## Post-decision issues (3 Nov 2026)

### A11Y-FLAKE-001

**Intermittent axe colour-contrast failures on 2 to 5 of 92 signed-in pages per run**

| Field | Value |
|---|---|
| Status | In Progress |
| Severity | Low |
| Category | Accessibility |
| Affected module | e2e/journeys-a11y.spec.js; settings tabs, analytics tabs, leaderboard stats |
| Classification | not yet determined (timing or genuine) |

**Evidence:** after owner decision 1, the contrast failures dropped from 60 to 5. The `.sb-btn--go` white-on-orange case was a genuine defect: it is fixed, with a regression test in `src/styles/contrast.test.js`. Three further runs failed 2, 3 and 5 different pages each time, and a direct probe of the same pages found 0 violations, which points to measurement during page transitions. Waiting for animations inside the test caused timeouts, so that change was reverted. Not marked passed.

**Next step:** take axe snapshots with motion reduced (prefers-reduced-motion) or after the `.page.show` animation ends, and confirm whether any element fails at rest.

## Client-package issues (4 Nov 2026)

Issues found or confirmed while building the client QA package (coverage, cross-browser, performance, integration, privacy runs of 2 to 4 Nov 2026), plus QA-FLAKE-002. Source: the five agent result files and the coordinator's final run. Fixed means fixed in the working tree with a regression test or a named verification; nothing here is committed. XB fixes were verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work; the post-restore browser re-run is described in docs/audit/client/25-cross-browser.md.

| Severity | Fixed | In Progress | Blocked | Needs Business Decision | Total |
|---|---|---|---|---|---|
| High | 6 | 0 | 0 | 2 | 8 |
| Medium | 8 | 1 | 1 | 4 | 14 |
| Low | 10 | 1 | 2 | 1 | 14 |
| Informational | 1 | 0 | 1 | 0 | 2 |
| **Total** | 25 | 2 | 4 | 7 | 38 |

Update to an existing entry: A11Y-FLAKE-001 stays In Progress (not marked passed). XB found the cause of part of it: XB-002 (student index-teal text, 4.09:1) was a genuine defect and is fixed; the remaining intermittency is timing. The flake rate (three a11y runs per browser) was not measured.

| ID | Severity | Status | Module | Title |
|---|---|---|---|---|
| [COV-001](#cov-001) | High | Fixed | frontend repo state (src/lib/tokens.js, package.json, 32 *.test.js, vitest.config.mjs; 223 files) | Frontend Phase 2 remediation is in git stash@{0}, not in the tree under test; the register marks those items Fixed |
| [COV-002](#cov-002) | Medium | Fixed | src/lib/tokens.js | AUTH-010 half-fixed at HEAD: clearTokens/setSessionCookie leave localStorage voiceQnaToken |
| [COV-003](#cov-003) | High | Fixed | package.json, package-lock.json, Dockerfile | package.json/lock pin next 14.2.3, zod ^3, @hookform/resolvers ^3 while node_modules runs next 14.2.35, zod 4.6.7; Dockerfile npm ci would ship the vulnerable versions |
| [COV-004](#cov-004) | Medium | Needs Business Decision | requirements.lock.txt; app/edu_video/document_merger.py, stages/extractor.py, stages/image_slide_renderer.py, stages/svg_renderer.py, app/voice_qna/services/parser.py | PyMuPDF (AGPL-3.0 or commercial) is a runtime backend dependency |
| [COV-005](#cov-005) | Low | Fixed | E:/b2b/b2b_projectk/docker/egress.yaml (directory created 4 Nov 12:20) | docker/egress.yaml is an empty directory, failing the INFRA-028 config test |
| [XB-001](#xb-001) | Medium | Fixed | AcademicStructureWorkspace (SA academics, CA programmes) | Programme listbox: li between role=listbox and role=option |
| [XB-002](#xb-002) | Low | Fixed | student home .shb-over, progress .spg-next-tag/.spg-row-date, learning numbers | Student index-teal (#4D8691) text on white fails AA (4.09) |
| [XB-003](#xb-003) | Low | Fixed | 19 date formatters | Short dates print 'Sept' (all engines) instead of 'Sep' |
| [XB-004](#xb-004) | Low | Fixed | 4 portal layouts, ReportsWorkspace | Scrollable main / report table not keyboard reachable |
| [XB-005](#xb-005) | Low | Fixed | admin students/staff reloadAll, AcademicStructure refreshAll | Unhandled 'Request aborted' after create on Firefox |
| [XB-006](#xb-006) | Low | Fixed | data-viz.css .mdc-ring-t b (compact + narrow) | Donut centre total bold (700) at 22/26px |
| [XB-007](#xb-007) | Low | Fixed | portal-faculty.css | Faculty status-pill dot 8px (6px elsewhere) |
| [XB-008](#xb-008) | Medium | In Progress | admin structure departments | React #310 (hook count changed) once on /admin/structure -> departments in WebKit |
| [XB-009](#xb-009) | Medium | Fixed | app/Providers.jsx Toaster (all portals) | Success toast covers the page's main action and blocks it while hovered |
| [PERF-001](#perf-001) | High | Fixed | Reports / SA dashboard / analytics (app/api/v1/reports.py _activity, _build_rows) | Report aggregate rebuilt each student's reachable-chapter set from every published chapter (7.75M ORM attribute reads per platform report); institution/department rows rescanned all students per college/department |
| [PERF-002](#perf-002) | Low | Fixed | app/api/v1/dashboard.py | Super Admin dashboard ran two queries per active college (university name, student count) |
| [PERF-003](#perf-003) | Medium | Fixed | app/services/college_insights.py | College analytics counted subject learners by scanning every student for every subject |
| [PERF-004](#perf-004) | Low | Fixed | Reports / analytics SQL | 'Deleted jobs' subquery (four per report request) was a sequential scan of every job |
| [PERF-005](#perf-005) | Medium | Fixed | app/api/v1/reports.py _students | Reports hydrated 30,000 full ORM User objects (password hash included) to read eight fields |
| [PERF-006](#perf-006) | High | Needs Business Decision | Platform capacity / reports, analytics, dashboard | One API worker cannot serve realistic mixed load: p95 > 5 s from about 11 concurrent users; 50+ users exhaust the DB pool (HTTP 500) |
| [PERF-007](#perf-007) | Medium | Needs Business Decision | app/config.py DB_POOL_SIZE / DB_MAX_OVERFLOW (deployment) | Default pools allow 40 connections per process; 4 workers could open 160 against max_connections=100 |
| [PERF-008](#perf-008) | Medium | Needs Business Decision | college_insights.college_overview, reports.preview_report/download_report | Unbounded responses and Python-side paging: /analytics/college returns every student (1.9 MB for 3,000); /reports/preview builds all rows then slices; CSV/PDF export of the platform student report is unbounded (30,000 rows, 1.7 MB CSV) |
| [PRIV-002](#priv-002) | Medium | Fixed | app/services/notification_service.py | deliver_email logs the recipient address in plain text |
| [PRIV-003](#priv-003) | Medium | Fixed | app/services/notification_service.py | DEBUG logs full e-mail bodies with live reset/activation links in any environment |
| [INT-001](#int-001) | Low | Needs Business Decision | app/services/notification_catalog.py / notification_events.verification_code | Catalogue lists 'Verification code' (mandatory, Always on) but nothing ever sends it |
| [INT-002](#int-002) | Low | Blocked | src/lib/api/{admin/analytics,admin/reports,admin/students,dashboard,faculty/content,faculty/students,jobs,payments,plans,user}.js, auth.js sendOtp/verifyOtp, superadmin/modules.js reportsApi.generate | 49 frontend API client calls target endpoints that do not exist (dead modules incl. payments/plans/subscriptions, OTP, profile) |
| [INT-003](#int-003) | Low | Fixed | scripts/backup_offsite.sh | backup_offsite.sh could only reach AWS S3, so the off-host copy could not be rehearsed or restored from an S3-compatible store |
| [INT-004](#int-004) | Low | Blocked | .env.example | .env.example omits 66 settings, including every EMAIL_*, SMTP_* and SES_* variable |
| [INT-007](#int-007) | Medium | Fixed | E:/b2b_superAdmin_frontend/.dockerignore, Dockerfile | Frontend local docker build took .env.local, .next-* builds and docs into the build context; final stage ran as root |
| [INT-008](#int-008) | High | Fixed | requirements.lock.txt | requirements.lock.txt is unresolvable: backend Docker image (every deploy) fails at pip install |
| [INT-009](#int-009) | Informational | Fixed | .dockerignore (backend) | Backend image carries .ruff_cache, .github, .coveragerc and requirements-dev.txt |
| [INT-010](#int-010) | Medium | Blocked | app/voice_qna/services/embedding_service.py:17 | API crash-loops at import when OPENAI_API_KEY is empty, although the setting defaults to empty |
| [INT-011](#int-011) | High | Fixed | scripts/backup.sh | First deploy stops at 'Back up database': backup.sh exits 1 on an empty, never-migrated database |
| [INT-012](#int-012) | Informational | Blocked | local environment | Local LiveKit container crash-loops since the WSL restart; MinIO images unavailable |
| [PRIV-001](#priv-001) | High | Fixed | app/services/ops_monitor.py (redact, record_error) | Ops error log redacted only e-mail and phone: JWTs, Bearer credentials, ?token= links, echoed passwords and the request path were stored in clear |
| [PRIV-004](#priv-004) | High | Needs Business Decision | product-wide | DPDP duties with no implementation: consent notice and record, withdrawal, erasure, breach notification, children's age and guardian consent, grievance contact |
| [PRIV-005](#priv-005) | Medium | Needs Business Decision | app/services/ops_monitor.py _prune, app/api/v1/reports.py (PERF-owned) | No retention limit for audit_logs, notification_deliveries, qna_turns, watch progress, quiz attempts, deactivated accounts, interview-era tables and S3 recordings; report downloads not audit-logged |
| [QA-FLAKE-002](#qa-flake-002) | Low | In Progress | tests/integration/test_owner_decisions_decb.py | test_logout_revokes_the_bearer_on_sync_routes_and_the_tutor failed once in the full backend run (asyncpg event-loop error in the test client) |

### COV-001

**Frontend Phase 2 remediation is in git stash@{0}, not in the tree under test; the register marks those items Fixed**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Coverage and supply chain |
| Affected module | frontend repo state (src/lib/tokens.js, package.json, 32 *.test.js, vitest.config.mjs; 223 files) |
| Classification | genuine |

**Root cause:** stash@{0} 'wip: remaining frontend (tests, e2e, cleanup, deploy, deps)' was not re-applied after commit 590536a, which carried only part of the work (voiceQna.js and its test, not tokens.js)

**Reproduction:** git stash show --name-only --include-untracked stash@{0}; AUTH-010 register text cites signOut.test.js and 'full vitest 283/283', neither exists at HEAD

**Fix:** Owner: git checkout -- package.json package-lock.json; git stash pop stash@{0}; re-add @vitest/coverage-v8@2.1.9. Not applied: no git state changes allowed. COV made the tokens.js fix, then reverted it so the stash pops cleanly

**Regression test:** src/lib/api/voiceQna.test.js (2 tests); src/lib/tokens.cov.test.js::sign-in and logout drop the legacy voice token

**Evidence:** docs/audit/evidence/coverage/frontend-vitest-results.json

**Resolution note (4 Nov 2026):** Stash restored on 4 Nov 2026 and the day's changes merged on top (12 conflicted files resolved). Coordinator-reported after the restore: vitest 380/380, lint 0 errors, production build passes. Not re-executed by the report writer.

### COV-002

**AUTH-010 half-fixed at HEAD: clearTokens/setSessionCookie leave localStorage voiceQnaToken**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Coverage and supply chain |
| Affected module | src/lib/tokens.js |
| Classification | genuine |

**Root cause:** see COV-001; forgetVoiceToken() exists only in stash@{0}

**Reproduction:** npx vitest run --config docs/audit/evidence/coverage/vitest.cov.config.mjs -> 3 failures

**Fix:** restore stash@{0} (forgetVoiceToken in setSessionCookie and clearTokens)

**Regression test:** src/lib/tokens.cov.test.js; src/lib/api/voiceQna.test.js

**Evidence:** docs/audit/evidence/coverage/frontend-vitest-results.json

**Resolution note (4 Nov 2026):** Fixed by the 4 Nov 2026 stash restore (forgetVoiceToken present again). Coordinator-reported vitest 380/380.

### COV-003

**package.json/lock pin next 14.2.3, zod ^3, @hookform/resolvers ^3 while node_modules runs next 14.2.35, zod 4.6.7; Dockerfile npm ci would ship the vulnerable versions**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Coverage and supply chain |
| Affected module | package.json, package-lock.json, Dockerfile |
| Classification | genuine |

**Root cause:** the QA-002/QA-003 bumps exist only in stash@{0} and the local node_modules; many installed packages are extraneous (@playwright/test, vitest, svgo)

**Reproduction:** npm ls --depth=0 (extraneous/invalid); npm audit --omit=dev -> next critical, fix 14.2.35

**Fix:** as COV-001 (restore stash), then npm install to resync the lock

**Regression test:** npm audit --omit=dev (docs/audit/evidence/sbom/npm-audit-prod.json)

**Evidence:** docs/audit/evidence/sbom/audit-summary.json

**Resolution note (4 Nov 2026):** Lock and manifest resynced by the 4 Nov 2026 restore. Residual after restore: npm audit (production) shows 2 (next critical, postcss high); tracked as QA-002, which needs the owner's approval of a major Next upgrade.

### COV-004

**PyMuPDF (AGPL-3.0 or commercial) is a runtime backend dependency**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Medium |
| Category | Coverage and supply chain |
| Affected module | requirements.lock.txt; app/edu_video/document_merger.py, stages/extractor.py, stages/image_slide_renderer.py, stages/svg_renderer.py, app/voice_qna/services/parser.py |
| Classification | genuine |

**Root cause:** PDF extraction uses fitz; AGPL network-use terms apply to a hosted service unless an Artifex commercial licence is held

**Reproduction:** docs/audit/evidence/sbom/licence-summary.json

**Fix:** Business/legal decision: confirm a commercial licence, or replace with pypdfium2 (already present, BSD/Apache)

**Regression test:** n/a

**Evidence:** docs/audit/evidence/sbom/licences.csv

### COV-005

**docker/egress.yaml is an empty directory, failing the INFRA-028 config test**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Coverage and supply chain |
| Affected module | E:/b2b/b2b_projectk/docker/egress.yaml (directory created 4 Nov 12:20) |
| Classification | environment |

**Root cause:** a Docker bind-mount of a missing file creates a directory (local LiveKit/egress stack run by another agent)

**Reproduction:** pytest tests/integration/test_coverage_deploy_config.py::test_tracked_livekit_files_hold_no_secret_value

**Fix:** remove the empty directory once the INT stack stops (INT owns Docker); no product change

**Regression test:** tests/integration/test_coverage_deploy_config.py::test_tracked_livekit_files_hold_no_secret_value

**Evidence:** docs/audit/evidence/coverage/scripts/log2.integ0.txt

**Resolution note (4 Nov 2026):** The stray empty Docker-created folder was removed; test_tracked_livekit_files_hold_no_secret_value passes (coordinator-reported).

### XB-001

**Programme listbox: li between role=listbox and role=option**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Cross-browser, accessibility and UI |
| Affected module | AcademicStructureWorkspace (SA academics, CA programmes) |
| Classification | genuine |

**Root cause:** <li> without role sits between listbox and option

**Reproduction:** axe on /superadmin/academics, /admin/structure/programmes at any viewport

**Fix:** li role=none

**Regression test:** e2e/journeys-a11y.spec.js

**Evidence:** full-chromium.log

**Note:** verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work.

### XB-002

**Student index-teal (#4D8691) text on white fails AA (4.09)**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Cross-browser, accessibility and UI |
| Affected module | student home .shb-over, progress .spg-next-tag/.spg-row-date, learning numbers |
| Classification | genuine |

**Root cause:** text used --sb-index (fill token) not --sb-index-text

**Reproduction:** axe at rest on /student/home, /student/progress

**Fix:** color: var(--sb-index-text) on 7 text rules

**Regression test:** e2e/journeys-a11y.spec.js

**Evidence:** flake-chromium.json (fails at rest and with reduced motion)

**Note:** verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work.

### XB-003

**Short dates print 'Sept' (all engines) instead of 'Sep'**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Cross-browser, accessibility and UI |
| Affected module | 19 date formatters |
| Classification | genuine |

**Root cause:** en-IN ICU short month is 'Sept' in Chromium, Firefox and WebKit

**Reproduction:** any September date

**Fix:** .replace('Sept','Sep') as lib/superadmin/format.js already does

**Regression test:** src/lib/dateFormat.sept.test.js

**Evidence:** intl.cjs output

**Note:** verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work.

### XB-004

**Scrollable main / report table not keyboard reachable**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Cross-browser, accessibility and UI |
| Affected module | 4 portal layouts, ReportsWorkspace |
| Classification | genuine |

**Root cause:** scrollport with no focusable content (faculty subjects with one subject: only button disabled)

**Reproduction:** axe scrollable-region-focusable on /faculty/subjects

**Fix:** tabIndex=0 on main.content and .sp-table-wrap (role=region)

**Regression test:** e2e/journeys-a11y.spec.js

**Evidence:** full-chromium.log

**Note:** verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work.

### XB-005

**Unhandled 'Request aborted' after create on Firefox**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Cross-browser, accessibility and UI |
| Affected module | admin students/staff reloadAll, AcademicStructure refreshAll |
| Classification | genuine (Firefox-specific) |

**Root cause:** fire-and-forget Promise.all of reload() (which rethrows); Firefox rejects XHRs aborted by navigation

**Reproduction:** Firefox: create a student, navigate away at once

**Fix:** Promise.allSettled in the three refresh helpers

**Regression test:** e2e/journeys-college-admin.spec.js on firefox

**Evidence:** full-firefox.log

**Note:** verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work.

### XB-006

**Donut centre total bold (700) at 22/26px**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Cross-browser, accessibility and UI |
| Affected module | data-viz.css .mdc-ring-t b (compact + narrow) |
| Classification | genuine (design lock) |

**Root cause:** inherits 700 from the 30px rule

**Reproduction:** UI sweep weight check, 38 views

**Fix:** font-weight 500 below 28px

**Regression test:** UI sweep (uicheck.cjs weight check)

**Evidence:** ui-chromium.json

**Note:** verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work.

### XB-007

**Faculty status-pill dot 8px (6px elsewhere)**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Cross-browser, accessibility and UI |
| Affected module | portal-faculty.css |
| Classification | genuine (design rule) |

**Root cause:** faculty-only override

**Reproduction:** faculty pages status pills

**Fix:** 6px

**Regression test:** UI sweep dot check

**Evidence:** ui-chromium.json

**Note:** verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work.

### XB-008

**React #310 (hook count changed) once on /admin/structure -> departments in WebKit**

| Field | Value |
|---|---|
| Status | In Progress |
| Severity | Medium |
| Category | Cross-browser, accessibility and UI |
| Affected module | admin structure departments |
| Classification | genuine, intermittent, unreproduced |

**Root cause:** not found: rules-of-hooks lint clean across src; 0/32 reproductions in WebKit at 768/390

**Reproduction:** full-webkit run 1, sidebar sweep 768 and 390

**Fix:** n/a

**Regression test:** journeys-sidebar.spec.js

**Evidence:** out-full-webkit/journeys-sidebar-college-a-*/trace.zip

### XB-009

**Success toast covers the page's main action and blocks it while hovered**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Cross-browser, accessibility and UI |
| Affected module | app/Providers.jsx Toaster (all portals) |
| Classification | genuine |

**Root cause:** position top-right = where ModuleHead puts the one orange action and the Alerts bell; react-hot-toast pauses on hover, so pointing at the action keeps it covered; toast radius 12px off the 6/8/16 lock

**Reproduction:** Firefox: Admin > Staff > Add staff, create, then click Add staff again: <div> from [data-rht-toaster] intercepts pointer events for 60s

**Fix:** position top-center; borderRadius var(--radius-card). Position is a small UX change: owner may prefer another free spot

**Regression test:** e2e/journeys-college-admin.spec.js 'a staff member is invited, and the same email is refused the second time'

**Evidence:** out-v2-firefox trace (old-v2)

**Note:** verified on the browser runs made before the 4 Nov restore of the Phase 2 to 4 frontend work.

### PERF-001

**Report aggregate rebuilt each student's reachable-chapter set from every published chapter (7.75M ORM attribute reads per platform report); institution/department rows rescanned all students per college/department**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Performance and capacity |
| Affected module | Reports / SA dashboard / analytics (app/api/v1/reports.py _activity, _build_rows) |
| Classification | genuine |

**Root cause:** Per-student set comprehension over per-department job rows reading s.program_id per row; O(colleges x students) list filters

**Reproduction:** GET /api/v1/reports/preview?report_type=institution as Super Admin with 30k students: 8.85 s in-process

**Fix:** Scope set computed once per (college, department, programme) and reused; students grouped once by tenant/department

**Regression test:** tests/perf/test_perf_read_paths.py::test_completion_scope_is_built_per_programme_not_per_student (12,000 reads before, <=400 after), ::test_completion_numbers_are_unchanged, ::test_institution_and_department_rows_match_their_students

**Evidence:** docs/audit/evidence/perf/results/fix_measurements.json; results/pytest_perf_red_before_fix.log

### PERF-002

**Super Admin dashboard ran two queries per active college (university name, student count)**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance and capacity |
| Affected module | app/api/v1/dashboard.py |
| Classification | genuine |

**Root cause:** N+1 inside the institution_activity loop

**Reproduction:** Dashboard ran 24 statements + 2 per college

**Fix:** One grouped student count and one university-name lookup

**Regression test:** tests/perf/test_perf_read_paths.py::test_super_admin_dashboard_query_count_ignores_colleges (30 vs 24 before), ::test_dashboard_names_and_counts_are_unchanged

**Evidence:** docs/audit/evidence/perf/results/pytest_perf_red_before_fix.log

### PERF-003

**College analytics counted subject learners by scanning every student for every subject**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance and capacity |
| Affected module | app/services/college_insights.py |
| Classification | genuine |

**Root cause:** sum over students inside the subjects loop (240 subjects x 3,000 students per college)

**Reproduction:** GET /api/v1/analytics/college: 2.01 s in-process

**Fix:** Counter by (department, programme) plus unplaced students per department

**Regression test:** tests/perf/test_perf_read_paths.py::test_subject_learners_are_unchanged (equivalence; speed in fix_measurements: 2.01 -> 1.08 s with PERF-001)

**Evidence:** docs/audit/evidence/perf/results/fix_measurements.json

### PERF-004

**'Deleted jobs' subquery (four per report request) was a sequential scan of every job**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Performance and capacity |
| Affected module | Reports / analytics SQL |
| Classification | genuine |

**Root cause:** No index for edu_video_jobs WHERE deleted_at IS NOT NULL

**Reproduction:** EXPLAIN ANALYZE: Seq Scan 2.6 ms at 5,735 jobs

**Fix:** Migration alembic/versions/0055_perf_read_indexes.py: partial index ix_edu_video_jobs_deleted (0.018 ms)

**Regression test:** tests/perf/test_perf_read_paths.py::test_deleted_jobs_lookup_has_its_partial_index

**Evidence:** docs/audit/evidence/perf/results/explain_before.txt, results/explain_after.txt

### PERF-005

**Reports hydrated 30,000 full ORM User objects (password hash included) to read eight fields**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Performance and capacity |
| Affected module | app/api/v1/reports.py _students |
| Classification | genuine |

**Root cause:** select(User) where a column select suffices

**Reproduction:** Institution report 4.85 s after PERF-001

**Fix:** Column-only select returning rows (REPORT_STUDENT_FIELDS)

**Regression test:** tests/perf/test_perf_read_paths.py::test_report_students_are_plain_rows

**Evidence:** docs/audit/evidence/perf/results/fix_measurements.json (4.85 -> 3.37 s)

### PERF-006

**One API worker cannot serve realistic mixed load: p95 > 5 s from about 11 concurrent users; 50+ users exhaust the DB pool (HTTP 500)**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | High |
| Category | Performance and capacity |
| Affected module | Platform capacity / reports, analytics, dashboard |
| Classification | genuine |

**Root cause:** Platform-wide and college-wide aggregates are recomputed on every request (3-4 s CPU for all colleges, about 1 s per college, 0.3-0.7 s per department) inside async handlers, blocking the event loop; pool waits time out after 30 s

**Reproduction:** docs/audit/evidence/perf/run_step.sh w1_u50 50 2m 8300

**Fix:** Not changed, needs an owner decision. Options: (a) run at least 4 workers per host (measured at 50 users: 4.0 -> 17.6 rps, p95 29 -> 6 s) with pool sizes within Postgres max_connections=100; (b) cache SA dashboard / report aggregates for about 60 s or read them from the nightly college_daily_usage table; (c) move the aggregate CPU work off the event loop (run_in_threadpool)

**Regression test:** n/a

**Evidence:** docs/audit/evidence/perf/results/summary.json, results/stress_w1_breakpoint.json

### PERF-007

**Default pools allow 40 connections per process; 4 workers could open 160 against max_connections=100**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Medium |
| Category | Performance and capacity |
| Affected module | app/config.py DB_POOL_SIZE / DB_MAX_OVERFLOW (deployment) |
| Classification | genuine |

**Root cause:** Pool size is per process; the config comment assumes at most two processes

**Reproduction:** 4 workers x (8+12) x 2 pools

**Fix:** Deployment must size DB_POOL_SIZE/DB_MAX_OVERFLOW by worker count (measured: 4 workers at 3+2 each peaked at 33 connections, 0 errors at 50 users) or add PgBouncer

**Regression test:** n/a

**Evidence:** docs/audit/evidence/perf/results/steps_w4.txt

### PERF-008

**Unbounded responses and Python-side paging: /analytics/college returns every student (1.9 MB for 3,000); /reports/preview builds all rows then slices; CSV/PDF export of the platform student report is unbounded (30,000 rows, 1.7 MB CSV)**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Medium |
| Category | Performance and capacity |
| Affected module | college_insights.college_overview, reports.preview_report/download_report |
| Classification | genuine |

**Root cause:** Rows are ranked by computed metrics, so paging happens after the aggregate

**Reproduction:** Sizes in results/baseline_after.json

**Fix:** Not changed (it would change the API contract the frontend uses); recommend paging the students array and capping PDF export rows

**Regression test:** n/a

**Evidence:** docs/audit/evidence/perf/results/baseline_after.json

### PRIV-002

**deliver_email logs the recipient address in plain text**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Privacy |
| Affected module | app/services/notification_service.py |
| Classification | genuine |

**Root cause:** to=<address> in the INFO/WARNING lines for send, skip, failure and WhatsApp

**Reproduction:** tests/integration/test_privacy_redaction.py::test_the_application_log_of_an_email_send_does_not_carry_the_address (failed before)

**Fix:** INT added mask_address(): first character + ***@domain (phone: last 2 digits) in every log line; notification_deliveries.recipient keeps the full address.

**Regression test:** tests/integration/test_privacy_redaction.py (fails before, passes after: 57/57 with notification and SMTP files)

**Evidence:** docs/audit/evidence/integration/notif_priv_email.junit.xml

### PRIV-003

**DEBUG logs full e-mail bodies with live reset/activation links in any environment**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Privacy |
| Affected module | app/services/notification_service.py |
| Classification | genuine |

**Root cause:** if settings.DEBUG: logger.info(body) with no environment or event guard

**Reproduction:** tests/integration/test_privacy_redaction.py::test_debug_mode_on_a_production_server_does_not_log_one_time_links (failed before)

**Fix:** INT added debug_body_allowed(event) = DEBUG and ENVIRONMENT != production and event not in ONE_TIME_EVENTS, for e-mail and WhatsApp.

**Regression test:** tests/integration/test_privacy_redaction.py

**Evidence:** docs/audit/evidence/integration/notif_priv_email.junit.xml

### INT-001

**Catalogue lists 'Verification code' (mandatory, Always on) but nothing ever sends it**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Low |
| Category | Integration and deployment |
| Affected module | app/services/notification_catalog.py / notification_events.verification_code |
| Classification | genuine |

**Root cause:** No route or service calls notification_events.verification_code (no OTP / 2FA flow exists)

**Reproduction:** grep -rn 'verification_code(' app -> only its definition; the template renders and sends when called directly (test_int_email_smtp)

**Fix:** Decide: build the OTP flow or drop the event from the Rules tab

**Regression test:** tests/integration/test_int_email_smtp.py::test_verification_code_has_no_caller_but_renders_and_sends

**Evidence:** docs/audit/evidence/integration/email_smtp.junit.xml

### INT-002

**49 frontend API client calls target endpoints that do not exist (dead modules incl. payments/plans/subscriptions, OTP, profile)**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Integration and deployment |
| Affected module | src/lib/api/{admin/analytics,admin/reports,admin/students,dashboard,faculty/content,faculty/students,jobs,payments,plans,user}.js, auth.js sendOtp/verifyOtp, superadmin/modules.js reportsApi.generate |
| Classification | genuine |

**Root cause:** B2C leftovers never removed; no live import (OTPModal is itself unused; userApi only uses getMe)

**Reproduction:** node api_contract_check.mjs src openapi_8400.json out.json (tree without stash@{0})

**Fix:** blocked_on XB (owns src/**): delete the unused modules/functions; payments/plans also contradict the no-plan lock

**Regression test:** docs/audit/evidence/integration/api_contract_check.mjs

**Evidence:** docs/audit/evidence/integration/api_contract.json

**Resolution note (4 Nov 2026):** Re-check after the 4 Nov restore: the dead modules were identified on the tree without the stash.

### INT-003

**backup_offsite.sh could only reach AWS S3, so the off-host copy could not be rehearsed or restored from an S3-compatible store**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Low |
| Category | Integration and deployment |
| Affected module | scripts/backup_offsite.sh |
| Classification | genuine |

**Root cause:** docker run passed only AWS_REGION; no endpoint, network or static-credential passthrough

**Reproduction:** tests/integration/test_int_backup_scripts.py::test_offsite_copy_reaches_an_s3_compatible_endpoint_encrypted failed: 'Unable to locate credentials'

**Fix:** Optional BACKUP_S3_ENDPOINT_URL, BACKUP_DOCKER_NETWORK and AWS_ACCESS_KEY_ID/SECRET/SESSION_TOKEN passthrough (unset in production = identical AWS command)

**Regression test:** tests/integration/test_int_backup_scripts.py::test_offsite_copy_reaches_an_s3_compatible_endpoint_encrypted

**Evidence:** docs/audit/evidence/integration/monitoring_backup.junit.xml

### INT-004

**.env.example omits 66 settings, including every EMAIL_*, SMTP_* and SES_* variable**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Low |
| Category | Integration and deployment |
| Affected module | .env.example |
| Classification | genuine |

**Root cause:** Settings added without updating the example

**Reproduction:** docs/audit/evidence/integration/env_settings.md 'Gaps'

**Fix:** blocked_on backend config owner: add the names (no values) listed under not_in_env_example

**Regression test:** docs/audit/evidence/integration/env_settings_gen.py

**Evidence:** docs/audit/evidence/integration/env_settings.md

### INT-007

**Frontend local docker build took .env.local, .next-* builds and docs into the build context; final stage ran as root**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Integration and deployment |
| Affected module | E:/b2b_superAdmin_frontend/.dockerignore, Dockerfile |
| Classification | genuine |

**Root cause:** .dockerignore listed only .git node_modules .next out *.md .DS_Store; no USER (INFRA-012/035 claimed but not in this tree)

**Reproduction:** npx vitest run docker-image.int.test.mjs (10 failed before)

**Fix:** .dockerignore adds .env, .env.*, !.env.example, .next-*, docs, coverage, test-results, playwright-report, .playwright-mcp, .tmp-*, e2e/.auth, *.log; runner COPY --chown=node:node .next + USER node; npm ci longer fetch timeout/retries. Built image: context 28.4 MB, user node

**Regression test:** E:/b2b_superAdmin_frontend/docker-image.int.test.mjs

**Evidence:** built from the tree without stash@{0}; docs/audit/evidence/integration/INT_SUMMARY.md section 4

### INT-008

**requirements.lock.txt is unresolvable: backend Docker image (every deploy) fails at pip install**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Integration and deployment |
| Affected module | requirements.lock.txt |
| Classification | genuine |

**Root cause:** aiohttp bumped 3.14.3 -> 3.14.4 in the working tree; it needs yarl>=1.25.1 but yarl stays pinned at 1.24.5

**Reproduction:** docker build . -> ResolutionImpossible; tests/integration/test_int_lockfile.py fails

**Fix:** blocked_on lock owner: change line 'yarl==1.24.5' to 'yarl==1.25.1' (the version in b2b_env); rehearsal built with that one change applied in a temporary Dockerfile copy only

**Regression test:** tests/integration/test_int_lockfile.py::test_every_locked_pin_satisfies_the_locked_packages_that_need_it

**Evidence:** docs/audit/evidence/integration/INT_SUMMARY.md section 4

**Resolution note (4 Nov 2026):** requirements.lock.txt now pins yarl 1.25.1 (coordinator-reported). A backend image rebuild from the committed lock was not re-run.

### INT-009

**Backend image carries .ruff_cache, .github, .coveragerc and requirements-dev.txt**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Informational |
| Category | Integration and deployment |
| Affected module | .dockerignore (backend) |
| Classification | genuine |

**Root cause:** Entries missing from .dockerignore

**Reproduction:** docker run image ls -a /app

**Fix:** Added the five entries (takes effect on the next image build)

**Regression test:** tests/integration/test_int_image_hygiene.py

**Evidence:** docs/audit/evidence/integration/INT_SUMMARY.md

### INT-010

**API crash-loops at import when OPENAI_API_KEY is empty, although the setting defaults to empty**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Medium |
| Category | Integration and deployment |
| Affected module | app/voice_qna/services/embedding_service.py:17 |
| Classification | genuine |

**Root cause:** OpenAI() client built at module import raises OpenAIError without a key; no startup validator names the missing setting

**Reproduction:** deploy rehearsal run 1: xplains-backend Restarting, traceback in docker logs (deploy_rehearsal_run1_failed.log)

**Fix:** blocked_on backend owner: create the client lazily, or add a Settings validator requiring OPENAI_API_KEY outside local with a clear message; documented as effectively required in env_settings.md

**Regression test:** none (not an INT file)

**Evidence:** docs/audit/evidence/integration/deploy_rehearsal_run1_failed.log

### INT-011

**First deploy stops at 'Back up database': backup.sh exits 1 on an empty, never-migrated database**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Integration and deployment |
| Affected module | scripts/backup.sh |
| Classification | genuine |

**Root cause:** The dump was required to contain 'TABLE DATA'; deploy.yml starts a fresh postgres and runs backup.sh before any migration

**Reproduction:** tests/integration/test_int_backup_scripts.py::test_pre_deploy_backup_of_a_never_migrated_database_does_not_stop_the_first_deploy (failed before); rehearsal run 1 'backup failed'

**Fix:** Dump must still be readable (pg_restore --list); TABLE DATA required only when alembic_version exists; .part removed on any failure

**Regression test:** tests/integration/test_int_backup_scripts.py::test_pre_deploy_backup_of_a_never_migrated_database_does_not_stop_the_first_deploy

**Evidence:** docs/audit/evidence/integration/deploy_rehearsal.log

### INT-012

**Local LiveKit container crash-loops since the WSL restart; MinIO images unavailable**

| Field | Value |
|---|---|
| Status | Blocked |
| Severity | Informational |
| Category | Integration and deployment |
| Affected module | local environment |
| Classification | environment |

**Root cause:** b2b_projectk-livekit-1: 'one of key-file or keys must be provided' (keys came from compose .env); minio/minio pull access denied

**Reproduction:** docker logs b2b_projectk-livekit-1; docker pull minio/minio

**Fix:** none by INT (not owned); S3 tested on moto instead; LiveKit server-side checks skipped

**Regression test:** tests/integration/test_int_livekit_tokens.py (2 skipped)

**Evidence:** docs/audit/evidence/integration/livekit_tokens.junit.xml

### PRIV-001

**Ops error log redacted only e-mail and phone: JWTs, Bearer credentials, ?token= links, echoed passwords and the request path were stored in clear**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | High |
| Category | Privacy |
| Affected module | app/services/ops_monitor.py (redact, record_error) |
| Classification | genuine |

**Root cause:** redact() had only _EMAIL and _PHONE patterns; record_error stored `path` unredacted

**Reproduction:** ops_monitor.record_error('API', 'Invalid token eyJ...') -> platform_error_events.message keeps the JWT (Super Admin health page)

**Fix:** Added _JWT, _BEARER and _SECRET_PAIR (token|access_token|refresh_token|password|passwd|secret|api_key|otp = or :) patterns, applied before the email/phone ones; path passed through redact(). CRLF preserved. Patterns start on fixed literals (linear); the 200 KB stall tests still pass

**Regression test:** tests/integration/test_privacy_redaction.py::test_a_jwt_is_redacted, ::test_a_bearer_token_is_redacted, ::test_a_reset_link_token_is_redacted, ::test_a_password_echoed_in_a_validation_error_is_redacted, ::test_the_request_path_is_redacted, ::test_an_error_log_record_is_redacted_on_its_way_to_the_ops_log, ::test_the_stored_ops_row_holds_no_email_phone_or_token

**Evidence:** docs/audit/evidence/privacy/pytest_privacy_final.log

### PRIV-004

**DPDP duties with no implementation: consent notice and record, withdrawal, erasure, breach notification, children's age and guardian consent, grievance contact**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | High |
| Category | Privacy |
| Affected module | product-wide |
| Classification | genuine (gap) |

**Root cause:** Not built; see the gap list

**Reproduction:** n/a

**Fix:** Owner and legal decision first; then the technical items in DPDP_GAP_LIST.md rows 1, 2, 6, 9, 10, 13

**Regression test:** n/a

**Evidence:** docs/audit/evidence/privacy/DPDP_GAP_LIST.md

### PRIV-005

**No retention limit for audit_logs, notification_deliveries, qna_turns, watch progress, quiz attempts, deactivated accounts, interview-era tables and S3 recordings; report downloads not audit-logged**

| Field | Value |
|---|---|
| Status | Needs Business Decision |
| Severity | Medium |
| Category | Privacy |
| Affected module | app/services/ops_monitor.py _prune, app/api/v1/reports.py (PERF-owned) |
| Classification | genuine (gap) |

**Root cause:** Retention defined only for ops data, tokens, notifications and deleted-job files

**Reproduction:** n/a

**Fix:** Owner to set periods; then add deletes to _prune and record_audit(...'Exported <type> report') in reports.download_report (PERF owns reports.py)

**Regression test:** n/a

**Evidence:** docs/audit/evidence/privacy/DPDP_GAP_LIST.md

### QA-FLAKE-002

**test_logout_revokes_the_bearer_on_sync_routes_and_the_tutor failed once in the full backend run (asyncpg event-loop error in the test client)**

| Field | Value |
|---|---|
| Status | In Progress |
| Severity | Low |
| Category | Test reliability |
| Affected module | tests/integration/test_owner_decisions_decb.py |
| Classification | test defect (intermittent, unconfirmed) |

**Root cause:** Intermittent asyncpg "attached to a different loop" error in the shared test client when the test runs after other async tests in the same process. The product code path is not implicated: the test passes 3/3 when run alone.

**Reproduction:** Full backend run (also seen in the PERF affected-folders run); not reproducible alone

**Fix:** None yet. Candidate: give the test its own event-loop scope or client fixture.

**Regression test:** tests/integration/test_owner_decisions_decb.py::test_logout_revokes_the_bearer_on_sync_routes_and_the_tutor

**Evidence:** Coordinator final run 4 Nov 2026 (2 failures, one is this test); PERF.json not_done note


### Addendum: post-restore browser re-runs (4 to 5 Nov 2026)

The Playwright matrix was re-run on the restored frontend tree: 1,274 passed, 173 failed, 65 skipped before the XB-010 to XB-012 fixes; then rerun A (after XB-010, XB-011) and rerun B (after XB-012). See docs/audit/client/25-cross-browser.md. Five entries below; the client-package total is now 43: Fixed 28, In Progress 3, Open 1, Blocked 4, Needs Business Decision 7. Fixes were applied by the coordinator (unit 380/380, lint clean). Nothing is marked passed for WebKit or the tablets.

### XB-010

**Programmes list accessibility failure and failing option click after the stash restore (axe serious list on .sa-acad-list)**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Cross-browser, accessibility and UI |
| Affected module | AcademicStructureWorkspace (/admin/structure/programmes) |
| Classification | genuine |

**Root cause:** The stash restore left li role=none inside a plain list, which caused the axe serious list violation and made the e2e option click fail.

**Reproduction:** e2e/journeys-a11y.spec.js programmes page fails at three viewports in chromium, msedge, webkit and firefox.

**Fix:** Valid ul/li of aria-pressed buttons in AcademicStructureWorkspace.jsx; the e2e test clicks the button inside the list named Programmes.

**Regression test:** e2e/journeys-a11y.spec.js (existing)

**Evidence:** docs/audit/evidence/browser/final/*.json (before); final/rerun2/ (after: no a11y failure listed)

### XB-011

**Firefox console error on every page (zod v4 JIT probe blocked by the production CSP)**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Cross-browser, accessibility and UI |
| Affected module | src/lib/validation/fields.js; production CSP (no unsafe-eval) |
| Classification | genuine |

**Root cause:** zod v4 probes Function("") for its JIT, which the CSP blocks; Firefox reports it as a console error, so 149 sidebar-journey tests failed.

**Reproduction:** npx playwright test --project=firefox on the restored tree (149 failed).

**Fix:** z.config({ jitless: true }) in src/lib/validation/fields.js.

**Regression test:** e2e/journeys-sidebar.spec.js (existing); firefox full suite 352 passed, 0 failed in rerun A

**Evidence:** docs/audit/evidence/browser/final/firefox.json (before); final/rerun2/firefox.json (after)

### XB-012

**WebKit React error 310 on /admin/structure caused by a page-level redirect() during client navigation**

| Field | Value |
|---|---|
| Status | Fixed |
| Severity | Medium |
| Category | Cross-browser, accessibility and UI |
| Affected module | /admin/structure (Next.js App Router), next.config.js |
| Classification | genuine |

**Root cause:** A page-level redirect() during client navigation inside the App Router; probably the same cause as XB-008, which is not closed.

**Reproduction:** e2e/journeys-sidebar.spec.js /admin/structure loads cleanly on webkit (3 failures in rerun A).

**Fix:** Redirect moved into next.config.js redirects().

**Regression test:** e2e/journeys-sidebar.spec.js (existing)

**Evidence:** docs/audit/evidence/browser/final/rerun2/summary.txt (before); final/rerun/webkit.json (after: no React 310 in the failure list)

### XB-013

**Tablet: back and forward walk the sidebar times out on chromium-tablet and webkit-tablet**

| Field | Value |
|---|---|
| Status | In Progress |
| Severity | Medium |
| Category | Cross-browser, accessibility and UI |
| Affected module | e2e/journeys-resilience.spec.js (768x1024) |
| Classification | not yet determined |

**Root cause:** Not found. Repeats on both tablet projects in reruns A and B.

**Reproduction:** npx playwright test --project=chromium-tablet journeys-resilience.spec.js

**Fix:** None yet.

**Regression test:** e2e/journeys-resilience.spec.js (existing)

**Evidence:** docs/audit/evidence/browser/final/rerun2/summary.txt; final/rerun/chromium-tablet.json, webkit-tablet.json

### QA-FLAKE-003

**WebKit 60 s timeouts that move between tests run to run, plus aborted _rsc prefetch pageerrors**

| Field | Value |
|---|---|
| Status | Open |
| Severity | Low |
| Category | Cross-browser, accessibility and UI |
| Affected module | e2e (webkit, webkit-tablet), expectHealthyPage |
| Classification | test environment (not a product defect) |

**Root cause:** WebKit is slower on this host and reports aborted RSC prefetch fetches (Fetch API cannot load ... access control checks) as pageerrors on different pages each run. The webkit-tablet seat-cap timeout occurred twice (reruns A and B); it stays here unless it repeats a third time.

**Reproduction:** Rerun A webkit 5 failed; rerun B webkit 4 failed, different tests.

**Fix:** Proposed: raise the WebKit timeout and filter aborted _rsc prefetch errors in expectHealthyPage. Not applied.

**Regression test:** e2e/journeys-helpers.js expectHealthyPage (existing)

**Evidence:** docs/audit/evidence/browser/final/rerun/webkit.json; final/rerun2/webkit.json
