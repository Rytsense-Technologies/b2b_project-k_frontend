# CLAUDE.md

This repo's agent instructions live in **[`AGENTS.md`](AGENTS.md)** — read it first and follow it.

Short version:

- Operating pack: `docs/agent/` — follow `task.md` BEFORE / DURING / AFTER on every change.
- UI: `docs/agent/design-system.md` is the source of truth (Brand Guidelines v1.0 + Quirri Prep patterns + owner overrides). Run its §6 BEFORE and §7 AFTER checklists for any visual change.
- Always-apply rules in `.cursor/rules/*.mdc` (design system, brand, forms, product UI, India location, no plans, login freeze, SOW scope, graphify) apply to Claude as well.
- Login UI is frozen. No mocks in `src/`. Commit / push only when asked.
