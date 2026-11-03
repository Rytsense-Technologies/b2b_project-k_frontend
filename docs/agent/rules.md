# rules.md — Hard rules index (existing + pack)

> **Load when:** implementing or altering any UI, form, API client, or nav.  
> **Rule:** existing `.cursor/rules/*.mdc` remain authoritative. This file is the **index** — do not invent conflicting rules.

## Always-apply Cursor rules (must still follow)

| File | Enforce |
|------|---------|
| `quirri-sow-scope.mdc` | SOW gate; ask before OOS |
| `quirri-development.mdc` | Workflow, brand summary, Playwright, tips |
| `graphify.mdc` | Query before explore; update after edit |
| `quirri-brand-guidelines.mdc` | Tokens, Poppins, voice, a11y |
| `quirri-design-system.mdc` | Prep-aligned components, owner overrides, before/after design gates (`design-system.md`) |
| `quirri-forms.mdc` | `FIELD_RULES` + Zod + `QuirriRHFField` |
| `quirri-product-ui.mdc` | Dropdowns, alignment, no mocks, one orange CTA |
| `quirri-india-location.mdc` | IN / state-district combobox / +91 / pincode |
| `quirri-no-plans.mdc` | No plan/licence/subscription UI |
| `quirri-login-freeze.mdc` | Do not restyle login |
| `quirri-agent-pack.mdc` | This pack: before/after + token protocol |

Chrome skill (post-login header + Alerts bell on all four portals): `.cursor/skills/quirri-portal-chrome/SKILL.md`. Does not unfreeze login cards.

## Forms (non-negotiable)

1. Pick type from `src/lib/validation/fields.js` (`FIELD_RULES`)  
2. Schema in `src/lib/validation/schemas/`  
3. UI: `react-hook-form` + `zodResolver` + `QuirriRHFField` (`fieldType`)  
4. Never: raw text inputs, toast-only required checks, one-off regex/maxLength  

## Product UI

- Dropdowns: `QuirriSelect` / `QuirriCombobox` — never OS native chrome  
- Text: left titles/labels/body; `.num` right; center only auth brand  
- Tooltips: `QuirriTooltip` / `useQuirriTip` — never HTML `title`  
- Visual system: `docs/agent/design-system.md` — tokens only, 6/8/16 radii, Poppins 400/500, solid Teal 500 surfaces, colour roles (§0): teal primary, one orange `#F5821F` main action + highlights (never `#AC5B16`), green progress, categorical skill hues  
- Full contract: `docs/QUIRRI_PRODUCT_UI_RULES.md`

## Login freeze

Routes frozen: `/auth/login`, portal login wrappers, forgot/reset. Auth **logic** OK; visual redesign forbidden until user explicitly unfreezes.

## Git / agent ops

- Commit / push **only** when user asks  
- No force-push, no `--no-verify`, no git config changes  
- Secrets never in chat or commits  

## Altering existing code

When changing legacy screens, **bring them into compliance** with this index (forms catalog, QuirriSelect, tips, no mocks, brand tokens) — do not perpetuate forbidden patterns in touched files.

Next: `design.md` · `task.md`.
