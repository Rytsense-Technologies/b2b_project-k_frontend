# Notification rules, authorization and Quirri e-mail templates (owner, 20 Oct 2026)

Owner: "For all logins (Super Admin, College Admin, HOD, Faculty, Student) — notification module: trigger on/off, grouped by scenario (when each notification goes), switches not plain on/off buttons, and enabling/disabling must really work. Each login is limited by authorization. Test every notification completely. Use the owner's QA inbox for testing (address only in the backend .env, never in code) — later Amazon SES will be used. Use the quirri-email-template-ui skill; sample = the Premium-plan Gmail screenshot."

## Facts (already true)
- Backend `E:\b2b\b2b_projectk`: catalogue `EVENTS` in `app/services/notification_service.py`; send path `deliver_email_sync` / `send_email` / `notify_in_background` / `send_activation_invite`; deliveries table `notification_deliveries` (statuses sent | failed | log_only); event hooks in `app/services/notification_events.py`; providers: `EMAIL_PROVIDER=ses` (boto3) or anything else = log only. API in `app/api/v1/notifications.py` (`/notifications/events`, `/deliveries`, `/deliveries/retry-failed`, `/mine`).
- Interview events stay disabled (`INTERVIEWS_ENABLED=False`) — never surface them.
- Logo PNG for e-mail: `E:\b2b_superAdmin_frontend\public\quirri-logo-email.png` (copy into the backend as a static asset for CID inlining).
- **Test recipient**: backend `.env` (git-ignored) now has `EMAIL_TEST_RECIPIENT=…`. Code reads `settings.EMAIL_TEST_RECIPIENT` (default ""). The address must never appear in code, tests, docs or commits.
- Skill: `C:\Users\Arun K\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\6bf8aeae-d3c8-4fda-ab08-f94c59cef0af\886af1c8-b366-4679-9fb9-e22a0108a29b\skills\quirri-email-template-ui\` (SKILL.md + references/tokens.md, layout.md, copy.md). Tagline: the skill's line is "AI Interviews That Get You **Shortlisted**", but this B2B product has no interviews — use a setting `EMAIL_TAGLINE_HTML` with default `Learning That Gets You <span style="color:#ea7a2f;font-weight:700">Shortlisted</span>` (same look, B2B-safe).

## Scenario catalogue (single source of truth — `app/services/notification_catalog.py`)
Each event: `id, group, name, trigger ("Sends when …"), recipients, channels ["email"], mandatory, scopes` where `scopes` ⊆ {platform, tenant, department, personal} says who may switch it.

| Group | id | Trigger (when it goes) | Recipients | Mandatory | Switchable by |
|---|---|---|---|---|---|
| Account & security | account_activation | A new account is created or an invite is resent | the new user | yes | — |
| Account & security | password_reset | Someone asks to reset their password | that user | yes | — |
| Account & security | verification_code | A sign-in or sensitive change needs a one-time code | that user | yes | — |
| Account & security | password_changed | A password is changed or reset | that user | no | platform |
| Account & security | account_status_changed | An account is deactivated or reactivated | that user | no | platform, tenant |
| People & roles | hod_assigned | A staff member is made HOD of a department | the new HOD | no | platform, tenant |
| People & roles | subjects_assigned | Subjects are assigned to a faculty member | that faculty member | no | platform, tenant, department, personal |
| People & roles | student_placement_changed | A student's department / programme / year changes (incl. promote) | that student | no | platform, tenant, personal |
| Content pipeline | pipeline_completed | A chapter video finishes or fails generating | the uploader | no | platform, tenant, personal |
| Content pipeline | content_ready_for_review | A chapter is sent to the HOD for review | HOD (+ subject faculty) | no | platform, tenant, department, personal |
| Content pipeline | changes_requested | The HOD asks for changes on a chapter | the uploader / College Admins | no | platform, tenant, personal |
| Content pipeline | content_published | A chapter is published for students | students of that department/subject | no | platform, tenant, department, personal |
| Assessments | mcq_ready_for_review | Chapter assessment questions are generated and need approval | HOD (+ subject faculty) | no | platform, tenant, department, personal |
| Assessments | assessment_available | An approved assessment opens for a published chapter | students of that department/subject | no | platform, tenant, department, personal |
| Assessments | assessment_result | A student submits a chapter assessment | that student | no | platform, tenant, personal |

Agents may add a scenario only if there is a clear existing hook in the code; keep the table updated.

## Rules (who may switch what) — enforced in the backend, mirrored in the UI
- **Super Admin**: platform scope for every non-mandatory event (a platform OFF locks it everywhere); can also view/switch any college's tenant scope (college picker).
- **College Admin**: tenant scope for their own college, only events whose `scopes` include `tenant`; cannot turn on an event that is OFF at platform (shown locked: "Turned off by Quirri").
- **HOD**: department scope for their own department, only events with `department`; locked if off at platform or tenant.
- **Faculty / Student**: personal scope only — events they can receive and whose `scopes` include `personal`; locked if off above.
- **Mandatory** events show as "Always on — needed for sign-in and security", never switchable at any scope.
- Effective = mandatory OR (platform ≠ off AND tenant ≠ off AND department ≠ off AND personal ≠ off); missing rows = default ON.
- Every change is audited (who, when, old → new) in the rules table (`updated_by`, `updated_at`) and, if an audit log exists, there too.

## Contract
### DB (alembic, additive only — new tables, no changes to existing ones)
- `notification_rules(id uuid pk, event varchar(64), scope_type varchar(16) [platform|tenant|department], scope_id uuid null (null for platform), enabled bool, updated_by uuid null fk users, updated_at timestamptz)`, unique (event, scope_type, scope_id).
- `notification_preferences(id uuid pk, user_id uuid fk users, event varchar(64), enabled bool, updated_at timestamptz)`, unique (user_id, event).
- `notification_deliveries.status` gains the value `skipped` (column is a string — no schema change); `error` holds the reason, e.g. "Turned off for VISTAS by College Admin".

### API (all under `/api/v1/notifications`)
- `GET /rules?scope=platform|tenant|department|personal&scope_id=<uuid?>` → `{ scope, scope_id, scope_label, can_edit, groups: [{ id, name, events: [{ id, name, trigger, recipients, channels, mandatory, enabled, effective, editable, locked_reason }] }] }`. Default scope per role: SA→platform, CA→tenant(own), HOD→department(own), Faculty/Student→personal.
- `PUT /rules/{event_id}` body `{ scope, scope_id?, enabled }` → updated event row; 403 when not allowed, 409 when locked above, 422 for mandatory/unknown.
- `POST /rules/{event_id}/test` (SA, CA, HOD only) → sends that event's template with sample data to the requester (or the test recipient override) and returns the delivery row. Used by the "Send test" link.
- Existing `/events`, `/deliveries`, `/mine` keep working; deliveries show `skipped` rows with the reason.

### Send path
- `notification_service.should_send(db, event, *, user=None, tenant_id=None, department_id=None) -> (bool, reason)`; every `deliver_email_sync` / `send_email` / `notify_in_background` call passes `event` and the recipient's user/tenant/department so the check runs once in one place; skipped sends are recorded with status `skipped`.
- `EMAIL_TEST_RECIPIENT` set ⇒ the real recipient is replaced by the test address and the subject is prefixed `[QA → original@domain]`; the delivery row stores the original recipient plus a `test_redirect` note.
- Providers: `ses` (existing, switch to raw MIME so the logo is an inline CID part), new `smtp` (`SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_STARTTLS`) for local / interim use, `log` (default). One MIME builder (multipart/alternative text+html inside multipart/related with the CID logo) shared by ses and smtp.

### Templates — `app/services/email_templates.py`
- `render(event_id, ctx) -> (subject, fragment_html, text)`; `wrap(fragment_html, *, preheader=None) -> html` (skill layout, CID `cid:quirri-logo`); `LOGO_PATH`. A paragraph containing only a link becomes the teal button. Greeting `Dear {first name},`. India date formats. One CTA linking into the right portal page (`settings.FRONTEND_URL` / existing `_url`).

### Frontend
- **SA** `/superadmin/notifications`: new first tab "Rules" (platform scope + a college picker to view/switch that college's tenant rules); keep the existing delivery log / events tabs.
- **CA** `/admin/notifications`: "Rules" tab (own college) + existing log.
- **HOD** `/faculty/notifications`: "Rules" tab (own department) + their inbox. **Faculty**: "My notifications" (personal) on the same page.
- **Student**: Settings → new "Notifications" tab (personal).
- UI: groups as white cards (group title + one-line description), each event a row: name, "Sends when …" trigger text, recipients · channel, a proper switch (`role="switch"`, `aria-checked`, keyboard, 44px target, teal when on), status text for mandatory ("Always on") or locked ("Turned off by Quirri / your college"), optimistic update with rollback + toast, "Send test" text link for SA/CA/HOD. Follow `docs/agent/redesign/qa-clean-pass-plan.md` spacing tokens and the B2C skill rules.

## Agents and ownership
| Agent | Owns |
|---|---|
| N1 Backend core | `notification_catalog.py` (new), `notification_service.py`, `app/api/v1/notifications.py`, new models + alembic migration, `app/config.py` (email/SMTP/test settings), backend tests for rules/authorization |
| N2 E-mail templates + hooks | `app/services/email_templates.py` (new), backend static logo asset, `app/services/notification_events.py`, the call sites that emit events (auth, users, departments/staff assignment, edu_video, mcq, academics promote) — only to add/route event calls through the service; template preview script |
| N3 Frontend | all frontend notification UI files listed above + a new `src/lib/api/notificationRules.js`; shared switch component in `src/components/shared/` |
| N4 End-to-end test (after N1–N3) | test scripts only; reports bugs to the main session |

Rules for all: preserve line endings, byte-level edits, python-parse edited files, no `next build`, don't restart servers (backend: `wsl -e bash -lc "touch /mnt/e/b2b/b2b_projectk/app/main.py"` to reload), no commits, never print or copy `.env` values, never put the test address in code, docs or tests (tests use a fake address via monkeypatch). Run backend tests in WSL. Report: files, endpoints, decisions, what's left.
