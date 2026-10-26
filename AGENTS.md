# Quirri AI — Cursor agent entry

**Operating pack (before / after every change):** [`docs/agent/`](docs/agent/)

| File | Use |
|------|-----|
| [`docs/agent/task.md`](docs/agent/task.md) | **Mandatory** BEFORE · DURING · AFTER protocol |
| [`docs/agent/memory.md`](docs/agent/memory.md) | Code Graph · hooks · context packing |
| [`docs/agent/prod.md`](docs/agent/prod.md) | SOW scope · exclusions · product must-haves |
| [`docs/agent/architecture.md`](docs/agent/architecture.md) | Portals · folders · APIs · symbols |
| [`docs/agent/rules.md`](docs/agent/rules.md) | Hard rules index (existing `.mdc` + pack) |
| [`docs/agent/design.md`](docs/agent/design.md) | Brand · shell · components · Playwright (compressed) |
| [`docs/agent/design-system.md`](docs/agent/design-system.md) | **UI source of truth** — Brand PDF + Quirri Prep analysis, owner overrides, component specs, BEFORE/AFTER design gates |

Index: [`docs/agent/README.md`](docs/agent/README.md) · Always-apply rule: `.cursor/rules/quirri-agent-pack.mdc`

Prefer this pack + graphify over scanning the whole repo. **Existing** `.cursor/rules/*.mdc` still apply in full.

## Token-optimized intelligence (required order)

1. **Code Graph** — `graphify query "<intent>" --budget 1500` (then `path` / `explain`)
2. **Semantic Code Search** — Grep/Read only graph hit files
3. **Code Context Packing** — load only needed `docs/agent/*` slices + those files
4. **Symbol-aware edits** — change by symbol; check dependents via graph
5. **Enterprise Code Intelligence** — SOW + BE status + alignment before inventing features/APIs

After code edits: `graphify update . --no-cluster` (hooks should also run).

## Always follow (detail lives in the pack)

0. **Scope gate (SOW):** `assets/ProjectK_B2B_SOW_v1.0.pdf` — OOS → ask first (`quirri-sow-scope.mdc` · `prod.md`)
1. **How to build:** `assets/QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md` · `design.md` · `design-system.md`
2. **What to build:** `assets/PROJECT_K_DEVELOPMENT_GUIDE.md` + SOW · `prod.md`
3. **API truth:** `docs/BACKEND_STATUS_REPORT.md` · `docs/FRONTEND_BACKEND_ALIGNMENT.md`
4. **Post-login UI:** look & components → `docs/agent/design-system.md` (Quirri Prep pattern); module/nav content → `new_updated_design_four/` · `docs/QUIRRI_UI_REFERENCE.md`
5. **Legacy demo:** `ProjectK_Client_Demo/` — do not edit for chrome
6. **UI verify:** Playwright for design/layout changes

## Always-applied Cursor rules

- `quirri-agent-pack.mdc` — pack before/after + token protocol
- `quirri-sow-scope.mdc` · `quirri-development.mdc` · `graphify.mdc`
- `quirri-brand-guidelines.mdc` · `quirri-design-system.mdc` · `quirri-forms.mdc` · `quirri-product-ui.mdc`
- `quirri-india-location.mdc` · `quirri-no-plans.mdc` · `quirri-login-freeze.mdc`

## Non-negotiables (summary)

- Four portals: SA `/superadmin` · CA `/admin` · Faculty `/faculty` · Student `/student`
- Login UI **frozen** (centered Quirri card) until user unfreezes
- Design system (`design-system.md`): white sidebar · Poppins 400/500 · canvas `#EEF0F0` · solid Teal 500 banners/filter bars · **reference palette (§0b): teal structure · teal `#0E5C6B` primary · one orange `#F5821F` for the main action (white text) and small highlights — never `#AC5B16` · green `#5CB414` progress · cat-1…6 skill hues** · radii 6 controls / 8 cards / 16 modals · no gradients · no mocks
- UI work: `design-system.md` §6 BEFORE → build → §7 AFTER (Playwright 1440 + 390)
- Forms: `FIELD_RULES` + `QuirriRHFField` · India-only location · no plan/licence UI
- Workflow: Understand → Plan → Implement → Integrate → Validate → Refine → Report

## Altering existing code

Touched files must be brought into compliance with `docs/agent/rules.md`, `design.md` and `design-system.md` (catalog fields, QuirriSelect, Quirri tips, brand tokens, empty/error for missing APIs) while keeping prior always-apply rules.
