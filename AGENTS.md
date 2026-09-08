# Quirri AI — Cursor agent entry

This file orients Cursor agents. Prefer it plus graphify over scanning the whole repo.

## Always follow

1. **How to build:** [`assets/QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md`](assets/QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md)
2. **What to build:** [`assets/PROJECT_K_DEVELOPMENT_GUIDE.md`](assets/PROJECT_K_DEVELOPMENT_GUIDE.md) + [`assets/ProjectK_B2B_SOW_v1.0.pdf`](assets/ProjectK_B2B_SOW_v1.0.pdf)
3. **Backend live API / epic status:** [`docs/BACKEND_STATUS_REPORT.md`](docs/BACKEND_STATUS_REPORT.md) + [`docs/FRONTEND_BACKEND_ALIGNMENT.md`](docs/FRONTEND_BACKEND_ALIGNMENT.md)
4. **Post-login UI (primary):** [`new_updated_design_four/`](new_updated_design_four/) — see [`docs/QUIRRI_UI_REFERENCE.md`](docs/QUIRRI_UI_REFERENCE.md)
5. **Legacy UI demo:** [`ProjectK_Client_Demo/`](ProjectK_Client_Demo/) (static — do not edit; superseded for portal chrome)
6. **Token memory:** `graphify query "<prompt>" --budget 1500` then edit; after changes `graphify update . --no-cluster`
7. **UI verification:** Use **Playwright** (`user-playwright`) for every design change or visual bug — log in to the affected portal, screenshot, and hit-test before finishing

## Always-applied Cursor rules

- `.cursor/rules/quirri-development.mdc`
- `.cursor/rules/graphify.mdc`
- `.cursor/rules/quirri-forms.mdc` — field catalog, Zod, charset/length (do not invent per-page validation)
- `.cursor/rules/quirri-product-ui.mdc` — dropdowns, text alignment, product must-haves
- `.cursor/rules/quirri-india-location.mdc` — India-only country/state/district/pincode/+91

## Product UI rules (dropdowns + text)

- **Contract:** [`docs/QUIRRI_PRODUCT_UI_RULES.md`](docs/QUIRRI_PRODUCT_UI_RULES.md)
- Dropdowns: `QuirriSelect` / labeled `quirri-select` — never bare unstyled selects
- Text: left-aligned titles/labels/body; right-align `.num`; center only auth card brand
- Must-haves: no mocks, one amber CTA, catalog fields, Quirri tips, empty/error for missing APIs
- Applies to **all existing and future** builds

## Login UI (FROZEN — do not redesign)

- **Lock:** Keep the current centered Quirri card for **all** logins until the user explicitly asks to change it — `.cursor/rules/quirri-login-freeze.mdc`
- Pattern: centered Quirri card — **not** `new_updated_design_four/Login.dc.html`
- Routes: SA `/auth/login` · CA `/admin/login` · Faculty `/faculty/login` · Student `/student/login`
- Logo: `/public/quirri-logo.svg` via `QuirriLogo`
- Copy: “Welcome back” / “Sign in to Quirri”
- Fields: Field Rules Catalog (`email`, `password`)
- CTA: one Amber 700 **Sign in** button
- Middleware by role: `superadmin` → `/superadmin/*`, `college_admin` → `/admin/*`, `faculty` → `/faculty/*`, `student` → `/student/*`
- Auth logic/API fixes OK; visual redesign forbidden without explicit user request

## Four portals (post-login)

| Portal | Shell | Design SoT |
|--------|-------|------------|
| Super Admin | `/superadmin/*` · `SuperAdminSidebar` | `SuperAdmin.dc.html` |
| College Admin | `/admin/*` · `CollegeAdminSidebar` | `CollegeAdmin.dc.html` |
| HOD / Faculty | `/faculty/*` · `FacultySidebar` | `HodFaculty.dc.html` |
| Student | `/student/*` · `StudentSidebar` | `Student.dc.html` |

- Dark teal sidebar + Plus Jakarta Sans + mist `#F4F6F7` + `PortalHero` / `.q-app-shell`
- No mocks in `src/` — loading / error / empty only
- Do not reintroduce Skill Courses, Email CRUD, AI Usage ₹ dashboard, or student billing UI

## Tooltips & hover hints

- **Never** use native HTML `title="…"` for hover UI
- Use `QuirriTooltip` / `useQuirriTip` from `src/components/superadmin/QuirriTooltip.jsx`
- Keep `aria-label` on icon-only controls; tip is visual only

## Forms & validation

- Catalog: [`src/lib/validation/`](src/lib/validation/) (`FIELD_RULES`, Zod builders, schemas)
- UI: `QuirriRHFField` / `QuirriControlledField` with `fieldType`
- **Mandatory** for every new/edited input — see `.cursor/rules/quirri-forms.mdc`
- **India-only location:** `docs/QUIRRI_INDIA_LOCATION_RULES.md` + `IndiaLocationFields` / `QuirriCombobox`

## Non-negotiables (summary)

- Quirri Teal / Deep Teal / Signal Amber / Mist / Ink
- Post-login: Plus Jakarta Sans; login cards: Poppins
- One amber CTA per view; WCAG 2.2 AA; calm UX copy
- Four portals match `new_updated_design_four` shells; logins stay existing card pattern

## Figma (Super Admin client share)

- **File:** [Core 7 Modules](https://www.figma.com/design/42gIwLOZaEMZ29LHX7LYIn)
- **Doc:** `docs/FIGMA_SUPER_ADMIN.md`

## Development workflow

Understand → Plan → Implement → Integrate → Validate → Refine → Report
