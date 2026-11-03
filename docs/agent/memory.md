# memory.md — Persistent agent memory (token-optimized)

> **Load when:** starting a session, after edits, or when unsure where truth lives.  
> **Goal:** remember structure in the **graph**, not in the prompt.

## 1. Code Graph (primary memory)

| Command | When |
|---------|------|
| `graphify query "<q>" --budget 1500` | Every prompt / explore (mandatory) |
| `graphify path "<A>" "<B>"` | Dependency / impact |
| `graphify explain "<concept>"` | Neighborhood of one idea |
| `graphify update . --no-cluster` | **After every code change** (this repo) |
| `graphify update . --no-cluster` in `E:\b2b\b2b_projectk` | After backend code changes |
| `graphify query "…" --graph "E:/b2b/b2b_projectk/graphify-out/graph.json"` | API / model questions |
| `graphify global add <graph.json> --as <tag>` | After either graph rebuild, so `~/.graphify/global-graph.json` stays joined |
| `graphify extract . --no-cluster` | First-time / rebuild only |

Artifacts:

- `graphify-out/graph.json` — queryable memory  
- `graphify-out/GRAPH_REPORT.md` — broad review only (do not dump each turn)  
- `graphify-out/wiki/` — if present, navigate before free search  

Skill: `.cursor/skills/graphify/SKILL.md` · Rule: `.cursor/rules/graphify.mdc`

## 2. Hooks (automatic refresh)

`.cursor/hooks.json`:

| Hook | Script |
|------|--------|
| `sessionStart` | `graphify-session.js` |
| `beforeSubmitPrompt` | `graphify-prompt.js` |
| `afterFileEdit` | `graphify-update.js` |
| `stop` | `graphify-update.js` |

If hooks fail silently → run `graphify update . --no-cluster` yourself before finishing.

On this Windows machine **Application Control blocks `graphify.exe`**. Use `py -m graphify …` instead (package `graphifyy`). `.claude/settings.json` already calls the Python module. Cursor `.cursor/hooks/graphify-update.js` still spawns `graphify.exe` and may no-op — run the Python command yourself after edits.

Local agent reference (kept here, not in git):

- `.claude/settings.json` runs `graphify update . --no-cluster` after Edit/Write (async, 120s). `.claude/launch.json` is a local preview config.
- Claude session rule: slice `docs/agent/` only, graph before grep, read narrowly, Playwright steps under 20s, screenshots only for final 1440/390 checks.
- `.playwright-mcp/` holds local verification screenshots and exports. It is not product code. **Stashed** 26 Oct 2026 with preview/warm scripts and the local `quirri-design` skill (`git stash list`). Do not commit those.
- Local preview (also stashed): `scripts/preview.mjs` + `scripts/warm-routes.mjs` + package scripts `preview` / `warm`. `next.config.js` keeps `distDir: process.env.NEXT_DIST_DIR || '.next'` and `reactStrictMode: false` (owner, 26 Oct — stops doubled API calls in dev). Restore the stash if you need `npm run preview`.
- `.cursor/skills/quirri-design/SKILL.md` is a short overlay of `docs/agent/design-system.md`. Canonical design law stays in the agent pack; the skill file is local reference only.
- Backend graph: `E:/b2b/b2b_projectk/graphify-out/graph.json`. Global join: `C:\Users\Arun K\.graphify\global-graph.json` (`b2b_superAdmin_frontend` + `b2b_projectk`). Product facts the graph does not encode live in `prod.md` § Settled behavior.
- Product facts bundle: `docs/knowledge/index.md` (OKF v0.2 — roles, access rules, flows, tables, APIs, metrics; one concept per file). Read the one file you need. When those facts change, update the file and `docs/knowledge/log.md`, then run `node scripts/check-knowledge.mjs`. Claude Code entry (`CLAUDE.md` / `AGENTS.md`) now points at this bundle on purpose.

## 3. Semantic search protocol

1. Phrase the **user goal** as the graph query (not a filename guess)  
2. Take top symbol/file hits  
3. Grep/Read **only those paths**  
4. Stop when enough context to edit accurately  

This is **Semantic Code Search + Code Context Packing**.

## 4. Symbol-aware edits

- Prefer editing exported functions/components the graph names  
- Before deleting/renaming: `graphify path` / repo Grep on that symbol only  
- After rename: update graph (step 1 update)

## 5. Enterprise intelligence layers (what to “remember”)

| Layer | Location | Remember as |
|-------|----------|-------------|
| Contract | SOW PDF/extract | Scope / exclusions |
| Product | `prod.md` + development guide | Modules |
| Architecture | `architecture.md` + graph | Where code lives |
| Rules | `rules.md` + `.cursor/rules/*` | Hard constraints |
| Design | `design.md` + brand rule | Look & a11y |
| API truth | BACKEND_STATUS / ALIGNMENT | Live vs empty |
| Task protocol | `task.md` | Before/after |

## 6. What not to load into context

- Entire `node_modules`, `.next`, design HTML dumps, full Brand PDF  
- Unrelated portal code when graph shows a single island  
- Prior chat history as substitute for graphify (rules say: re-evaluate; graph is SoT for code)

## 7. Session start checklist (30 seconds)

```
□ graphify available (graph.json exists)
□ Remember pack path: docs/agent/
□ For this user ask: which of prod|architecture|rules|design|task apply?
□ Run graphify query before first Read
```

## 7b. Operational memory (2 Nov 2026)

Full narrative: `docs/agent/HANDOFF.md` § Current. Short form so a new Claude Code session does not rediscover it:

- API process: uvicorn **without `--reload`** from WSL on `127.0.0.1:8000`. Hung WSL → `wsl --shutdown` then restart Postgres (WSL 18) + uvicorn. Health **401** = up.
- Split-brain DB: WSL Postgres is the API; Windows Postgres is not. Alembic head **0045**.
- Bell = `/notifications/inbox*`. Email history = `/notifications/mine`. Rules = `/notifications/rules`.
- Faculty `/faculty/staff` and `/faculty/reports` are HOD-only (Faculty → portal 404).
- Chrome skill: `.cursor/skills/quirri-portal-chrome/SKILL.md`. Uncommitted chrome CSS as of 2 Nov.
- Playwright MCP: `user-playwright`. Sequential logins; ~15s between portals.

## 7a. Durable design memory (owner decisions — do not re-ask)

| Date | Decision | Where |
|------|----------|-------|
| Oct 2026 | All portals follow the **Quirri Prep** product look inside Brand Guidelines v1.0 | `design-system.md` |
| Oct 2026 | ~~Primary CTA = Amber 700 `#AC5B16`~~ — **superseded** by the reference palette below (Amber 700 now login-only) | `design-system.md` §0 |
| Oct 2026 | Radii **6** controls · **8** cards · **16** modals/drawers · full for pills/avatars | `--radius-control/-card/-panel` |
| Oct 2026 | Canvas **Neutral 100 `#EEF0F0`**; white borderless cards with `--shadow-card` | `--canvas` |
| Oct 2026 | White sidebar, Teal 50 active fill, bordered user card | `.sidebar`, `.who` |
| Oct 2026 | ~~Dual-tone accent with Amber 700~~ — superseded below | `quirri-accents.css` |
| Oct 2026 | **Reference palette = Quirri Prep interview dashboard** (owner screenshot): Teal `#0E5C6B` structure + solid teal hero / side / score panels · Amber 700 `#AC5B16` (`--accent`; owner rejected the screenshot's brighter `#F5821F`) = the one CTA, active tab, focus values, markers · Green `#5CB414` (`--progress`) = progress rings / improving scores · categorical `--cat-1…6` for skills / subjects / series · teal-tint `#F1F6F7` item cards · low scores orange, not red · login card keeps Amber 700 (frozen) | `design-system.md` §0b + §2b, `quirri-design.css` `:root`, `quirri-accents.css` |
| Oct 2026 | **Colour roles (owner table):** Primary = Quirri teal `#0E5C6B` (banners, side panels, filter bar, active sidebar text + icon, links, icons, teal secondary buttons) · Main action = Amber 700 `#AC5B16` (`--accent`: the one main button + anything with white text on amber, amber words) · Accent only = Signal Amber `#F5821F` (`--highlight`: chart points, dots, focus bars / rings, title rule — never behind white text) | `design-system.md` §0 "Colour roles" |
| Oct 2026 | **One orange only: `#F5821F`.** Owner: "#AC5B16 — don't use this orange anywhere, use the existing orange." `--accent` (main button, selected states, orange words) and `--highlight` (small marks) are both `#F5821F`; hover `#E5731A`. Amber 700 stays only on the frozen login card. Supersedes the Amber 700 rows above. | `design-system.md` §0, `quirri-design.css` `:root` |
| Standing | Login UI frozen (guard block at end of `quirri-design.css`) | `quirri-login-freeze.mdc` |
| Standing | No plan / licence / subscription copy (use "student capacity", "seat usage") | `quirri-no-plans.mdc` |
| Oct 2026 | Student has one department. College Admin may change it; previous-department watch progress, chapter assessments, and tutor chats are removed. Interview history stays. | `prod.md` · `ChangeDepartmentModal` · `clear_student_previous_department_records` |
| Oct 2026 | Student interview experience is Fresher only (`0-1`) | `STUDENT_EXPERIENCE` · `prod.md` |
| Oct 2026 | Password 8–72 + upper/lower/digit; Indian mobile 10 digits 6–9 | `FIELD_RULES` · `toIndianMobile` |
| Oct 2026 | Settings notifications: SA/CA/HOD → Notifications Rules tab; Faculty/Student own switches | `SettingsNotificationsTab` |
| Oct 2026 | Tab titles via `usePortalDocumentTitle`; login title is logic-only | `src/hooks/usePortalDocumentTitle.js` |

Change a row only when the owner says so, then update `design-system.md` §0 in the same edit.

## 8. After-change memory write

```
□ graphify update . --no-cluster
□ If durable product decision (scope CR, freeze, API missing): note in report to user
□ Do not invent parallel “memory.md” state files unless user asks
```

Agent entry: `AGENTS.md` → this pack. Protocol: `task.md`.
