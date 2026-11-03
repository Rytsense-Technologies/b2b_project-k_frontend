# Replace horizontal bars with modern donut / legend cards (owner, 21 Oct 2026)

Owner: "Check the whole project — wherever a horizontal bar is used, replace it with the modern card (reference image). Plan it, make it correctly, test and correct."

## Reference (owner's image) — what the card looks like
1. **Modern card (full):** white card; title (20px 600) + one muted subtitle; top-right a soft grey "Total <thing>" chip with the big number; left a donut (thick ring, centre = big total + small unit label e.g. "Departments" / "Items"); right a **legend table** — each row a bordered/soft row: colored dot · label · count (600) · a **tinted % pill** in the slice colour (e.g. green pill "25%", orange pill "75%"); optional info note strip at the bottom (light blue/teal wash, info icon, one sentence + teal link "View departments →").
2. **Compact widget (dashboard):** smaller donut (centre total + unit) beside the title and a compact legend: dot · label · `count (pct%)`; a teal "View details →" link bottom-right.
- Colours: use the existing data colours (`dataColor`, band colours green/blue/orange/red, grey for neutral states like "Generating"). Pills = slice colour at ~12% tint with the colour as text.
- Spacing: `--qs-*` tokens (docs/agent/redesign/qa-clean-pass-plan.md). Phone (390): donut on top, legend full width below, no horizontal scroll.

## What to convert (and what not)
- **Composition bars** (parts of one whole that sum to a total — e.g. account status Active/Pending/Deactivated, HOD coverage, publication status, students by department counts, score bands Strong/On track/Needs focus, seat usage, delivery mix, role mix, error mix): → **ModernDonutCard** (full) or **compact** on dashboards.
- **Per-item metric bars** (each row its own %/score/count that does NOT sum to a whole — e.g. completion by department, quiz average per subject, per-college comparison, ranked lists, skill rows): → **MetricListCard** — the reference legend-row style (dot · label · value · tinted value pill, optional small sub-text), no bar. If an item list is short (≤ 6) and the owner's intent is "share", a donut is acceptable only when values sum to a meaningful total.
- **Single-value meters** (`ScoreMeter`, one % bar): → a small **ring** (existing `ScoreRing`) with the value in the centre.
- **Keep as bars (functional progress, not charts):** video watch progress / scrubber, upload or generation progress, quiz "question n of N" progress, the Switch control, skeleton loaders, scroll indicators. Do not touch them.

## Shared components (Agent V1 builds first, in `src/components/shared/data-viz.jsx` + `src/styles/data-viz.css`)
- `ModernDonutCard({ title, sub, totalLabel, total?, unit, parts:[{key?,label,value,color?}], note?, link?:{href,label}, compact=false, empty, className })` — renders the whole card (uses the existing card chrome classes so it sits in grids like other panels) **or** `ModernDonut({ parts, total?, unit, totalLabel?, note?, link?, compact })` for use inside an existing `Panel` body (no own card chrome). Percentages: share of total, "<1%" for tiny non-zero, whole numbers; counts formatted en-IN.
- `MetricList({ items:[{label, value, display?, sub?, color?, href?}], format?, suffix?, empty, max? })` — legend-row list with tinted value pill; rows link when `href` given.
- Back-compat: keep `BarList`, `Distribution`, `RankList`, `ScoreMeter` exports working (page agents migrate their call sites); after all pages are migrated the supervisor checks nothing still renders a data bar.
- Accessibility: donut `role="img"` with an aria-label listing every part; legend is a real list/table; pills not colour-only (the % text is there); keyboard links.

## Agents & ownership
| Agent | Owns |
|---|---|
| V1 Components | `src/components/shared/data-viz.jsx`, `src/styles/data-viz.css`, `src/components/shared/ScoreRing.jsx` |
| V2 Super Admin pages | `src/app/superadmin/**`, `src/components/superadmin/**`, `portal-superadmin.css` |
| V3 College Admin + Insights | `src/app/admin/**`, `src/components/admin/**` (incl. InsightsView.jsx, insights.jsx), `portal-admin.css`, `module-analytics.css` |
| V4 HOD/Faculty pages | `src/app/faculty/**`, `src/components/faculty/**`, `portal-faculty.css` |
| V5 Student + shared workspaces | `src/app/student/**`, `src/components/student/**`, `student-*.css`, `src/components/shared/{McqStudentQuiz,EduVideoContentStudio,McqReviewWorkspace,AcademicStructureWorkspace,ReportsWorkspace}.jsx` |
| S Supervisor | reviews every converted screen against the reference + this plan, runs the role sweep, files fixes to owners via the main session; edits nothing itself |

Rules: inventory first (grep `BarList|Distribution|RankList|ScoreMeter` and hand-made bar markup like `*-bar`, `*-track`, `*-fill`, `width: ${pct}%` in your scope), convert each, keep data/labels/links identical, re-flow layouts (no holes), verify with the shared QA helper (`<scratchpad>/qa-lib.cjs`, roles sa/ca/hod/faculty/student, 1440 + 390, no console errors, no horizontal scroll), screenshots `mc-<agent>-*`. No `next build`, no restarts, no commits, preserve line endings, follow `docs/agent/task.md`, spacing tokens, interviews stay removed. Report: every converted usage (file:line → new component/variant), what you kept as a functional bar and why, screenshots.

## Component API (built by V1 — import from `@/components/shared/data-viz`; preview: `.playwright-mcp/mc-v1-1440.png`)
- `ModernDonutCard({ title, sub, totalLabel, total?, unit, parts, note?, link?, compact=false, empty, format?, action?, size?, className })` — full card on `sp-panel` chrome (drops into `dv-grid`). Part `{ key?, label, value, color?, tone?, href? }`; tones: good/info/warn/bad/neutral/strong/ok/focus/none/purple/cyan/teal (neutral = grey for Generating/Pending/Not set). `totalLabel` → top-right chip; `action` replaces the chip; `note` string or `{ text, link:{href,label} }` → teal info strip; `link` → "View … →"; `compact` → small ring + "count (pct%)" rows + "View details →".
- `ModernDonut({ parts, total?, unit, title?, note?, link?, compact?, empty?, format?, size?, className })` — same without card chrome, for inside an existing `Panel`.
- `MetricList({ items, format?, suffix='', empty, max?, colorBy='series'|'band'|'single', label?, className })` — item `{ key?, label, value, display?, sub?, color?, tone?, href? }`; null value → "—" grey pill; `colorBy="band"` for 80/60 score bands. `MetricListCard({ title, sub, action?, note?, link?, ...MetricList })`.
- `ScoreRing` (default import `@/components/shared/ScoreRing`) replaces `ScoreMeter`: `size` 'xs'32/'sm'44/'md'64/'lg'80; null → grey "—". Swap: `<ScoreMeter value={v} label="X"/>` → `<ScoreRing score={v} size="sm" suffix="%" label={`X ${v}%`}/>`.
- Percent: whole numbers, "<1%" / ">99%" at the edges; en-IN counts; pure SVG (SSR-safe); a11y aria-label lists every part.
- Placement: compact cards stretch to their grid row's height — pair them with similar-height neighbours.
