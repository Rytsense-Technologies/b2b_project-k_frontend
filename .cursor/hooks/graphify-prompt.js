const fs = require('fs');
const path = require('path');

try {
  fs.readFileSync(0, 'utf8');
} catch {
  /* ignore empty stdin */
}

const hasGraph = fs.existsSync(path.join(process.cwd(), 'graphify-out', 'graph.json'));
const hasQuirriGuide = fs.existsSync(
  path.join(process.cwd(), 'assets', 'QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md')
);
const hasFieldCatalog = fs.existsSync(
  path.join(process.cwd(), 'src', 'lib', 'validation', 'fields.js')
);

const lines = [
  hasGraph
    ? 'Use graphify before exploring files: graphify query "<this prompt>" --budget 1500. After edits, graphify update . --no-cluster.'
    : 'No graphify graph yet. Build with graphify extract . --no-cluster, then query it instead of scanning files.',
];

if (hasQuirriGuide) {
  lines.push(
    'Follow assets/QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md for brand, UX, accessibility, and build workflow.',
    'Scope: assets/PROJECT_K_DEVELOPMENT_GUIDE.md + assets/ProjectK_B2B_SOW_v1.0.pdf. UI ref: projectK_Client_Demo/.',
    'Login UI: centered Quirri card (Welcome back / Sign in to Quirri) — src/app/auth/login/page.js. Not split-hero.'
  );
}

if (hasFieldCatalog) {
  lines.push(
    'Forms: every input must use src/lib/validation FIELD_RULES + QuirriRHFField (fieldType). See .cursor/rules/quirri-forms.mdc. Do not invent per-page validation.'
  );
}

process.stdout.write(JSON.stringify({ additional_context: lines.join('\n') }) + '\n');
