# Settings module — role-scoped, simple and accurate (owner, 22 Oct 2026)

Owner: "Like the other modules, Settings is not appropriate for all four logins. Base it on each role's authorization scope and the project scope, remove unwanted wording, make it simple, clean and clearly understandable."

## Facts (from the analysis)
- All portals render `src/components/shared/AccountSettings.jsx` (Profile + Security + optional `extraTabs`; Student adds Notifications). Same subtitle "Your profile and account security." everywhere.
- Self-edit API: GET/PATCH `/auth/me` (first_name, last_name, phone_number, avatar_url only). POST `/auth/change-password` revokes **all** sessions incl. this one. POST `/auth/logout` (this device). POST `/auth/forgot-password`. **No email change anywhere**, no sessions list, no 2FA, no avatar upload.
- `/auth/me` already returns tenant_name, university_name, department_name, program_name, semester_name, year_of_study, course_duration_years, is_final_year. GET `/faculty/me` (hod/faculty) returns department_name, college_name, is_hod, assigned subjects (name, code, semester, program). GET `/audit-logs?search=&module=&range=` (SA only) contains "Signed in" rows with IP.
- Notification rules: personal scope only for Faculty/Student; SA/CA/HOD manage platform/college/department rules on their Notifications page (no personal scope).
- Bugs: frontend password rules (max 128, no lowercase check) ≠ backend (max 72, needs a lowercase letter); sidebar name not refreshed after saving; initials fallback always "S"; backend GET `/auth/me` omits `hod` from `is_b2b` (main session fixes).

## Target per role (one clean layout, role-specific content)
Tabs: **Profile · Security · Notifications** (all roles).

### Profile tab
1. **Header card**: initials avatar (from the real name/email), name, email, role label as plain text (no pill clutter).
2. **Personal details** card: First name, Last name, Phone (editable, India format hint once: "Indian mobile number"). Email shown read-only with one short line: "Your sign-in email can't be changed." No Role field (it's in the header). Save button right-aligned, orange, enabled only when changed and valid.
3. **Your access** card (read-only, role-specific) — replaces the "About your account" card and the four "managed by your administrator" lines. One closing line saying who changes it:
   - **Super Admin**: "Access: All colleges on the Quirri platform". Line: none (top-level account).
   - **College Admin**: College (tenant_name), University (university_name). Line: "Contact Quirri support to change your college details."
   - **HOD**: Role "Head of department", Department, College, Subjects you teach (from `/faculty/me`, comma list or "None assigned"). Line: "Your College Admin manages your department and subjects."
   - **Faculty**: Department, College, Subjects you teach. Same line.
   - **Student**: College, Department, Programme, Semester, Year ("Year 1 of 2" + "Final year" when true). Line: "Your College Admin manages your programme and year."
   Empty values show "Not set" (not "—").

### Security tab
- **Password** row: "Change password" button → modal (Current, New, Confirm; rules shown once as helper text: "At least 8 characters with upper- and lowercase letters and a number"; max 72; "Forgot your current password?" link → `/auth/forgot-password`). Accurate wording: modal note "After changing it you'll sign in again on every device, including this one." Success: toast, then sign the user out and send them to `/auth/login` with a notice (because the backend revoked this session too).
- **Sign out of this device** row (POST `/auth/logout`, then go to login).
- **Super Admin only — Recent sign-ins**: last 10 "Signed in" audit entries for the SA's own email (date/time IST, IP) from `/audit-logs`; empty state "No sign-ins recorded yet."
- Remove the duplicated "Sign-in email · Locked" row.

### Notifications tab
- **Student, Faculty**: personal `NotificationRules` (existing component), intro "Choose which emails you get. Security emails are always on."
- **Super Admin / College Admin / HOD**: a short card: "Email notifications for the platform / your college / your department are managed on the Notifications page." + button "Open notification rules" → `/superadmin/notifications?tab=rules`, `/admin/notifications?tab=rules`, `/faculty/notifications?tab=rules` (use the real tab ids those pages use).

### Wording rules
- No "managed by your administrator" repetition; no promises nobody can keep; no "institution" for SA; no plan/interview/resume words; no placeholder copy ("not available yet / as soon as the service is ready" → a plain error with Try again).
- Page subtitles: SA/CA/HOD/Faculty "Your profile, sign-in and email notifications."; Student same.
- Student avatar menu: Profile · Security · Notifications · Log out. Faculty/HOD sidebar unchanged.

## Contract between agents
- **S2 (data/API/validation)** provides in `src/lib/api/superadmin/modules.js` (`settingsApi`): `get()`, `update(body)`, `changePassword(body)`, **`logout()`** (POST /auth/logout), **`recentSignIns(email)`** (GET /audit-logs filtered → `[{at, ip, detail}]`, SA only); in `src/lib/api/faculty/*` (existing client for `/faculty/me`, reuse if present): `facultyMe()`; a hook **`src/hooks/useAccountScope.js`** → `{ loading, rows:[{label,value}], note }` per role built from `/auth/me` (+ `/faculty/me` for hod/faculty); updated `src/lib/validation/schemas/settings.js` (+ `FIELD_RULES.password.max = 72`, lowercase rule) — keep existing export names; a `syncSessionUser(user)` helper that dispatches the auth slice `setUser`/equivalent so the sidebar updates after saving.
- **S1 (UI)** rebuilds `AccountSettings.jsx` (+ `src/styles/student-settings.css` / a new `src/styles/account-settings.css`) to the target above using S2's functions (import by these names; if S2 isn't done yet, code against the contract).
- **S3 (wiring)**: per-portal settings pages (`src/app/{superadmin,admin/(portal),faculty/(portal),student/(portal)}/settings/page.jsx`) pass the Notifications tab content: new `src/components/shared/SettingsNotificationsTab.jsx` (personal rules for faculty/student; link card for SA/CA/HOD — check each notifications page's real tab id), pageMeta subtitles (4 files), `StudentSidebar.jsx` menu (add Notifications → `/student/settings?tab=notifications`), `FacultyAccessGate.jsx` wording if needed.
- AccountSettings gets the Notifications tab via `extraTabs` (keep that prop) or a new `notificationsTab` prop — S1 decides and S3 adapts; coordinate through the main session.

## Rules
Spacing tokens + design rules (`qa-clean-pass-plan.md`), status text+dot, one orange primary per region, India formats, no native `title` tooltips, a11y (labels, focus, 44px). Preserve line endings; no `next build`; no restarts; no commits. Verify with `<scratchpad>/qa-lib.cjs` for sa/ca/hod/faculty/student at 1440 and 390 — **mutations blocked** except: profile save on the test account (restore the original values right after); never actually change a password or log out the shared QA sessions (test the modal validation and the logout button's request with a stubbed route instead). Screenshots `set-*`.
