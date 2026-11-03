# Full QA + "clean & spacious" pass (owner, 20 Oct 2026)

Owner: "Check everything works on localhost:3000, test every module, fix issues. The design still looks congested and is not properly visualised — make it clean, spaced, user-friendly, simple, much cleaner and professional."

Read first: `docs/agent/HANDOFF.md` (latest sections), `docs/agent/redesign/student-b2c-brief.md`, `docs/agent/redesign/b2c-deep-audit-brief.md`, `docs/agent/redesign/remove-interviews-plan.md` (interviews are GONE — never re-add), skill `quirri-b2c-student-ui` (`C:\Users\Arun K\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\6bf8aeae-d3c8-4fda-ab08-f94c59cef0af\886af1c8-b366-4679-9fb9-e22a0108a29b\skills\quirri-b2c-student-ui\`).

## What the owner sees today (CA dashboard in Chrome, 1422px)
Cards packed with 24px gutters and tight inner padding; two solid-teal blocks side by side at the top (welcome hero + "Needs your attention"); the sidebar shows a grey scrollbar strip; section headers run straight into content; too many competing elements per screen.

## Spacing / cleanliness spec (applies to every portal)
- **Page:** content max-width 1280px, side padding 32px desktop / 20px tablet / 16px phone. Vertical gap between page sections **32px** desktop / 20px phone.
- **Page header:** title 26px/32px bold, subtitle 15px/22px muted, 28px above, 24px below. Nothing else in the header row except page actions.
- **Cards:** white, 6px radius, `0 1px 2px rgba(0,0,0,.25)`; padding **24px** desktop / 18px phone; gap between cards **24px** (grid gap 24 desktop / 16 phone). Card head = title 18px/26px 600 + optional subtitle 14px/20px muted, then **20px** to the body. Remove the hairline under card heads unless the body is a table.
- **KPI tiles:** padding 22px, value 28px/34px 600, label 14px, caption 13px; tiles same height in a row; max 4 per row desktop, 2 tablet, 1–2 phone.
- **Tables:** header 12px 600 muted, cells 15px, row min-height 56px, cell padding 16px 20px, hairline row dividers only, hover `#fafafa`; on phones scroll inside the card or stack as rows.
- **List rows:** gap 12px, padding 18px 22px, min-height 72px.
- **Filter bar (teal):** padding 20px, control gap 12px, 16px below it before the list.
- **Buttons:** 44px tall, 0 20px padding, 12px between buttons; one orange primary per region.
- **Sidebar:** items 44px, 4px apart, group labels 20px above / 8px below, no visible scrollbar track (thin thumb on hover only), footer user row clear of the nav.
- **Visual weight:** at most **one** solid teal block per screen; secondary panels are white cards. No decorative pills; status = text + 6px dot. Remove redundant chips, duplicate sentences, ledes repeating the subtitle.
- **Type:** body 15px / line-height 1.55; muted text `#64748b`/`#707a7e`; never below 12px.
- **Empty / loading / error:** inside the card, centred, 32px padding, one sentence + one action.
- Phone (390): single column, no horizontal scroll, controls ≥ 44px.

## Agents (strict file ownership — run in parallel)
| # | Agent | Owns | Job |
|---|---|---|---|
| 1 | Design system | `src/styles/portal-b2c.css`, `student-b2c.css`, `data-viz.css`, `module-analytics.css`, `portal-modules.css`, `quirri-accents.css`, `quirri-design.css`, `src/components/shared/**` (UI kit: module-ui, data-viz, quirri-ui, modals, drawers, Pager, RolePortalSidebar, MobileNav, shared workspaces' *styling*) | Implement the spec globally (tokens + shared components) so every page gets the spacing; fix sidebar scrollbar; verify on 2–3 pages per portal at 1440/390. |
| 2 | Super Admin QA | `src/app/superadmin/**`, `src/components/superadmin/**`, `portal-superadmin.css`, `superadmin-*.css`, `src/lib/superadmin/**` | Test every SA module (all tabs, filters, sort, pager, search, drawers, dialogs, forms with validation — submit only the safe create→edit→deactivate cycle on records you create yourself and clean up), fix bugs, page-specific congestion. |
| 3 | College Admin QA | `src/app/admin/**`, `src/components/admin/**`, `portal-admin.css`, `src/lib/admin/**` | Same for CA. |
| 4 | HOD/Faculty QA | `src/app/faculty/**`, `src/components/faculty/**`, `portal-faculty.css`, `src/lib/faculty/**` | Same for HOD and Faculty (both logins). |
| 5 | Student QA | `src/app/student/**`, `src/components/student/**`, `src/lib/student/**`, `student-*.css` except `student-b2c.css` | Same for Student (lectures, AI tutor + voice, assessments, leaderboard, progress, settings). |
| 6 | Backend / API QA | `E:\b2b\b2b_projectk\app\**` (no migrations) | Watch every API call the portals make (500s, 4xx that shouldn't happen, slow > 2s), read backend logs (`/tmp/uvicorn-8000.log` may not exist — use responses), fix backend bugs, keep tests green. After edits `wsl -e bash -lc "touch /mnt/e/b2b/b2b_projectk/app/main.py"`; never kill the server. |

Agents 2–5 work on functionality and bugs first, and congestion that is specific to their pages (page CSS / markup). They must NOT re-implement global spacing in page CSS — agent 1 does that; if a global rule is wrong for a page, report it to the main session. Re-shoot your pages after agent 1 reports.

## Rules
- Shared QA helper (saved sessions; avoids the 5/min login limit): `const { open, shot, hscroll } = require('C:/Users/ARUNK~1/AppData/Local/Temp/claude/E--b2b-superAdmin-frontend/900a3a8a-4f26-4ea1-87a3-64f58a5ddfbd/scratchpad/qa-lib.cjs'); const { browser, page } = await open('ca' /* sa|ca|hod|faculty|student */, { width: 1440, height: 900, allowMutations: false });` — `page.__errors` collects page errors, console errors and HTTP 5xx. `shot(page, name)` saves to `.playwright-mcp/`. Name your screenshots `qa-<agent>-*`.
- Mutations: default blocked. Only agents 2–4 may enable `allowMutations` to test create/edit flows on **records they create themselves** (prefix names `QA Test …`, e-mails `qa+<x>@yopmail.com`), then deactivate/delete them. Never modify existing real records (VISTAS, existing users/students/chapters), never publish/send/regenerate content, never send e-mails to real people.
- No `next build`, don't restart dev servers, no commits, preserve line endings (`file`; prefer the Edit tool; never `sed -i`), no mocks, India formats, login page frozen, no plan UI, no interview UI, follow `docs/agent/task.md`.
- Keep steps small (short edits, short Playwright runs) — long steps stall.
- Report: per module PASS / FIXED (what) / OPEN (why); files changed; screenshots; requests for other owners.
