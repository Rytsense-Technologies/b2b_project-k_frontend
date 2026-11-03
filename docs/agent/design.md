# design.md — Brand & UI (compressed)

> **Load when:** any visual, layout, copy, or component chrome change.
> **Full spec (read the rows you need):** [`design-system.md`](./design-system.md) — Brand Guidelines v1.0 + Quirri Prep patterns + owner overrides.
> Rule: `.cursor/rules/quirri-design-system.mdc` (always apply) · Brand: `.cursor/rules/quirri-brand-guidelines.mdc`

## Owner overrides (Oct 2026 — settled, do not re-ask)

- Primary CTA **Quirri orange `#F5821F`** (`--accent`) + white Medium label — **one per view**. `#AC5B16` is never used in product UI (login card only, frozen).
- Shape: **6px** buttons/inputs/selects/chips/nav · **8px** cards/banners/filter bars · **16px** modals/drawers · full radius only for pills/avatars/progress.
- Canvas **Neutral 100 `#EEF0F0`** (`--canvas`); white borderless cards with `--shadow-card`; Mist `#F8F8F9` for inner wells.
- **White** sidebar · Teal 50 active fill + Teal 500 label · no edge bar · bordered user card at the bottom.
- Solid **Teal 500** banners, filter bars, summary headers — **no gradients**.
- **Reference palette:** Teal = structure (solid hero, side and score panels, labels, links) · Orange = action + focus (CTA, active tab, needs-focus values, markers, title rules) · Green = progress · `--cat-1…6` = skill / subject / series hues (`quirri-accents.css`, `design-system.md` §0b + §2b).

## Tokens (CSS vars from `quirri-design.css`)

| Token | Hex | Use |
|-------|-----|-----|
| `--teal-500` | `#0E5C6B` | Banners, filter bar, active nav, links, icons, `.btn-dark` |
| `--teal-50` / `--teal-100` | `#F1F5F6` / `#DDE8EA` | Active nav / selected chip · focus ring |
| `--accent` | `#F5821F` | Primary CTA (white label), active tab, selected pill |
| `--accent-text` | `#F5821F` | Orange words on white |
| `--progress` | `#5CB414` | Progress rings / bars |
| `--cat-1…6` | `#2C74E0` `#54B058` `#F5821F` `#6C3CD8` `#23B6B9` `#0E5C6B` | Skill / subject / series coding |
| `--highlight` (= `--amber-500`) | `#F5821F` | Accent only: chart points, dots, focus bars / rings, title rule — never behind white text |
| `--canvas` | `#EEF0F0` | App background |
| `--mist` | `#F8F8F9` | Table header, modal footer, wells |
| `--ink` | `#102228` | Text |
| `--neutral-500/600` | `#707A7E` / `#536064` | Subtitles / labels |

Type: **Poppins** 400/500 in product (700 only ≥28px). Scale: 28/36 · 22/30 · 18/26 · 16/26 · 14/22 · 12/18 · 11/16 overline · 15/20 button. Never 600/800 or off-scale sizes.
Spacing: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Page gaps 24px; content max 1440px; gutters 32px (16px mobile).

## Shell (post-login)

Sidebar 264px (72 collapsed) → page header (`.topbar`: 22/30 Medium title + 14/22 subtitle on the left; `.topbar-right` on the right) → `.content`.
`.topbar-right` is a non-growing row (`flex: 0 0 auto`, 12px gap, 44px bell + 44px lifted select, `align-items: center`). Inbox panel drops from the bell (`absolute; top: calc(100% + 8px); right: 0`) — never a fixed overlay. Skill: `.cursor/skills/quirri-portal-chrome/SKILL.md`.
Pages compose: `PortalHero` → KPI row (`.stat`) → info strip → cards / tables / row cards.

## Login (frozen)

Centered Quirri card on Mist — “Welcome back” / “Sign in to Quirri” — Amber 700 pill Sign in. Guard block at the end of `quirri-design.css` keeps it unchanged. Do **not** restyle.

## Components to reuse

| Need | Use |
|------|-----|
| Hero + side panel | `PortalHero` |
| KPI | `.stat` / `Kpi` (`.sd-kpi`) |
| Filters | `.toolbar` (teal) · `.toolbar.is-light` in cards |
| Tabs | `.tabs/.tab` (underline) · `.seg` (score tiles) · `.sp-tabs` (view switch) |
| Lists | `.rowcard` · `table` in `.card` |
| Summary | `.summary` |
| Status | `.pill.*` |
| Select | `QuirriSelect` · `QuirriCombobox` |
| Form field | `QuirriRHFField` / `QuirriControlledField` |
| Modal | `QuirriModal` |
| Tip | `useQuirriTip` / `QuirriTooltip` |
| India address | `IndiaLocationFields` |
| Empty module (no API) | `AdminEmptyModule` + epic note |

## Verify UI

Playwright: log into the affected portal → screenshot 1440 + 390 (+ collapsed sidebar for shell work) → check edges, equal gaps, one orange CTA, no overflow. Run the AFTER checklist in `design-system.md` §7.

## Forbidden

Purple/indigo/blue SaaS look (categorical hues only inside skill / subject lists) · brand gradients or glows · hover lift · native `title` tooltips · fake numbers · all-caps titles or table headers · font-weight 600/800 · off-scale sizes · pill buttons outside login · second accent colour · plan/licence copy · touching frozen login chrome

Next: `design-system.md` (detail) · `task.md`.
