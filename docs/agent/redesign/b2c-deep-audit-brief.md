# Deep module audit — quirri-b2c-student-ui everywhere (owner, 15 Oct 2026)

Owner: "go deep into every module and check; I need to cover all things."
Goal: every page, tab, filter, list, row action, drawer, dialog, form, empty / loading / error state in your scope matches the skill, works, and has no layout bugs at 1440 and 390.

## Read first
1. Skill: `C:\Users\Arun K\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\6bf8aeae-d3c8-4fda-ab08-f94c59cef0af\886af1c8-b366-4679-9fb9-e22a0108a29b\skills\quirri-b2c-student-ui\` (SKILL.md + references/tokens.md, components.md, pages.md).
2. `docs/agent/redesign/student-b2c-brief.md` (rules + project overrides; they apply here too).
3. Already in place: `src/styles/portal-b2c.css` (admin portals: tokens, sidebar, header, cards, teal tabs, teal `.pm-filterbar` above lists via `Panel toolbar`, light tables, buttons) and `src/styles/student-b2c.css` (student). Shared patterns available in admin portals by copying the student `.sb-*` ideas into your own scoped CSS.

## Checklist per screen (record PASS / FIXED / OPEN)
- Header: title + one muted subtitle; no duplicate titles/ledes; actions aligned right; mobile hamburger.
- Colour jobs: teal = active/links/scores/titles; ONE orange primary per region; secondary white (border rgba(0,0,0,.15)) or `#5a7c85`; danger `#d34141`; no orange left-bar title accents; no gradients/glass/heavy shadows; data colours in charts are allowed (owner wants coloured data).
- Cards white 6px `0 1px 2px rgba(0,0,0,.25)`, no nested card chrome, edges aligned with the header.
- Filters: teal bar above the list; search fill `#dde8ea`; selects white 42px; Clear `#5a7c85`; everything readable on teal (no white-on-white, no invisible text, dropdown menus readable); wraps on mobile.
- Tabs: text tabs, teal text + 2px teal underline; counts readable.
- Lists/tables: light rows, hover `#fafafa`, no heavy grid; pager under the list "Showing X–Y of Z" + Previous / n / Next; hidden at 0.
- Empty / loading / error inside the same card; skeleton heights match.
- Dialogs/drawers: white, 8px, overlay 50%, Cancel white + danger/primary, focus trap, Esc.
- Mobile 390: no horizontal page scroll, single column, controls ≥ 44px, two-up buttons full width, tables scroll inside their card.
- No console errors; keyboard focus visible.

## Project rules (override the skill)
Login pages frozen. No plan / subscription / upgrade UI. Keep all features, routes and data. Real data only, no mocks in `src/`. India formats, no native `title=` tooltips. Do NOT run `next build`, do not restart the dev server (:3000), do not commit. Preserve each file's line endings (check with `file`; prefer the Edit tool). Only GET requests during checks — block mutations in Playwright (open dialogs/forms to look at them, never submit). Login rate limit ~5/min: log in once per script, reuse the page.

Playwright base: `C:/Users/ARUNK~1/AppData/Local/Temp/claude/E--b2b-superAdmin-frontend/900a3a8a-4f26-4ea1-87a3-64f58a5ddfbd/scratchpad/portal-shot.cjs` — `MSYS_NO_PATHCONV=1 node portal-shot.cjs <path,path> <tag> <email> 1440,390` (full-page shots to `.playwright-mcp/b2c-<tag>-*.png`, logs CONSOLE/PAGEERR/HSCROLL). Copy it to write your own scripts for clicking tabs, opening dialogs/drawers, changing filters. Logins (password `<seed-password>`): SA `xplain@yopmail.com`, CA `college1@yopmail.com`, HOD `hod@yopmail.com`, Faculty `faculty@yopmail.com`, Student `student@yopmail.com`.

## File ownership (strict — other agents run in parallel)
Edit ONLY the files your prompt lists. If a fix belongs in a file you don't own, list it in your report under "Needs owner of <file>" with the exact CSS/JSX change.

Keep steps small (short edits, short Playwright runs) — long single steps stall.

## Report (short)
Per route: PASS / FIXED (what) / OPEN (why). Files changed. Requests for other owners. Screenshot names.
