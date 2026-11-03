# Portal redesign plan (owner request, 14 Oct 2026)

**Ask:** Super Admin, College Admin, HOD, Faculty and Student portals look "AI-generated" and only use two colours.
Give every module a proper product layout (separate tabs / sub-pages inside modules, real filters),
colour the data (bars, calculations, rankings), keep everything working, then do a full final check.

**Inputs (no product Figma exists):** SOW v1.0 scope (`assets/_pdf_extract/ProjectK_B2B_SOW_v1.0.txt`),
Brand Guidelines v1.0 + Quirri Prep patterns (`docs/agent/design-system.md`), the Student portal as the
closest-to-product visual reference, `docs/knowledge/` for roles, flows and metrics.
Owner style: clean, simple, professional; not over-designed; "add a little colour".

## Owner decisions (14 Oct 2026)

- No Figma — derive from SOW scope + guidelines + student portal.
- **Colour all data:** the categorical set (`--cat-1…6`) is now allowed on every chart series, bar list,
  distribution, score band and ranking — not only skill / subject lists. Buttons, status pills and
  navigation stay teal + orange (unchanged), so the product still reads as one brand.

## Phase 0 — shared foundation (main session)

1. Data-colour tokens + rules: `src/styles/data-viz.css`, `design-system.md` §0c.
   - Series order: blue, green, orange, purple, cyan, teal (`--cat-1…6`).
   - Score bands: strong ≥ 80 green · on track 60–79 blue · needs focus < 60 orange · no data grey.
   - Ranks: 1 orange, 2 blue, 3 purple, then teal.
2. Data components: `src/components/shared/data-viz.jsx`
   - `BarList` (coloured horizontal bars), `RankList` (rank badges), `Distribution` (stacked band bar + legend),
     `ColumnChart` / `TrendChart` / `DonutChart` (recharts, categorical colours), `BandPill`, `Legend`, `dataColor`, `bandFor`.
3. Module navigation: `useTabParam` (tab kept in `?tab=` so every tab is linkable / back-button safe) +
   existing `TabNav` / `TabPanel`. Sub-pages use route tabs (`ModuleTabs`, Next `Link`) where a module is big.

## Phase 1 — audits (read-only sub-agents, parallel)

One per role — Super Admin, College Admin, HOD, Faculty, Student. Each writes
`docs/agent/redesign/<role>.md`: per module → purpose (SOW), current problems (layout, hierarchy,
filters, empty / error states, alignment, 1440 + 390), target structure (tabs / sub-pages, filter set,
KPIs, which data gets which chart + colour), functional gaps found.

## Phase 2 — build (writer sub-agents, strict file ownership)

| Writer | Owns |
|---|---|
| Super Admin | `src/app/superadmin/**`, `portal-superadmin.css`, `superadmin-*.css` |
| College Admin | `src/app/admin/**`, `src/components/admin/**`, `portal-admin.css` |
| HOD + Faculty | `src/app/faculty/**`, `src/components/faculty/**`, `portal-faculty.css` |
| Student | `src/app/student/**`, `src/components/student/**`, `student-*.css` |
| Shared modules | `src/components/shared/*Workspace.jsx`, `EduVideo*`, `Mcq*`, `ReportsWorkspace`, `portal-modules.css` |

Shared foundation files (`module-ui.jsx`, `data-viz.*`, `quirri-design.css`, `quirri-accents.css`, `overlayStack.js`)
are changed only by the main session. No backend change without a check of the route first.

## Phase 3 — verify + fix, then final check

Per role: design (design-system §7 checklist, 1440 + 390 screenshots) and functionality
(every tab, filter, dropdown, modal, empty / error state; read-only Playwright, non-GET blocked).
Fix loop until clean, then one final pass over all portals + backend tests + `check-knowledge`.

## Guardrails

Login UI frozen · no mocks · no plan / subscription UI · India formats · no native title tooltips ·
one orange action per view · preserve line endings · no commit / push unless asked.
