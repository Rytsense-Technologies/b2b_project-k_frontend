# Build brief — portal redesign writers (14 Oct 2026)

Read before editing: `docs/agent/REDESIGN_PLAN.md`, `docs/agent/design-system.md` §0c, §4a (recipe v2), §0b, §2b, §5,
and your role spec in `docs/agent/redesign/<role>.md` (build its P1 list, then P2 where cheap).

## Shared kit (do not edit — main session owns these)

- `src/components/shared/module-ui.jsx`: `ModulePage`, `ModuleHead`, `HeadChip`, `ModuleTabs` (route tabs),
  `TabNav` + `TabPanel`, `KpiRow`, `Panel` (now has `toolbar` prop for in-panel filters), `FilterBar`, `SegTabs`,
  `SectionState`, `Pager`, `DetailDrawer`, `DrawerSection`, `InfoList`, `FormDrawer`, `ConfirmNote`, `StatusPill`, `IconButton`, `Mono`.
- `src/components/shared/data-viz.jsx`: `BarList`, `RankList`, `Distribution`, `ColumnChart`, `TrendChart`, `DonutChart`,
  `BandPill`, `ScoreMeter`, `Legend`, `dataColor(i | stableKey)`, `bandFor(score)`, `BANDS`. Styles: `src/styles/data-viz.css`
  (`.dv-grid`, `.dv-grid--3`, `.dv-span-2` for analytics layouts).
- `src/hooks/useUrlState.js`: `useUrlState`, `useTabParam(values, fallback)` — tab in `?tab=`.
- `src/lib/utils.js` `getScoreColor` (80 / 60 bands). Backend `/analytics/college|department` now also returns
  `score_bands: {strong, ok, focus, none}`.
- If you need a change in a shared file, a new shared component or a backend field, **do not make it** — list it
  under "Needs from main session" in your report, and build the rest.

## Rules

- Recipe v2: no `ModuleBanner` on module pages (title is in the top bar). `ModuleHead` + one tab system + panels.
  Dashboards keep `PortalHero`. Say scope once. Tab counts instead of duplicate KPI cards.
- Colour data with the data-viz components; a subject / department uses `dataColor(id)` so it is the same on every page.
  Buttons / pills / nav stay teal + orange. One orange action per view. Red only for errors.
- Clean, simple, professional; not over-designed. Keep real data only: check the API route before showing a field. No mocks.
- Keep every existing feature working (forms, drawers, modals, review loop, filters, exports, RBAC / scope, read-only states).
  Moving a feature into a tab is fine; removing it is not.
- Login UI frozen. No plan / subscription UI. India formats (en-IN, dd Mon yyyy, +91). No native `title` tooltips.
- **Line endings:** check each file (`file <path>`); keep CRLF files CRLF. Edit with Python byte-level replace or the
  Edit tool; never `sed -i`. Re-read a file right before editing it.
- Only edit files you own (listed in your prompt). Do not commit or push. Do not run `git checkout`/`reset`/`stash`.

## Verify (required)

- Syntax: `node <scratchpad>/check.js <files>` style SWC parse, or load the page in the dev server (http://localhost:3000)
  and confirm no compile error / console error.
- Playwright: one login per role (password `<seed-password>`, ~5 logins/min limit), reuse storage state, delete it after.
  Abort every non-GET request except `/auth/login` and `/auth/refresh*` unless your prompt says otherwise.
  1440×900 and 390×844 `isMobile:true`. Every tab, filter, dropdown, drawer, modal opens and closes; no horizontal scroll
  at 390; no console errors. Screenshots: `.playwright-mcp/build-<role>-<page>-1440.png` / `-390.png`.

## Report (final message)

Table per page: what changed, files, verified (yes / how). Then "Needs from main session" and "Not done + why".
