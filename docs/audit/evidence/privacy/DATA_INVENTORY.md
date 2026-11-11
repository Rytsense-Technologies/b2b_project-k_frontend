# Personal-data inventory (technical half, DPDP Act 2023)

Date 4 Nov 2026. Backend `E:\b2b\b2b_projectk` at `ed34cc58` plus uncommitted changes; frontend `590536a`. The source is the code: SQLAlchemy models, routes and services. Legal interpretation is left to the owner.

Data principals: **students** (most are 17 to 22, and some may be minors), faculty, HODs, college admins and Super Admins. The platform stores **no date of birth or age**, so it cannot tell whether a student is a minor (DPDP s.9).

Roles: SA = Super Admin; CA = College Admin (own college); HOD = own department; FAC = Faculty (assigned subjects); STU = the student, for their own data.

## 1. Tables and columns holding personal data

| Table | Personal columns | Purpose | Who can read | Where it flows / retention |
|---|---|---|---|---|
| `users` | name, first_name, last_name, **email**, **phone_number**, avatar_url, role, tenant/department/program/semester ids, year_of_study, last_login_at, is_active, failed_login_count | Account, sign-in, academic placement | SA all; CA own college; HOD own department; FAC their students (directory, analytics); STU self (`GET/PATCH /auth/me`) | Reports and exports (name, college and department; the row id and email are in the preview JSON but not in the CSV, XLSX or PDF columns), e-mail sends, audit `action` text (for example "Deactivated user x@…"). Kept indefinitely: no delete route (soft deactivate only) |
| `users.hashed_password` | bcrypt hash | Sign-in | Never served | Test-proven to be a hash |
| `user_profiles` | photo URL, experience, skills, college_or_company, country, state, city, pincode, **gender** | B2C carry-over (interview profile) | Interview routes, which are off (INTERVIEWS_ENABLED=False) | S3 photo. Kept indefinitely |
| `user_resumes` | resume file key, filename, **LLM-extracted context** | Interview module (off) | Off | S3 `resumes/{user_id}/…`. Historically parsed by an LLM. Kept indefinitely |
| `refresh_tokens` | user_id, token_hash (SHA-256) | Session | Never served | Pruned 1 day after expiry (ops_monitor `_prune`) |
| `auth_tokens` | user_id, token_hash (SHA-256) for reset, activation and OTP | One-time links | Never served | Pruned 1 day after expiry |
| `revoked_access_tokens` | jti, user_id, expiry | Logout denylist | Never served | Until expiry |
| `login_throttles` | email_hash (SHA-256 of the lower-cased email), source | Brute-force lockout | Never served | Pruned after 1 day |
| `audit_logs` | actor_id, **actor_email**, actor_role, **ip**, action (free text, often holds the target's email), meta | Accountability | SA only (`/audit-logs`, `/audit-logs/export`) | CSV export (SA). **No retention limit** |
| `platform_error_events` | message and detail (redacted), path, tenant_id | Ops health | SA only | Pruned after 30 days. E-mail, phone, JWT, Bearer and `token=`/`password=` are redacted (PRIV-001 fix) |
| `notification_deliveries` | **recipient** (email or phone), subject, body (kept only for failed sends, never for one-time links), user_id, tenant_id | Delivery log and retries | SA (Notifications delivery log) | Body of one-time events nulled. **Rows otherwise kept indefinitely** |
| `user_notifications` | user_id, title, body, link | In-app alerts | STU/owner only | Read rows pruned after 90 days |
| `notification_preferences` | user_id, event, enabled | Opt-outs | Self, admins | Indefinite |
| `video_watch_progress` | user_id, job_id, percent, position, completed_at, tracking times | Learning progress and completion | SA, CA, HOD, FAC (analytics, reports); STU self | Reports and exports. Indefinite |
| `mcq_attempts` | user_id, answers (JSONB), score, submitted_at | Assessment | SA, CA, HOD, FAC (scoped); STU self | Reports, leaderboard, PDF report. Indefinite |
| `mcq_attempt_resets` | user_id, reset_by_user_id, reason, previous score | Audit of resets | Staff | Indefinite |
| `qna_sessions` | user_id, lesson_id, title, language, times | Tutor conversations | STU own only (other users get 404, test-proven) | Student can delete (`DELETE /voice_qna/conversations/{id}`) |
| `qna_turns` | **question text** (free text the student typed or said, **including any crisis message**), answer, language | Tutor memory and history | STU own only. Staff see only counts (QA report) | Sent to OpenAI as conversation history. Deleted with the conversation. Otherwise indefinite |
| `college_daily_usage` | tenant_id, day, kind, count, with **no person** | Caps and the anonymous crisis count | SA (`/health`) | Indefinite (aggregate) |
| `edu_video_jobs` | created_by_user_id, sent_to_hod_by, published_by, changes_requested_by, change_note, source_filename | Content workflow (faculty) | Staff in scope | Files purged 30 days after delete. Row kept for audit |
| `edu_video_review_events` | actor_user_id, note | Review trail | Staff | Indefinite |
| `subject_staff` | user_id ↔ subject | Teaching assignment | Staff | Indefinite |
| `livekit_sessions` / `livekit_turns` / `livekit_reports` / `livekit_turn_scores` / `user_skill_profiles` / `interview_question_playback` | Interview transcripts (raw speech-to-text), scores, recordings, audio summaries | Interview module, **switched off** | Off | Old rows (if any) and recordings in S3 still exist. Indefinite |
| `interview_assignments` | created_by, notes | Off | Off | — |

Non-personal: tenants, universities, departments, programs, semesters, subjects, chapters, lessons and lesson_chunks (faculty documents), mcq_documents and questions, role_master, notification_rules, health checks.

## 2. Flows outside the database

| Flow | What goes | Recipient / location | Evidence |
|---|---|---|---|
| Application log (stdout, docker or journal) | **Recipient e-mail addresses in clear** on every send, skip and failure (`notification_service.deliver_email`). With `DEBUG=True` the **whole body, including reset and activation links**. Lesson and session ids. No crisis text | Server log, then whatever ships it | PRIV-002, PRIV-003 (failing tests) |
| Ops error log | Redacted message, detail and path | DB, SA page | `test_privacy_redaction.py` (passes after the fix) |
| E-mail | Name, address, one-time links, alert text | AWS SES (`ap-south-1` by default) or SMTP | `app/services/notification_service.py` |
| LLM, text tutor | System prompt, chapter title, the student's question and up to HISTORY_TURNS earlier turns. **No name, email, phone, account id or college** | OpenAI (`gpt-4o-mini`), **outside India** | `test_privacy_llm_prompts.py` |
| Voice tutor | Student **voice audio**, then STT text, then LLM, then TTS | LiveKit (self-hosted, `LIVEKIT_URL`), Sarvam STT/TTS (India), OpenAI LLM (US). The LiveKit identity is the account UUID; agent metadata is session_id and lesson_id only | `test_privacy_llm_prompts.py` |
| Video and MCQ generation | Faculty document text only (no user fields read) | OpenAI, Gemini (US), Sarvam TTS | Static scan in `test_privacy_llm_prompts.py` |
| Object storage | Videos, captions, documents, slide images, avatars and photos, resumes and recordings (interviews, legacy) | S3 (`AWS_REGION` ap-south-1) or local `media/` | `app/edu_video/storage.py`, `asset_storage.py` |
| Backups | Full `pg_dump` (all of the above). Newest 7 kept on the host (`chmod 700`). Off-site copies AES-256 encrypted to S3 | Host disk, S3 `BACKUP_S3_BUCKET` | `scripts/backup.sh`, `backup_offsite.sh`. Off-site retention is set by the bucket lifecycle (not in the repo). Erased or deactivated data lives on in backups |
| Exports | Student, QA, department and institution reports (name, college, department, metrics; no email column) as CSV, XLSX or PDF. The preview JSON also carries id and email. Audit CSV (SA) | Browser download | `test_privacy_exports.py`. Report downloads are **not audit-logged** (the audit export is) |
| Analytics | None found: no GA, Clarity, Sentry or PostHog in `src/` or the backend | — | grep of `src/`, `app/` |
