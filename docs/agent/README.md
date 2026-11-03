# Quirri Agent Pack — index

Token-optimized operating system for Cursor agents on this repo.

| File | Role |
|------|------|
| [prod.md](./prod.md) | Product scope · SOW gate · exclusions |
| [architecture.md](./architecture.md) | Portals · folders · API · symbols |
| [rules.md](./rules.md) | Hard rules index (includes existing `.mdc`) |
| [design.md](./design.md) | Brand · shell · components · Playwright (compressed) |
| [design-system.md](./design-system.md) | **Full UI spec** — PDF + Quirri Prep analysis, owner overrides, components, BEFORE/AFTER design gates |
| [task.md](./task.md) | **Before / during / after** change protocol |
| [memory.md](./memory.md) | Graphify · hooks · context packing |
| [HANDOFF.md](./HANDOFF.md) | **Session handoff** — read § Current (2 Nov 2026) first; older sections are history |
| [../knowledge/product.md](../knowledge/product.md) | **How the product works** — hierarchy, portals, content→student loop |
| [../knowledge/index.md](../knowledge/index.md) | **Knowledge bundle (OKF v0.2)** — roles, access rules, flows, tables, APIs, metrics. One concept per file; check with `node scripts/check-knowledge.mjs` |

## Default turn

1. `task.md` BEFORE checklist  
2. `memory.md` → graphify query  
3. Pack only needed docs from the table; product facts from `docs/knowledge/` (one small file per concept)  
4. UI work: `design-system.md` §6 BEFORE → build → §7 AFTER
5. Edit · then AFTER checklist (`graphify update`, Playwright if UI, `node scripts/check-knowledge.mjs` if facts changed)

Existing always-apply rules under `.cursor/rules/` remain in force. This pack **routes and budgets** them; it does not replace them.
