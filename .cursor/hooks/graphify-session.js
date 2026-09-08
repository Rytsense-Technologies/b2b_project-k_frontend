const fs = require('fs');
const path = require('path');

try {
  fs.readFileSync(0, 'utf8');
} catch {
  /* ignore empty stdin */
}

const graphPath = path.join(process.cwd(), 'graphify-out', 'graph.json');
const reportPath = path.join(process.cwd(), 'graphify-out', 'GRAPH_REPORT.md');
const hasGraph = fs.existsSync(graphPath);

let summary = '';
if (fs.existsSync(reportPath)) {
  const lines = fs.readFileSync(reportPath, 'utf8').split(/\r?\n/).slice(0, 24);
  summary = lines.join('\n').slice(0, 1200);
}

const refs = [
  'Authoritative refs: assets/QUIRRI_AI_CURSOR_DEVELOPMENT_INSTRUCTIONS.md (how to build),',
  'assets/PROJECT_K_DEVELOPMENT_GUIDE.md (what to build), projectK_Client_Demo/ (UI shell).',
  'Forms: src/lib/validation + QuirriRHFField fieldType — .cursor/rules/quirri-forms.mdc is mandatory.',
].join(' ');

const additional_context = hasGraph
  ? [
      'Graphify memory is active at graphify-out/. Query it before Read/Grep/Glob to save tokens.',
      'graphify query "<question>" --budget 1500',
      'graphify path "<A>" "<B>"',
      'graphify explain "<concept>"',
      'After code edits: graphify update . --no-cluster',
      refs,
      summary ? `GRAPH_REPORT excerpt:\n${summary}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  : [
      'graphify-out/graph.json is missing. Build it with: graphify extract . --no-cluster',
      refs,
    ].join('\n');

process.stdout.write(JSON.stringify({ additional_context }) + '\n');
