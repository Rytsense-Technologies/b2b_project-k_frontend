const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch {
  raw = '';
}

let data = {};
try {
  data = JSON.parse(raw || '{}');
} catch {
  data = {};
}

const file = String(
  data.file_path || data.path || data.file || data.uri || '',
).replace(/\\/g, '/');

if (
  file &&
  (file.includes('graphify-out/') ||
    file.includes('.cursor/hooks/') ||
    file.includes('node_modules/'))
) {
  process.stdout.write('{}\n');
  process.exit(0);
}

const outDir = path.join(process.cwd(), 'graphify-out');
const lockFile = path.join(outDir, '.update.lock');
const now = Date.now();
const debounceMs = 20000;

try {
  const prev = Number(fs.readFileSync(lockFile, 'utf8'));
  if (Number.isFinite(prev) && now - prev < debounceMs) {
    process.stdout.write('{}\n');
    process.exit(0);
  }
} catch {
  /* first run */
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(lockFile, String(now));

const child = spawn('graphify', ['update', '.', '--no-cluster'], {
  cwd: process.cwd(),
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  shell: process.platform === 'win32',
});
child.unref();

process.stdout.write('{}\n');
