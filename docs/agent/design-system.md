# design-system.md — Quirri product design system (source of truth for UI)

> **Load when:** any visual, layout, spacing, colour, type, component or copy change in any portal
> (Super Admin `/superadmin`, College Admin `/admin`, Faculty `/faculty`, Student `/student`).
> **Implementation:** `src/styles/quirri-design.css` (tokens + shell + shared components) ·
> `student-portal.css` (`.sd-*` `.sp-*` `.iv-*`) · `superadmin-universities.css` (`.un-*`) · `superadmin-colleges.css` (`.co-*`).
> **Rule file:** `.cursor/rules/quirri-design-system.mdc` (always apply).

Inputs analysed (Oct 2026):

1. **Quirri AI Brand Guidelines v1.0 (July 2026)** — the PDF. Colour, type, layout, components, voice, accessibility.
2. **Quirri Prep product screens** (the client's live sister product, `dev.prep.quirri.ai`): Dashboard, Start interview (stepper + summary), My reports, Help & support, Settings (underline tabs), Profile form, Plans, Add-on packs.
   The client wants every portal in this project to look and behave like those screens, inside the guideline rules.

Where Prep and the PDF disagree, the **owner overrides** below decide. Everything else follows the PDF.

---

## 0. Owner overrides (decided Oct 2026 — do not re-ask)

| Topic | PDF says | Prep shows | **Decision** |
|---|---|---|---|
| Primary CTA fill | Amber 700 `#AC5B16` + white | Signal Amber `#F5821F` + white | **Quirri orange `#F5821F` + white, Medium weight** (`--accent`). Owner, Oct 2026: **`#AC5B16` is never used in product UI** — there is one orange. Amber 700 survives only on the frozen login card. |
| Button / input shape | full pill buttons, 2px inputs | ~6px rounded | **6px** buttons, inputs, selects, chips, nav items |
| Cards | 8px | ~6–8px | **8px** cards, banners, KPI tiles, filter bars, row cards |
| Panels | 16px | — | **16px** only for modals, drawers, sheets |
| App canvas | Mist `#F8F8F9` | light grey | **Neutral 100 `#EEF0F0`** (`--canvas`) so white cards read without borders. Mist stays for inner wells, table headers, footers. |
| Sidebar | Deep Teal allowed | white | **White** sidebar (owner lock), Ink text, Teal active |
| Colour balance | 60 / 30 / 10, one amber action | teal + orange + green + skill hues | **Reference palette (Oct 2026):** Teal = structure, Orange = action + focus, Green = positive progress, a fixed categorical set for skills / subjects / chart series. Implemented in tokens (`quirri-design.css` `:root`) and `src/styles/quirri-accents.css` (loaded last). See §0b and §2b. |

### Colour roles (owner, Oct 2026 — the three brand colours)

| Role | Colour | Hex | Token | Used for |
|---|---|---|---|---|
| **Primary** | Quirri teal | `#0E5C6B` | `--teal-500` | Welcome banners and side panels, the search / filter bar, the active sidebar item's text, links, icons, the solid teal secondary buttons (Next, Save, Publish) |
| **Main action** | Quirri orange | `#F5821F` | `--accent` | The one main button on each screen (Add student, Create user, Save changes), always with white text. Also anything else that carries white text on orange (selected tab / segment, selected pill, banner overline, icon tile) and orange words on white (`--accent-text`). |
| **Accent only** | Quirri orange | `#F5821F` | `--highlight` | Small highlights such as chart points, notification / live dots, focus progress fills and rings, the 4px title rule. |

## 0b. Reference palette — Quirri Prep interview dashboard (owner, Oct 2026)

The owner supplied the Prep student interview dashboard as **the** colour reference for the whole product. Colours sampled from it and the job each one does there:

| Colour (sampled) | Token | What it does in the reference | Where we use it |
|---|---|---|---|
| Teal `#0C5C6A` ≈ `#0E5C6B` | `--surface-brand`, `--teal-500` | The structural colour. Large **solid** surfaces: welcome hero, "Top Improvement Areas" side card, score panel. Also labels ("Interview Limits"), KPI sub-text, item meta ("Full Interview"), scores in list cards, chart line. | Every portal hero (`.banner`, `.sd-hero`, `.sp-banner`), insight side panels (`.q-hero-side`, `.sd-focus`), score panels (`.sd-scores`, result heroes), filter bars, links, KPI sub-text, section labels. |
| White on teal | `--on-brand`, `--on-brand-muted`, `--on-brand-line`, `--on-brand-raised` | Titles, bullets and body on teal; ring tracks and inner boxes are translucent white, never a new colour. | Text, dividers, ring tracks and inset rows on any teal surface. |
| Orange `#F6821F` ≈ `#F5821F` | `--accent` (`-hover` `#E5731A`, `-press` `#D2650F`, `-soft` `#FEF0E3`, `-line`) for buttons / selected states / words · `--highlight` for small marks — **same orange** | **Action and focus.** The one primary CTA, the active score tab, the "Needs Focus" value, used-limit counts, chart markers, the technical-score ring. | `.btn-primary`, `.sd-btn--amber`, selected tab / segment / pill / step, banner overline, icon tiles, chart points, dots, focus rings and bars, limits progress bar, title rule. |
| Orange words on white | `--accent-text` `#F5821F` | "Answer Structure" (needs focus), "0/10" used counts. | Any orange **text** on white: focus values, counts used, "Not assigned". Keep it 14px Medium or larger. |
| Green `#62B922` ≈ `#5CB414` | `--progress`, `--progress-text` `#46921A`, `--progress-soft` | **Positive progress.** Soft-skill ring, "Current Score" when it improves, the up-trend icon. | Score rings and bars that show progress, improving / latest score, `.stat .s.up`, strong scores (`getScoreColor` ≥ 80). Status pills keep `--color-success`. |
| Skill hues — blue `#2C74E0`, green `#54B058`, orange `#F5821F`, purple `#6C3CD8`, cyan `#23B6B9` | `--cat-1` … `--cat-5` (+ `--cat-6` teal), each with `-soft` (icon disc) and `-text` (percentage) | **Category coding.** Each skill in "Skill Breakdown" gets its own hue for the round icon disc, the % and the bar. | Skill / subject / dimension lists (`.sd-skill--c1…c6`, `.iv-dims`), chart series. **Never** for status, buttons or navigation. Always in this order. |
| Canvas `#EFEFEF` | `--canvas` `#EEF0F0` | Page background so white cards read without borders. | Unchanged. |
| White cards | `--panel` | KPI cards, chart card, list panels, limits strip. | Unchanged. |
| Teal tint `#F1F6F7` | `--surface-tint` | Item cards inside a white panel ("Recent Interviews" rows), row hover. | `.sd-recent-row`, table / list row hover. |
| Near-black ink | `--ink` | Headings and big numbers. | Unchanged. |

**Rules that come out of the reference**
1. One orange **action** per view; other buttons are white (on teal), outline or teal.
2. Orange text means "look here" (needs focus, limit used, missing). Normal notes stay teal.
3. Green only for progress / improvement; red only for errors. Low scores are **orange** (needs focus), not red.
4. Teal is for big surfaces and labels; never orange or green surfaces larger than a button, pill or bar.
5. Categorical hues only inside a list of like items (skills, subjects, series), with the soft disc + bar + % in the same hue.
6. **One orange only: `#F5821F`.** Never use Amber 700 `#AC5B16` (or Amber 600 `#CE6D1A`) in product UI. Never put small orange text on teal.

Login (`/auth/login`, portal login wrappers, forgot / reset) is **frozen**: it gets tokens only; a guard block at the end of `quirri-design.css` keeps its pill button and type. Do not restyle until the owner unfreezes.

---

## 0d. Selected filters and tabs = neutral block, no colour (owner, 15 Oct 2026)

Every selected filter segment, status chip, view toggle, semester chip uses a plain grey block: `--select` `#DEE0E1`
fill with ink text (`--select-on`), Medium weight; hover `--select-hover`. The active underline tab is ink text with an ink
underline (`--select-line`). No orange, no green, no teal for selection. Orange stays for the one main action per view only.

## 0c. Data colour + module structure (owner, 14 Oct 2026 — supersedes §0b rule 5 for data)

The owner asked for "a little colour" on data and real module structure. There is **no product Figma**;
the Student portal is the visual reference for the admin and staff portals.

**Data may use the categorical set everywhere** — chart series, bar lists, distributions, score bands,
rankings and KPI icon tiles. Buttons, status pills, links and navigation keep teal + orange only.

| Role | Colours | Token | Component (`src/components/shared/data-viz.jsx`) |
|---|---|---|---|
| Series (one hue per item / series, fixed order) | blue, green, orange, purple, cyan, teal | `--cat-1…6` · `dataColor(i \| key)` | `BarList`, `ColumnChart`, `TrendChart`, `DonutChart`, `Legend` |
| Score band | strong ≥ 80 green · on track 60–79 **blue** · needs focus < 60 orange · no data **teal** | `--band-strong/ok/focus/none` (+ `-soft`, `-text`) · `bandFor()` · `getScoreColor()` | `BandPill`, `ScoreMeter`, `BarList colorBy="band"`, `Distribution` |
| Rank | 1 orange · 2 blue · 3 purple · rest teal tint | `--rank-1…3` | `RankList` |
| KPI icon tiles | cycle `--cat-1…6` soft disc + hue | — | `KpiRow` / `.stats` (automatic, `data-viz.css`) |

Rules: a subject / department keeps the same colour on every page (`dataColor(id)` hashes a stable key);
red stays for errors only; never colour alone — every visual has a number, label or legend.

**Module structure.** A module with more than one job gets tabs: in-page `TabNav` + `TabPanel` with the
tab in `?tab=` via `useTabParam` (hooks/useUrlState.js), or route sub-pages via `ModuleTabs` when each
tab is a full page. Every list has a filter bar (search + the selects that matter + status chips + Clear).
Plan and per-role specs: `docs/agent/REDESIGN_PLAN.md`, `docs/agent/redesign/*.md`.

---

## 1. Brand foundation (PDF, summarised)

- Positioning: *AI that helps people prove what they're capable of.* Pillars: practice over pressure · evidence over assumption · clarity over cleverness · everyone, not a few.
- Voice: warm, plain, encouraging, grounded. Sentence case. Short sentences. No hype, no pressure, no guarantees, no jargon. Sign-off **Team Quirri**.
- Mix: **60% neutral/white · 30% teal · 10% orange.** One orange action per view. Green is reserved for progress and the categorical hues (§0b) for skill / subject / series coding only — no other accents. No gradients across brand colours (a soft single-hue area fill under a chart line is fine). No hand-mixed tints.
- Accessibility wins over appearance: WCAG 2.2 AA, 2px Teal 500 focus outline, 44×44 touch targets, never colour alone.

---

## 2. Tokens (CSS variables — never hard-code hex in components)

### Colour

| Token | Hex | Use |
|---|---|---|
| `--teal-500` (`--teal`) | `#0E5C6B` | Banners, summary headers, filter bar, active nav text, links, icons, secondary solid buttons |
| `--teal-50` / `-100` / `-200` / `-300` / `-400` | `#F1F5F6` `#DDE8EA` `#B7CED3` `#86AEB5` `#4D8691` | Active nav fill / selected chip, focus ring, text on teal, muted text on teal, Clear button on filter bar |
| `--teal-600` … `--teal-900` | `#0B4B58` → `#06252B` | Hover of teal buttons; video stages only |
| `--accent` (alias `--amber`, Tailwind `amber-700`) | `#F5821F` | **The** primary CTA fill (white Medium label), banner overline, icon tiles. (Selected tabs / filters are a neutral block `--select`, 15 Oct 2026.) |
| `--accent-hover` / `--accent-press` | `#E5731A` / `#D2650F` | CTA hover / pressed only |
| `--accent-text` | `#F5821F` | Orange text on white (needs-focus values, counts used) |
| `--accent-soft` / `--accent-line` | `#FEF6EF` / 28% amber | Orange icon tiles, selected list item fill / border |
| `--progress` / `--progress-text` / `--progress-soft` | `#5CB414` / `#46921A` / `#EEF7E6` | Positive progress rings and bars, improving scores |
| `--cat-1` … `--cat-6` (+ `-soft`, `-text`) | `#2C74E0` `#54B058` `#F5821F` `#6C3CD8` `#23B6B9` `#0E5C6B` | Skill / subject / series coding only |
| `--surface-brand` / `--surface-tint` | `#0E5C6B` / `#F1F6F7` | Solid teal panels / item cards inside a white panel |
| `--on-brand` (`-muted`, `-line`, `-raised`) | white, 78% / 18% / 8% white | Text, dividers, ring tracks, inset rows on teal |
| `--amber-700` / `--amber-600` | `#AC5B16` / `#CE6D1A` | **Frozen login card only.** Never in product UI. |
| `--highlight` (= `--amber-500`) / `--highlight-soft` | `#F5821F` / 14% | **Accent only:** chart points, notification / live dots, focus rings and bars, title rule. Never behind white text. |
| `--amber-50` / `-100` / `-200` | `#FEF6EF` `#FDE8D7` `#FBD0AA` | Warning / "open" pill fill, highlight rows |
| `--canvas` | `#EEF0F0` | App background |
| `--neutral-0` (`--panel`) | `#FFFFFF` | Cards, sidebar, inputs |
| `--neutral-50` (`--mist`) | `#F8F8F9` | Table header, modal footer, inner wells |
| `--neutral-200` (`--line`) | `#DEE0E1` | 1px borders, dividers |
| `--neutral-300` | `#BCC1C3` | Tab rail, stronger dividers |
| `--neutral-500` (`--muted-2`) | `#707A7E` | Subtitles, captions, overlines (AA on white) |
| `--neutral-600` (`--ink-2`, `--muted`) | `#536064` | Secondary text, KPI labels, table header text |
| `--neutral-900` (`--ink`) | `#102228` | Body and headings. Never pure black. |
| `--color-success` / `--color-warning` / `--color-error` | `#0F6E56` / `#C97A0E` / `#A32D2D` | System feedback only |
| `--success-soft` / `--warning-soft` / `--error-soft` | `#E9F5EF` / `#FDF1E2` / `#FBEEEC` | Status pill and notice fills (the only allowed derived tints) |
| `--success-line` / `--warning-line` / `--error-line` | 24% alpha of the semantic colour | Notice / danger-button borders |

Neutral 400 `#939C9E` is for placeholders and disabled labels only — it fails AA for real text.

### 2b. Accent rules (teal + orange + green) — reference palette

| Element | Teal | Orange `#F5821F` — `--accent` (white text, words) · `--highlight` (small marks) | Green / categorical |
|---|---|---|---|
| Hero banner | solid fill, white text | overline pill, icon tile, the ONE primary CTA | — |
| Insight side panel (`.q-hero-side`, `.sd-focus`) | **solid teal** like "Top Improvement Areas"; white title, white bullets, translucent inset rows | warning bullet dots, badge | — |
| Score panel (`.sd-scores`) | solid teal, translucent ring track | focus ring (Signal Amber) | progress ring |
| KPI cards | odd: Teal 50 icon tile; sub-text always teal | even: orange-soft icon tile; orange **value** only when it needs focus | improving delta (`.s.up`) |
| Info / limits strip | label + link | used counts, label icon, progress bar | — |
| Selected segmented tab / view toggle / filter chip | — | — | **neutral grey block `--select` + ink text** (owner, 15 Oct 2026) |
| Underline tab | active label | — | ink label + 2px ink underline `--select-line`; neutral count badge |
| Sidebar active item | Teal 50 fill + teal label + teal icon | — | — |
| Card / panel / drawer section titles | — | 4px Signal Amber rule before the title | — |
| Card grid monograms, stat boxes, table avatars | odd | even (orange-soft + orange-text) | — |
| Selected list item | — | orange-soft fill + orange line | — |
| Item cards inside a panel, row hover | teal tint `--surface-tint`, teal score | — | strong score in green |
| Charts | line + soft area | markers (Signal Amber) | series in categorical order |
| Skill / subject / dimension lists | — | weak item bar (Signal Amber) | one categorical hue per item: round soft disc icon, bar, % |
| Buttons | secondary solid `.sd-btn--teal` / `.btn-dark`; white `.btn-light` on teal | the ONE primary `.sd-btn--amber` / `.btn-primary` | — |
| Scores (`getScoreColor`) | 60–79 on track | < 60 needs focus | ≥ 80 strong |

Never: orange or green surfaces larger than a button / pill / bar · small orange text on teal · categorical hues for status or actions · two orange *action* buttons in one view · red for a low score (use orange). New components follow this table instead of adding colours.

### Type — Poppins only (300 / 400 / 500 / 700)

| Role | Size / line | Weight | Where |
|---|---|---|---|
| Display XL / L | 56/60, 44/50 | 700 | Marketing only |
| H1 | 36/44 | 700 | Rare (big result numbers) |
| H2 | 28/36 | 700 | Banner title ("Welcome back, Nirmal!") |
| H3 | 22/30 | 500 | **Page title** (`.topbar h1`), KPI value |
| H4 | 18/26 | 500 | Card / panel / modal titles, section heads |
| Body | 16/26 | 400 | Banner body, row-card titles |
| Body S | 14/22 | 400 / 500 | Default UI text, table cells, labels (500), KPI label and note |
| Caption | 12/18 | 400 / 500 | Meta, hints, errors, table header, pills |
| Overline | 11/16 +8% UPPERCASE | 500 | Nav group labels, banner eyebrow, summary tile labels |
| Button | 15/20 +1% | 500 | All buttons (14/20 for `.btn-sm`) |

- **Bold (700) only for H2 and larger.** Everything else is 400 or 500 — two weights per view. `b`, `strong`, `th`, `h1–h6` default to 500 inside `.q-app-shell`.
- Never 600 or 800 (not loaded — the browser fakes them). Never sizes off this scale (no 10.5, 11.5, 12.5, 13, 13.5, 14.5, 17…).
- Below 768px: page title 18/26, H2 22/30, inputs 16px.
- Sentence case everywhere; uppercase only for overlines. Left-aligned, ragged right. Centre only buttons, badges, short card labels.
- Dates `22 July 2026` (short: `5 Oct 2026`), time `9:00 am`, currency `₹1,20,000`, en dash for ranges.

### Spacing, radius, elevation

- Spacing scale only: **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96** (`--space-1…9`).
- Radius: `--radius-control` 6px · `--radius-card` 8px · `--radius-panel` 16px · `--radius-full` pills/avatars/progress.
- Shadows (Ink alpha only): `--shadow-1` `0 1px 2px rgba(16,34,40,.06)` · `--shadow-2` `0 4px 12px rgba(16,34,40,.08)` · `--shadow-3` `0 12px 32px rgba(16,34,40,.12)`.
  `--shadow-card` = 1 + 2 (every white card). Hover on clickable cards = 1 + 3. Modals = 3.
- Borders: 1px `--line` on light, `rgba(255,255,255,.2)` dividers on teal. Cards on the canvas are **borderless** (shadow only). A card nested inside a card gets a 1px line and no shadow.
- Motion: 200ms ease-out in, 150ms out, no bounce, no infinite loops (loading skeletons excepted), `prefers-reduced-motion` honoured. No hover lift (`translateY`) — change shadow only.
- Icons: outline, 1.75px stroke, 20px in nav, 16–18px inline, Teal 500. Never mix filled and outline.

---

## 3. Layout

- **Shell:** white sidebar 264px (72px collapsed) + canvas. Main column content max-width **1440px**, centred, 32px side gutters (16px on mobile).
- **Page header** (`.topbar`): H3 title + Body S subtitle on the left; `.topbar-right` on the right holds lifted page actions (QuirriSelect 44px) then the 44px Alerts bell, 12px gap, `align-items: center`. 32px top, 24px below. Sticky on the canvas so the inbox panel can drop from the bell. Never stretch `.topbar-right` with `flex: 1`.
- **Vertical rhythm:** 24px between page sections and between grid cards (16px on mobile). 16px inside dense groups.
- **Grids:** dashboards use `minmax(0,2fr) minmax(0,1fr)` for hero + side panel; KPI rows 4 (or 3/5) equal columns; two-column content `cols`/`cols a`. Never fixed pixel widths that overflow at 1280px.
- **Cards:** full width of their column. Dashboard pages only (`.sa-dash` / `.ad-dash` / `.fa-dash`) use one `2fr + 1fr` page grid so hero, KPI strip and card pairs share the same left/right edges; paired cards in a row share a bottom edge. Other module pages (Video review, lists, forms) stay a single column. Classroom / tutor / form splits stay `align-items: start` so short lists do not balloon.
- Left-weighted layouts, one idea per view, primary action top-right of its section or bottom-right of a form.

---

## 4. Components (Prep pattern → class)

| Prep pattern | Class / component | Spec |
|---|---|---|
| **Sidebar** | `.sidebar` `.brand` `.tenant-box` `.nav` `.nav-label` `.side-foot` `.who` | Logo, 1px divider (24px inset). Nav items 44px min, 15/22 Regular Ink, 20px icons, 6px radius, 4px apart. **Active: Teal 50 fill + Teal 500 label, Medium, no edge bar.** Hover: Mist + Teal label. Group labels = overline Neutral 500. Footer: divider then **user card** (white, 1px line, shadow 1+2, 6px) with 40px Teal 500 avatar (white initials), name 15 Medium, role/email 12 Neutral 500. SA / CA / Faculty: logout icon button. Student: the card is the **Account menu** trigger — teal chevron (opens upward; collapsed rail uses a small chevron badge on the avatar and opens the menu to the right), Teal 50 when open, menu items with 18px teal icons, current page Teal 50, Sign out separated with the logout icon. |
| **Page header** | `.topbar` (layouts) · `SystemNotificationBell` | see §3. Same recipe on Super Admin, College Admin, Faculty, and Student. Title from each portal's `pageMeta.js`. `.topbar-right` is a non-growing row: optional `.pm-topbar-slot` (date range / page actions) + 44px Alerts bell, 12px gap, vertically centred with the title block, `justify-content: flex-end`. Bell: Teal icon, `--highlight` unread dot, Quirri tip (never native `title`). Panel is a white 8px card (`--shadow-md`) anchored `top: calc(100% + 8px); right: 0` under the bell at 1440 and 390 — not a viewport overlay. |
| **Alert inbox** | `SystemNotificationInbox` | Bell = `GET /notifications/inbox` (+ unread-count, mark-read). Email history = `GET /notifications/mine`. Same 15 catalogue events. Open link uses `src/lib/notifications/scenarios.js`. |
| **Welcome banner** | `PortalHero` → `.banner`, `.sd-hero`, `.sp-banner`, `.un-banner` | Solid Teal 500, 8px, 32px padding. Optional overline pill (orange). H2 white Bold. Body 16/26 Teal 50, ≤60ch. CTA row: **white secondary (`.btn-light`) then one orange primary**. Illustration right, decorative only. No gradients or glows. |
| **Side panel** | `PortalHero` side → `.q-hero-side`, `.sd-focus` | Solid Teal 500 (reference "Top Improvement Areas"), 24px, white title with divider, short bullet list (white dots, 78% white body), inset rows `--on-brand-raised`. |
| **KPI card** | `.stat` (`.k` `.v` `.s`), `.sd-kpi`, `Kpi` | White, 16px padding, borderless. Row 1: 18px Teal icon + label (14 Neutral 600). Value H3 22/30 Medium Ink. Note 14 Teal 500. Orange (`--accent-text`) only for a "needs focus" value. |
| **Info strip** | `.sd-limits` | White card, one row: teal label with orange icon, orange used counts, orange progress bar, segments separated by vertical dividers, right-aligned link with arrow. |
| **Score panel** | `.sd-scores` | Teal 500 card with ring charts (track `--on-brand-line`, fill `--progress` or `--accent`), explanation box `rgba(255,255,255,.1)`. |
| **Segmented tabs** | `.seg` / `.seg-btn`, `.sp-tabs` / `.sp-tab` | Prep score tabs: white tiles, active **orange `--accent` + white**. In-page view switchers (`.sp-tabs`): white track, active Teal 500 + white, 6px items. |
| **Underline tabs** | `.tabs` / `.tab` | 15/22, inactive Neutral 500, active Teal 500 Medium + 2px Teal underline, rail 1px Neutral 300. |
| **Filter bar** | `.toolbar` (`.toolbar.is-light` inside cards) · `.un-toolbar` · `.pm-filterbar` | Teal 500, 8px, 16px padding, 16px gaps. Search input Teal 50 fill (white on focus) with Teal icon; selects white, no border, 6px; "All …" values read as Ink. Clear = Teal 400 white text; Search / primary = orange. Dense bars (notifications): wrap each control in `FilterField` with a 12/18 white caption (Search, Event, Channel, Period, Status) so the row is readable; status segs sit on their own full-width row. |
| **Mini stats** | `.ministats` | Right of a section head: value Teal 500 14 Medium over 12 caption, divided by 1px Neutral 300. |
| **Row card list** | `.rowcard`, `.sd-recent-row` | Each row its own white card (8px, shadow card), 20px 24px padding: index (Teal 500) + title (16 Regular) · type with dot + date (12) · score + band · 32px round chevron. Whole row clickable, hover shadow 1+3. |
| **Table** | `table` inside `.card` | Header Mist fill, 12/18 Medium Neutral 600, sentence case (never uppercase). Cells 14/22, 16px 24px padding, 1px Neutral 100 dividers, hover Mist. Numbers right-aligned `.num` tabular. |
| **Status pill** | `.pill.green/.amber/.red/.teal/.grey`, `.sp-pill`, `.sd-band` | Full radius, 12/18 Medium, soft fill + semantic text, no dot (add `.dot` only when status needs it). Open/pending = amber 50 + amber 700. Resolved/active = success soft + success. |
| **Stepper form** | (pattern) | 48px circles: current Teal 500 white number, upcoming Neutral 200 grey number, connector 2px with Teal progress. "Fields marked with * are required." caption. Next = `.btn-dark` with arrow, bottom-right. |
| **Summary panel** | `.summary` (`__h` `__tiles` `__tile` `__b` `__row`) | Teal 500 header (H4 + Teal 50 body) with two white stat tiles (overline label + 22 Teal value). Below: label/value rows with dividers; a Teal 50 "ready" box; full-width primary CTA. |
| **Choice chips** | `.choice` | 44px, 1px line, 6px. Selected: Teal 50 fill, Teal 500 border + label. |
| **Form field** | `QuirriRHFField` → `.field` | Label 14/22 Medium Ink above; control 44px, 6px, 1px Neutral 200, 15px text, placeholder Neutral 400; focus Teal 500 border + 3px Teal 100 ring; hint/error 12/18 below. Two-column grid (`grid2`) on desktop. Locked fields: Neutral 100 fill + lock caption. |
| **Select / combobox** | `QuirriSelect`, `QuirriCombobox` | Same trigger as inputs; menu white, 8px, shadow 1+2, 4px padding, options 14px with 6px radius; selected Teal 50 + Teal label + check. Never native menus. |
| **Buttons** | `.btn` + `-primary / -dark / -outline / -ghost / -light / -quiet / -danger / -warn` | 44px (40px `.btn-sm`), 6px, 15/20 Medium, 24px side padding, 8px icon gap. One `.btn-primary` per view. Disabled: Neutral 200 fill, Neutral 400 label. |
| **Notice** | `.notice.info/.warn/.err/.ok`, `.q-note`, `SectionState` | 6px, 12px 16px, 14/22. Info = Teal 50; others semantic soft + line. Title line Medium. |
| **Help / topic card** | `.topic` | White card, 20px, title 15 Medium + 12 caption, round Amber 500 go button with Ink chevron. Grid of 3. |
| **Modal / drawer** | `QuirriModal` → `.overlay` `.modal`; side drawers `.un-drawer` | 16px radius, shadow 3, header H4 + 36px close button, 24px body, Mist footer with actions right (secondary then primary). Drawers: full-height right sheet, Teal 500 hero header, Mist body, white footer. Overlay `rgba(16,34,40,.48)`. |
| **Empty / loading / error** | `.empty`, `SectionState`, `AdminEmptyModule` | Teal 300 outline icon, H4 title, Body S line ≤48ch, one action. Never fake numbers. |
| **Charts** | `PerformanceChart` | Teal 500 line, Amber 500 points, dashed Neutral 100 grid, 12px axis labels, single-series tooltip card (white, shadow 3). |

Legacy aliases (`--blue`, `--violet`, `--sky`, `.pill.blue`) all resolve to teal — do not add new uses.

---

## 4a. Module page recipe v2 (owner, 14 Oct 2026 — replaces 4b for module pages)

Audits found every page stacking topbar title → teal banner with the same title → KPI row → teal filter
band → one panel, which reads as a template. Module pages now follow this:

```
<ModulePage>
  <ModuleHead lede="one line: what this page is for" chips={<HeadChip>scope</HeadChip>} actions={ONE orange .sd-btn--amber} />
  <ModuleTabs tabs=[…route sub-pages] />   or   <TabNav/> + <TabPanel/> with useTabParam (?tab=)
  per tab:
    KpiRow only when the numbers are not already on the tabs / panel (3–4 max, coloured icon tiles automatic)
    .dv-grid of <Panel> with data visuals (BarList, RankList, Distribution, DonutChart, ColumnChart, TrendChart)
    <Panel title action toolbar={search + selects + Clear}> <table className="sp-table"/> <Pager/> </Panel>
  drawers / modals as in 4b
</ModulePage>
```

- No `ModuleBanner` on module pages; the teal hero (`PortalHero`) stays on dashboards / student home only.
- One tab system per page. Tab counts replace duplicate KPI cards.
- Scope is said once (a `HeadChip`), not in a notice card + banner + lede.
- The top bar already shows the page subtitle (`PAGE_META`); a `ModuleHead` lede is only for something the subtitle does not say. Otherwise ModuleHead carries chips + actions only.
- Loading = skeleton / "Loading…" state, never fallback CTAs or "nothing yet" copy before data arrives.
- Data colour roles: §0c.

## 4b. Module page recipe (every list / management page, all portals)

Kit: `src/components/shared/module-ui.jsx` (+ `portal-modules.css`, `.sp-*`, `.un-*`, all global). Reference implementations: `app/superadmin/universities/page.jsx`, `app/superadmin/colleges/page.jsx`.

```
<ModulePage>
  <ModuleBanner icon eyebrow title lede chips actions={ONE orange .sd-btn--amber} />
  <KpiRow items=[{icon,label,value,sub}] />          // 3–4 live numbers, '—' when unknown
  <FilterBar> <SearchBox/> <QuirriSelect/> <SegTabs/> <ViewToggle/> </FilterBar>
  {error  → <SectionState tone="err" action={Try again}/>}
  {loading→ <SectionState title="Loading …"/>}
  {empty  → <SectionState title action={first-item CTA}/>}
  grid → .pm-grid / .un-grid of .un-card     list → <Panel><table className="sp-table">
  <Pager/>
  <DetailDrawer eyebrow title mono pills stats footer> <DrawerSection> <InfoList/> … </DetailDrawer>
  <QuirriModal> forms: <FormSection n title sub> + QuirriRHFField / QuirriSelect / IndiaLocationFields
  confirm: <QuirriModal> + <ConfirmNote danger/>
</ModulePage>
```

- Not-live modules: `AdminEmptyModule` → `ComingSoon` hero + up to 3 `steps` describing what will appear. Never sample numbers.
- Dashboards: `PortalHero` (banner + side panel) → `.stats` / `KpiRow` → info strip / notices → `cols` of `.card` / `Panel`.
- Settings: underline `.tabs` → `.pm-settings` grid (account card left, side card right).
- Row actions: `View` (`.sd-btn--ghost .sd-btn--sm`) + `IconButton` edit / lock / refresh. Destructive = soft delete with `ConfirmNote danger`.
- Buttons inside modules use `.sd-btn` variants: `--amber` (the one primary), `--teal` (secondary solid), `--outline`, `--ghost`, `--danger`, `--sm`.

## 5. Copy & content

- Page titles: noun phrases in sentence case ("My reports", "Platform users"). Subtitles: **one** short factual line in the top bar (`PAGE_META`). Do not repeat it in a hero paragraph, ModuleHead lede, card `sub`, or KPI caption.
- Card titles name the data. Drop `sub` unless it is a live count the title does not already say. No “last 30 days” on cards when a range control exists. No `Analytics →` / `View details` on every card — sidebar and one page CTA are enough.
- KPI captions only when they **change** the number (“2 invites left”). Never “Asked to the AI tutor” or “Everyone invited has activated”.
- Buttons: verb first ("Add students", "Save changes"). One orange action per view.
- Empty states: one line (“No one flagged.”). Do not lecture.
- Never plan / licence / subscription / pricing language in this product (`quirri-no-plans.mdc`), even though Prep shows plans.
- India-only location formats; Indian number grouping (`toLocaleString('en-IN')`).

---

## 6. BEFORE building any UI (checklist)

```
□ Read this file §0 overrides + the component row(s) you need (§4). Do not invent a new pattern if one exists.
□ Reuse: PortalHero · .stat/.sd-kpi · .card · .toolbar · .tabs/.seg · .rowcard · .summary · .pill · QuirriSelect/Combobox · QuirriRHFField · QuirriModal · SectionState/AdminEmptyModule.
□ Pick tokens, not hex. Use the §0b roles: teal = structure, orange = action/focus, green = progress, cat-1…6 = skill/subject/series. No other colours, no gradients.
□ Decide the ONE orange action for the view. Everything else is dark / light / ghost / quiet.
□ Plan the layout on the 1440 max grid with 24px gaps; check 1280, 768 and 390 widths.
□ Type: only scale sizes; Bold only ≥28px; 500 for titles/labels; 400 for body.
□ Login screens? → frozen. Tokens only.
```

## 7. AFTER building (checklist — required before reporting done)

```
□ Grep the diff: no raw hex outside tokens · no font-weight 600/800 · no off-scale font-size · no border-radius other than 6/8/16/full · no linear/radial-gradient on brand colours · no translateY hover · no title= tooltips.
□ Exactly one .btn-primary (orange `--accent`) visible per view. Orange text only for "needs focus"; green only for progress.
□ Cards borderless on the canvas with --shadow-card; nested cards use a 1px line.
□ Headers sentence case (tables too); left-aligned text; numbers right-aligned.
□ Playwright screenshots at 1440 and 390 (and collapsed sidebar for shell changes): alignment of card edges, equal gaps, no horizontal scroll, no clipped text.
□ Focus visible (2px Teal 500), 44px targets, AA contrast (Neutral 500+ for text).
□ Empty / loading / error states render without fake data.
□ Update this file if you introduce or change a shared pattern.
```

---

## 8. File map

| Need | File |
|---|---|
| Tokens, shell, shared components | `src/styles/quirri-design.css` |
| Student module + reusable `.sd-` / `.sp-` primitives | `src/styles/student-portal.css` |
| Student Dashboard + My progress (owner mock-ups Oct 2026: next-step hero, semester summary, learning workspace, study focus, learning activity, insights) | `src/styles/student-dashboard.css` (`.sh-*`), imported by those two pages |
| Student learning flow (My subjects = subject overview: summary strip, one recommended next step, chapters table with lecture + assessment status and per-row actions, "How learning works" modal; classroom, AI tutor, assessment take / results / review — owner mock-ups Oct 2026) | `src/styles/student-learning.css` (`.sl-*`, overview `.sl-ov-*`) + `src/lib/student/learning.js` (routes in the query string: `s` picks the overview subject, `subject` + `chapter` open the classroom, `tab`, `view`, `filter`) |
| Student My progress (Overview + Details tabs — owner mock-ups Oct 2026: KPI strip, learning record, recommended next step, interview strip; per-subject completion/performance, chapter table, chronological learning record, assessment review) | `src/styles/student-progress.css` (`.spg-*` — `.sp-*` is taken by student-portal.css). Tab + subject in the query string (`?tab=details&subject=…`). |
| Student interview flow (3-step Start Interview wizard + Interview Summary, waiting room → interview room — owner mock-ups Oct 2026; connection order per the Quirri interview flow guide) | `src/styles/student-interview.css` (`.siv-*`), imported by `interviews/InterviewsClient.jsx` and `interviews/live/page.jsx`. Guidelines show only before the first interview (`pk_hide_interview_dos_donts_v2` or any past report). Remote audio stays muted until the room latch; abort only from the waiting room. |
| Student Reports module (own sidebar item — owner reference = Quirri Prep "My Reports", Oct 2026: teal filter bar + row cards + Total/Average/Highest; report = teal hero with score ring and the ONE orange "Retake interview", highlight tiles, recording + audio recap, skill breakdown (cat-1…6), question feedback table + CSV for Excel, key insights, share score card, action plan, try again) | `src/styles/student-reports.css` (`.srp-*`) + `src/components/student/reports/*` + `app/student/(portal)/reports/page.jsx` (list, filters in the query string) and `reports/view/page.jsx` (`?session=`). Helpers in `src/lib/student/interviewReport.js` (`reportHref`, `REPORT_SKILLS`, score bands 75/50). Old `/student/interviews/report(s)` routes redirect here. |
| Super Admin universities / colleges | `src/styles/superadmin-universities.css`, `superadmin-colleges.css` |
| Tailwind theme (legacy utility classes are remapped to tokens) | `tailwind.config.js` |
| Hero | `src/components/shared/PortalHero.jsx` |
| Module page kit (banner, KPIs, filter bar, drawer, forms, coming-soon) | `src/components/shared/module-ui.jsx` + `src/styles/portal-modules.css` (`.pm-*`) |
| Not-live module frame | `src/components/admin/AdminEmptyModule.jsx` (→ `ComingSoon`) |
| Reference palette layer (loaded last) | `src/styles/quirri-accents.css` |
| Palette constants for JS (charts, SVG) | `src/lib/constants/theme.js` (`BRAND_CTA`, `PROGRESS`, `CATEGORY`) |
| Portal-specific additions | `portal-superadmin.css` (`.sa-*`) · `portal-admin.css` (`.ad-*`) · `portal-faculty.css` (`.fa-*`, also review editors) |
| Global CSS load order | `src/app/layout.js` imports every stylesheet above once — do not import them per page |
| Sidebars | `SuperAdminSidebar.jsx`, `CollegeAdminSidebar.jsx`, `RolePortalSidebar.jsx` (Faculty + Student) |
| Page titles | `src/lib/{superadmin,admin,faculty,student}/pageMeta.js` |
| Student icons / states / KPI | `src/components/student/ui.jsx` |
| SA phone nav drawer | `src/app/superadmin/layout.jsx` (`.sa-shell`, `.sa-menu-btn`, `.sa-scrim` in `portal-superadmin.css`) — ≤860px; other portals still lack it |
| SA score cell / live stamp | `src/components/superadmin/ScoreCell.jsx` (75/50 bands, never red), `useLiveRefresh` + `useTimeAgo` → `Live · …` chip |
| Neutral state pill | `.sp-pill--off` (portal-superadmin.css) — inactive / deactivated / not wired; red `sp-pill--err` only for real failures |
| Profile hydration | `src/hooks/useHydrateProfile.js` — loads `/auth/me` when the store has no user (Student + SA layouts); never show placeholder emails |
| Esc layering | Dropdowns (`QuirriSelect`/`QuirriCombobox`) listen in capture phase + `preventDefault`; modals/drawers ignore a handled Escape, drawers yield to an open `.overlay .modal` |
| SA reports | `GET /reports/preview` returns `columns` [{key,label,kind}] per report type; table + CSV/XLSX/PDF render from them |
| SA academic structure | `src/app/superadmin/academics/page.jsx` (`.sa-acad-*` in portal-superadmin.css), `src/lib/api/superadmin/academics.js`, schemas `src/lib/validation/schemas/academics.js` |
| Content chapter link | `EduVideoContentStudio` optional Programme > Semester > Subject > Chapter picker (`.ad-chapter-link`), title locked to the chapter |
| Notifications page | email-only catalogue state pills + deliveries table (status SegTabs, event filter, search, Pager); Retry only when failures exist; WhatsApp hidden. Bell polls `GET /notifications/inbox/unread-count`; panel/list from `GET /notifications/inbox`; mark read on row open. `/notifications/mine` is email history, not the bell. |
| StatusPill default | inactive = neutral `sp-pill--off` (never red) |
