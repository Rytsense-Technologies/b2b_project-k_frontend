# Student portal → quirri-b2c-student-ui (owner request, 15 Oct 2026)

Owner: "use this skill's rules for the student login alone; alter the design and all other structure based on the skill."
Scope = the signed-in **student portal only** (`src/app/student/(portal)/**`). SuperAdmin / College Admin / HOD / Faculty are untouched.

## Source of truth (read first)
Skill files (read all four before editing):
`C:\Users\Arun K\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\6bf8aeae-d3c8-4fda-ab08-f94c59cef0af\886af1c8-b366-4679-9fb9-e22a0108a29b\skills\quirri-b2c-student-ui\` → `SKILL.md`, `references/tokens.md`, `references/components.md`, `references/pages.md`.

## Already done by the main session (do not redo, do not edit)
- `src/styles/student-b2c.css` — shell + shared student patterns, scoped `.app.q-student`. It re-points tokens (`--accent`, `--ink`, `--radius-card:6px`, `--select*` = teal text/underline, canvas `#efefef`, DM Sans via `--font-student`) and ships ready classes:
  - text tabs `.sb-tabs` > `button.sb-tab[aria-selected]`
  - teal filter bar `.sb-filterbar` with `.sb-search` (svg + input), `select.sb-select`, `.sb-actions` > `.sb-btn.sb-btn--clear` / `.sb-btn.sb-btn--go`
  - meta line `.sb-meta` + stat cluster `.sb-stats` > `.sb-stat` (`<b>` number, `<span>` caption) / `.sb-rule`
  - list rows `.sb-rows` > `button.sb-row` (`.sb-row__idx`, `.sb-row__title`, `.sb-row__sub` with `.sb-dot`, `.sb-row__score`, `svg.sb-row__chev`)
  - pager `.sb-pager` (`.sb-pager__info`, `.sb-pager__nav` buttons), empty `.sb-empty` (+ `.text-link`), skeleton `.sb-skel`
  - tokens: `--sb-teal #14606e`, `--sb-teal-deep #0e5c6b`, `--sb-orange #f5821f`, `--sb-ink`, `--sb-muted`, `--sb-wash #e8f2f4`, `--sb-secondary`, `--sb-danger`, `--sb-shadow`, `--sb-shadow-row`, `--sb-index`.
- `src/app/student/(portal)/layout.jsx`, `src/lib/student/fonts.js`, sidebar (`StudentSidebar.jsx`, `RolePortalSidebar.jsx`) — main session only.

If you need a new SHARED pattern, put it in your page CSS scoped to your page root and mention it in your report; do not edit `student-b2c.css`, `student-portal.css` (global, loaded for every portal), `ui.jsx`, `data-viz.*`, `module-ui.jsx`, or `quirri-*.css`. Override old rules from your own page CSS with `.q-student` + your page root class.

## How to apply the skill here
- Shell rules: header title/subtitle comes from `src/lib/student/pageMeta.js` (only the main session edits it — propose subtitle changes in your report). White cards on grey, 6px, `--sb-shadow`, no borders, no nested cards, no gradient cards, no glass, no big shadows.
- Colour jobs exactly as in the skill: teal for titles/links/scores/active, orange only for **one** primary action per region, secondary white (border rgba(0,0,0,.15)) or `#5a7c85`. Remove the orange left-bar section-title accents and decorative colour that the skill does not use. Data colours in charts may stay but prefer teal fills for bars/skill rows (skill "Skill row").
- Hero: the skill allows one teal-deep `#0e5c6b` hero (report detail). Dashboard: no filter bar + hero together. Keep a hero only where the skill page spec allows one.
- Lists: teal filter bar ABOVE the list on the canvas (not inside the card), filters apply on Search button / Enter, Clear resets; stacked white rows (no heavy tables); "Showing X–Y of Z" + Previous / n / Next under the list, page size 10; hide pager at 0.
- Tabs: text tabs with teal underline, not pills/segments.
- Empty / loading / error inside the same card frame; skeletons `#e8f2f4` matching row height.
- Mobile < 1024px: single column, controls ≥ 42px (44px coarse pointer), full-width two-up buttons, no horizontal page scroll.

## Project rules that override the skill
- Login page (`src/app/student/(auth)/login`, `/auth/login`) is FROZEN — do not touch.
- **No plan / subscription / upgrade / pricing UI, no plan badges, no "View plans", no Job Board, no plan usage meters** (B2B SOW). Skip those parts of the skill.
- Keep every existing feature, data source and route. Restyle and restructure only; do not delete functionality. Real API data only, no mocks in `src/`.
- India formats (en-IN dates, IST), no native `title=` tooltips, a11y (roles, focus-visible, keyboard).
- Use `useUrlState` / `useTabParam` (`src/hooks/useUrlState.js`) for filter/tab state you add.
- Do NOT run `next build` (the dev server on :3000 shares `.next`). Do not restart the dev server. Do not commit.
- Line endings: preserve the file's existing EOL (check with `file`); prefer the Edit tool.

## Verify
Playwright (real login `student@yopmail.com` / `<seed-password>`, base `http://127.0.0.1:3000`, login rate limit ~5/min — log in once and reuse the page). A ready script: `node <scratchpad>/stu-shot.cjs /student/home,/student/reports <tag>` (run with `MSYS_NO_PATHCONV=1` from Git Bash) writes `.playwright-mcp/b2c-<tag>-*-1440.png` / `-390.png`. Only GET requests in checks (block mutations). Look at your screenshots at 1440 and 390 and fix what is off. Check no console errors and no horizontal scroll at 390.

## Report back (short)
Files changed, what changed per page, screenshots paths, anything skipped and why, proposed pageMeta subtitle changes.
