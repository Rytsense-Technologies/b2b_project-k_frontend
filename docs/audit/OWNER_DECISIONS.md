# Owner Decisions (3 Nov 2026)

The owner asked for every open product decision to be settled ("fix those all"). Each row is the default chosen. Override any row by editing it; the implementation follows the row.

| # | Issue | Decision |
|---|---|---|
| 1 | UX-002, UX-003, UIX-002 orange contrast | **Owner decision (chat, 3 Nov 2026): keep the guideline orange exactly as designed for the entire product**: white text on `#F5821F` fills and orange status words, per `docs/agent/design-system.md`. The WCAG contrast shortfall (2.59:1) is accepted by the owner. The earlier ink-text change is reverted. |
| 2 | APIX-005 session after logout | Logout revokes the access token too: a denylist of revoked token ids (`jti`) kept until each token expires. |
| 3 | APIX-006 request size | 1 MB limit on JSON bodies in the app. Upload routes keep their own file-size limits. |
| 4 | UX-001 captions | Generate WebVTT captions from the stored narration script for every new render. Add a backfill script for existing videos that makes no paid calls. The player shows captions with a toggle. |
| 5 | AUTHZ-010 peer College Admins | Only a Super Admin may demote, deactivate or cancel a College Admin. A College Admin cannot change their own role. |
| 6 | BACKEND-018 head of department | Only a user with role `hod` can be set as head. No implicit powers for faculty. |
| 7 | FUN-005 Super Admin promotion | `tenant_id` is required; one college at a time. |
| 8 | DATA-028 videos per chapter | One published video per chapter. Publishing a new one unpublishes the previous one, and the review log records it. |
| 9 | BACKEND-006 quiz changed after attempts | Students keep their score and stay locked. Staff see how many attempts exist before they regenerate or edit an approved quiz. |
| 10 | Change request vs publish | An open change request blocks publish (409) until it is regenerated or dismissed. |
| 11 | Planning failure retry | No retry of planning, because it is paid. The message tells the user to upload the document again. |
| 12 | BACKEND-047 background quiz generation | Not now; it stays synchronous. Accepted. |
| 13 | UIX-001 taken code | The API refuses a taken college or university code with 409. No silent reassignment. |
| 14 | DATA-006 seats | Active and pending students use a seat; deactivated students do not. |
| 15 | College names unique | Not required (codes are unique). Accepted. |
| 16 | DATA-003 Windows Postgres | Not changed by Claude: stopping a Windows service is a system change. Owner to stop or disable it. |
| 17 | PIPE-026 crisis alerts | No named-person alerts. An anonymous count per college is recorded for the Super Admin health page. |
| 18 | INFRA-016 quotas | Per-college daily caps, configurable in settings: video uploads, quiz generations and tutor turns. Exceeding a cap returns 429 with a clear message. |
| 19 | INFRA-020 Sarvam fallback | Keep the existing fallback voice. Accepted. |
| 20 | INFRA-021 error tracker | Not decided by Claude: a vendor account is needed. The in-app ops monitor remains. |
| 21 | INFRA-022 privacy and retention | Legal terms are for the owner and counsel. The technical default is row 22. |
| 22 | PIPE-021 deleted job files | Files of deleted jobs are purged 30 days after deletion. |
| 23 | PIPE-006 job fairness | At most one active render per college; other colleges are not blocked behind it. Worker count unchanged. |
| 24 | AUTH-015 OTP routes | Remove `/auth/send-otp`, `/auth/verify-otp` and OTPModal (no flow uses them). |
| 25 | DATA-030 dead columns | Drop the unused `edu_video_scenes` columns and `users.plan` / `tenants.plan`. |
| 26 | PIPE-027 dead pipeline code | Delete it. |
| 27 | BACKEND-035 bell events | Keep 8 in the bell; account events stay e-mail only. Accepted. |
| 28 | QA-003 zod | Migrate to zod 4. |
| 29 | FE-011 reset button | Text changes to "Save password". |
| 30 | UX-012 | Closed: not a defect. |
| 31 | AUTH-008 unset ENVIRONMENT | Keep the `development` default, log a startup warning, and keep deploy setting `production` explicitly. Accepted. |
| 32 | Earlier changes (type-instead tutor, deleted modules, darker grey and green, active-only reports, 60 s leaderboard, 401 lockout) | Kept. |
| 33 | Housekeeping | Restart the local API; delete `E:\b2b_build_check_tmp` and the `quirri_*_test` databases. QA-004 waits for a livekit-agents release. |
