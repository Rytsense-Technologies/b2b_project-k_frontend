# prod.md — Product & scope (Phase 1 B2B)

> **Load when:** any feature, module, portal screen, or “build X” request.  
> **Budget:** this file only (~1–2k tokens). Open full SOW / guides only if still ambiguous.

## Contract hierarchy (do not invert)

| P | Source | Role |
|---|--------|------|
| 1 | `assets/ProjectK_B2B_SOW_v1.0.pdf` · extract `assets/_pdf_extract/ProjectK_B2B_SOW_v1.0.txt` | **What is allowed** |
| 2 | `assets/PROJECT_K_DEVELOPMENT_GUIDE.md` | Product modules / tenancy / RBAC detail |
| 3 | `docs/BACKEND_STATUS_REPORT.md` · `docs/FRONTEND_BACKEND_ALIGNMENT.md` | Live API vs empty/error |
| 4 | Client overview docs under `docs/` (e.g. interview overview) | Narrative only — **not** superseding SOW |

Rule file: `.cursor/rules/quirri-sow-scope.mdc`

## Phase 1 product (in scope)

- B2B institutional model: Knotopian Super Admin → universities/colleges → College Admin / HOD / Faculty → Students
- Portals: Super Admin, College Admin (+ HOD/Faculty RBAC), Student
- Content upload → AI course/video → SME review → student Classroom
- Student: videos, Voice QnA (EN + Tamil), MCQ, leaderboard, **embedded AI Interview** (final-year)
- Analytics (SA + CA); notifications as SOW specifies
- Desktop web; English primary for video; Tamil for QnA
- Colleges: location + **student seat cap** only (no plan/licence UI)

## Explicit exclusions (ask / CR before any work)

- Mobile apps · offline content · live faculty↔student streaming
- B2C standalone Interview Portal + subscription/billing
- Complete Interview Module beyond SOW §6.4.5 (separate SOW)
- On-prem · third-party LMS · plan/licence/upgrade funnels
- Reintroducing Skill Courses, Email CRUD, AI Usage ₹ dashboard, student billing

## Interview (B2B embedded) — contracted slice

Owner (20 Oct 2026): module removed from all portals (including final-year). Backend default `INTERVIEWS_ENABLED=false` — those routers are **not mounted** and return **404** (feature off, not an error). Stored data is kept; `INTERVIEWS_ENABLED=true` restores the APIs. Voice QnA still uses LiveKit.

| In SOW | Status cue |
|--------|------------|
| Student tab · voice + avatar · mock sessions | Removed from portals; APIs 404 while flag off |
| Self-start **or** Faculty/HOD assign cohorts | Same — assignment routes unmounted |
| Score report · per-question feedback · improvement plan | Same |
| CA cohort analytics · downloads · email results | Interview report type / column omitted while flag off |

## Settled behavior (owner, Oct 2026)

- A student has **one department at a time** (SOW hierarchy: department → program → semester). College Admin sets it on create and can change it from the student drawer.
- Changing department removes that student’s lecture watch progress, chapter assessments, and tutor chats for the **previous** department. They start those again in the new department. Interview history stays. First assignment (no previous department) does not wipe anything. Deactivate still keeps records.
- Student interview **Experience Level** offers only **Fresher** (`0-1`). The start payload still sends `0-1`. Interview screens are not shown while the module is off.
- Personal notification switches use GET/PUT `/notifications/rules` (default personal scope). GET `/notifications/inbox` is the bell (read/unread, table `user_notifications`, alembic **0045**). GET `/notifications/mine` is email history. There is **no** `/notifications/preferences` route.
- Faculty must not open `/faculty/staff` or `/faculty/reports` (portal 404). HOD still has those modules.
- `/student/classroom` redirects to My subjects. Voice QnA offers type-instead (`POST /voice_qna/chat`) when voice is blocked or slow.
- Settings → Notifications: Super Admin / College Admin / HOD see a link to their portal Notifications **Rules** tab. Faculty and Student edit their own email switches on Settings. Shared UI: `SettingsNotificationsTab`.
- New password policy in the catalog matches the backend: **8–72** characters with upper, lower, and a digit (`FIELD_RULES.password`, `PASSWORD_RULE_MESSAGE`). Phone numbers are Indian mobiles: 10 digits starting 6–9 (`toIndianMobile`).
- Browser tabs use `usePortalDocumentTitle` (`Page · Portal · Quirri`). Login sets `Sign in · Quirri` only — that is document-title logic, not a login visual restyle.
- Sign-out calls POST `/auth/logout` then clears local session. Super Admin Security can list recent sign-ins from GET `/audit-logs`.
- Product notifications are **email only**. WhatsApp is not shown in portals (filters, labels, delivery logs, inboxes, health). Backend may still persist `channel=whatsapp`; the UI hides it (`withoutWhatsApp`). SOW §7 still names WhatsApp — owner override Oct 2026.

## Scope gate (mandatory before coding)

```
IF request maps clearly to SOW → proceed
ELSE IF out of scope / ambiguous / CR → STOP and ask user
DO NOT stub, quietly add, or “while we’re here” expand scope
```

## Product must-haves (every portal screen)

1. No mocks in `src/` — loading / error / empty only  
2. One orange `--accent` CTA per view (reference palette, design-system.md §0b)  
3. Forms: `FIELD_RULES` + `QuirriRHFField`  
4. Tips: `QuirriTooltip` / `useQuirriTip` — never native `title`  
5. WCAG 2.2 AA · calm sentence-case  
6. Missing backend epic → empty/error (not fake data)  
7. India-only location · +91 · seat cap not “plan”

Working map (who, hierarchy, loops): `docs/knowledge/product.md`. One-concept facts: `docs/knowledge/index.md`.

Next: `architecture.md` (where code lives) → `task.md` (before/after loop).
