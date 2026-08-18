const fs = require('fs');
const path = require('path');

try {
  fs.readFileSync(0, 'utf8');
} catch {
  /* ignore empty stdin */
}

const hasGraph = fs.existsSync(path.join(process.cwd(), 'graphify-out', 'graph.json'));

const additional_context = hasGraph
  ? 'Use graphify before exploring files: graphify query "<this prompt>" --budget 1500. After edits, graphify update . --no-cluster.'
  : 'No graphify graph yet. Build with graphify extract . --no-cluster, then query it instead of scanning files.';

process.stdout.write(JSON.stringify({ additional_context }) + '\n');
