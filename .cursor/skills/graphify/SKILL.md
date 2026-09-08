---
name: graphify
description: Query graphify-out as persistent codebase memory. Use on every prompt, run, or architecture question; after every code change run graphify update. Follow Quirri build guidance and Project K scope refs.
---

# Graphify + Quirri build guidance

## 1. Every prompt / run

If `graphify-out/graph.json` exists:

```bash
graphify query "<user question>" --budget 1500
```

For two symbols:

```bash
graphify path "<A>" "<B>"
```

For one concept:

```bash
graphify explain "<concept>"
```

Then Read/Grep only the files the graph points to.

## 2. After every change

```bash
graphify update . --no-cluster
```

AST-only, no API cost. Cursor `afterFileEdit`/`stop` hooks and git post-commit hooks should run this; if they did not, run it before finishing.

## 3. Authoritative references (read before portal work)

| Priority | Document | Role |
|----------|----------|------|
| **1** | `assets/ProjectK_B2B_SOW_v1.0.pdf` | B2B contract scope |
| **2** | `assets/PROJECT_K_DEVELOPMENT_GUIDE.md` | What to build |
| **3** | `assets/QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md` | How to build — brand, tokens, UX, a11y, workflow |
| **4** | `new_updated_design_four/` | **Primary** post-login UI for SA / CA / HOD / Student — `docs/QUIRRI_UI_REFERENCE.md` |
| **4b** | `ProjectK_Client_Demo/` | Legacy static demo (do not prefer for new portal chrome) |

Main app rules:

- No mocks in `src/`; login via API; centered Quirri login card (unchanged)
- Post-login: dark teal sidebar, Plus Jakarta Sans, mist `#F4F6F7`, `PortalHero`
- Four portals: `/superadmin`, `/admin`, `/faculty`, `/student`
- Forms: `src/lib/validation` `FIELD_RULES` + `QuirriRHFField` — `.cursor/rules/quirri-forms.mdc`
- Product UI: `docs/QUIRRI_PRODUCT_UI_RULES.md` — dropdowns (`QuirriSelect`), text alignment
- Tooltips: `QuirriTooltip` / `useQuirriTip` — never native `title`
- UI verification: Playwright for design/layout bugs

## 4. First-time / rebuild

```bash
graphify extract . --no-cluster
```

Outputs:

- `graphify-out/graph.json` — queryable graph
- `graphify-out/GRAPH_REPORT.md` — architecture summary (read only for broad review)
- `graphify-out/graph.html` — optional visual map

## 5. Do not

- Dump `GRAPH_REPORT.md` into every turn
- Re-grep the whole `src/` tree when a graph query would answer it
- Skip the update after editing JS/JSX/CSS
- Invent brand colours, spacing, or product modules outside scope docs
