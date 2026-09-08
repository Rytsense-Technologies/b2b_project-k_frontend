/**
 * Quirri / Project K authoritative guidance paths.
 * Keep in sync with AGENTS.md and .cursor/rules/quirri-development.mdc.
 * Graphify indexes this module so agents can discover guidance via the knowledge graph.
 */
export const QUIRRI_GUIDANCE = {
  /** How to build — brand, tokens, UX, a11y, workflow */
  brandAndBuild: 'assets/QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md',
  /** What to build — modules, tenancy, RBAC */
  productGuide: 'assets/PROJECT_K_DEVELOPMENT_GUIDE.md',
  /** Phase 1 B2B contract */
  sow: 'assets/ProjectK_B2B_SOW_v1.0.pdf',
  /** Backend progress + live API surface (from b2b_projectk) */
  backendStatus: 'docs/BACKEND_STATUS_REPORT.md',
  /** Frontend paths vs live backend endpoints */
  apiAlignment: 'docs/FRONTEND_BACKEND_ALIGNMENT.md',
  /** Static UI shell — do not modify */
  clientDemo: 'projectK_Client_Demo/',
  /** Design tokens CSS */
  designCss: 'src/styles/quirri-design.css',
  /** Graphify wiki entry */
  wiki: 'graphify-out/wiki/index.md',
  /** Field rules catalog — charset, length, Zod */
  fieldValidation: 'src/lib/validation/',
  /** Login UI pattern — centered Quirri card */
  loginPage: 'src/app/auth/login/page.js',
  loginCss: 'src/styles/quirri-design.css (.auth / .auth-card)',
  /** Dropdowns, text alignment, product must-haves */
  productUiRules: 'docs/QUIRRI_PRODUCT_UI_RULES.md',
};

export const SUPERADMIN_NAV_MODULES = [
  'Dashboard',
  'Universities',
  'Colleges',
  'Platform Users',
  'Reports',
  'Platform Health',
  'Audit Logs',
  'Notifications',
  'Settings',
];

export const BUILD_WORKFLOW = [
  'Understand',
  'Plan',
  'Implement',
  'Integrate',
  'Validate',
  'Refine',
  'Report',
];
