# task.md — Before / after every change (agent loop)

> **This is the mandatory execution protocol.** Existing rules in `.cursor/rules/` still apply; this file sequences them for **minimum tokens · maximum accuracy**.

## Intelligence stack (use in this order)

| # | Capability | Tool / artifact | Purpose |
|---|------------|-----------------|--------|
| 1 | **Code Graph** | `graphify query/path/explain` · `graphify-out/graph.json` | Locate symbols without repo scan |
| 2 | **Semantic Code Search** | Graph query phrased as intent; then narrow Grep only on hit files | Find meaning, not filenames |
| 3 | **Code Context Packing** | Load only: `prod` → needed of `architecture/rules/design` → **≤N files** from graph | Cap context |
| 4 | **Symbol-aware tools** | Edit by symbol boundaries; `graphify path A B` for deps | Avoid blind refactors |
| 5 | **Enterprise Code Intelligence** | SOW + BE status + alignment + this pack | Scope / API truth |
| 6 | **Knowledge bundle (OKF v0.2)** | `docs/knowledge/` — roles, access rules, flows, tables, APIs, metrics | Product facts without re-reading code |

**Never:** dump `GRAPH_REPORT.md`, whole `src/`, or full Brand PDF into the turn.

---

## BEFORE changes (gate)

```
□ 1. SCOPE — Read docs/agent/prod.md § scope gate
     Out of scope / unclear → ASK USER; stop.
□ 2. GRAPH — graphify query "<user intent>" --budget 1500
     Optional: path / explain for hot symbols.
□ 3. PACK — Open only what the task needs:
     · architecture.md if locating code/API
     · rules.md if UI/forms/auth/nav
     · design.md if visual/copy  → then design-system.md §0, §4 rows, §6 BEFORE checklist
□ 4. API TRUTH — BE status / alignment if fetching or inventing data
     · FACTS — docs/knowledge/: open the role / rules / flow / table / api / metric
       file the task touches (start at docs/knowledge/index.md) before reading code
□ 5. PLAN — List files to touch + reuse targets (components/clients/schemas)
□ 6. EXISTING CODE — Touched files must move toward pack compliance
     (forms catalog, QuirriSelect, tips, no mocks, brand)
```

Do **not** Read/Grep/Glob broadly before steps 1–2.

---

## DURING changes

```
□ Implement against existing architecture (architecture.md)
□ Follow rules.md + always-apply .mdc files (no conflicts)
□ Forms → FIELD_RULES; India → IndiaLocationFields; dropdowns → QuirriSelect
□ Login chrome frozen unless user explicitly unfreezes
□ No mocks; missing epic → empty/error
□ One orange `--accent` CTA per view · palette roles from design-system.md §0b (teal structure, orange action/focus, green progress, cat hues for skills)
□ Design system (design-system.md): tokens only · 6/8/16 radii · Poppins 400/500 (700 ≥28px) ·
  scale sizes only · borderless cards + --shadow-card · solid Teal 500 surfaces · no gradients
□ Prefer smallest diff that satisfies SOW + request
```

---

## AFTER changes (closeout)

```
□ 1. MEMORY — graphify update . --no-cluster
     (hooks may run; if not, run manually). On this Windows machine use
     `py -m graphify update . --no-cluster` — `graphify.exe` is blocked.
□ 2. LINT/ sanity — fix issues in touched files
□ 3. UI — Playwright login + screenshot if design/layout changed (1440 + 390;
     collapsed sidebar for shell work) and run design-system.md §7 AFTER checklist
□ 4. SCOPE RECHECK — no OOS leakage, no plan UI, no login restyle
□ 5. KNOWLEDGE — if a role's rights, an access rule, a flow, a table, an endpoint
     or a metric changed: update its docs/knowledge/ file (one concept per file,
     YAML `type` header, /-links), add a line to docs/knowledge/log.md, then run
     node scripts/check-knowledge.mjs
□ 6. REPORT — short: what / files / decisions / open blockers
□ 7. GIT — commit/push only if user asked
```

---

## Context packing budgets (defaults)

| Task type | Pack |
|-----------|------|
| Copy / bug in one file | graphify + that file + rules snippet |
| New form field | graphify + `fields.js` + schema + page + forms rule |
| New portal page | prod + architecture + design + design-system §4 + sibling page pattern |
| Restyle / visual fix | design + design-system (§0, needed §4 rows, §6/§7) + touched CSS |
| API wiring | architecture + BE status + api client + page |
| Out-of-scope smell | **prod only** → ask user |

Target: **<~5k tokens** of project docs per turn unless user asks for deep review.

---

## Subagents

Pass this pack pointer: “Follow `docs/agent/task.md`; graphify before explore; update after edit.”  
Do not spawn exploratory agents that re-scan the repo when graphify answers.

## Workflow name

**Understand → Plan → Implement → Integrate → Validate → Refine → Report**  
(`AGENTS.md` · `quirri-development.mdc`)

Next: `memory.md`.
