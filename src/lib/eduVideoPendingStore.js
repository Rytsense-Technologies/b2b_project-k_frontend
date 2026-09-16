import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'edu-video-pending-changes.json');

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(STORE_PATH, 'utf8');
  } catch {
    await writeFile(STORE_PATH, JSON.stringify({ items: [] }, null, 2), 'utf8');
  }
}

export async function readPendingStore() {
  await ensureStore();
  const raw = await readFile(STORE_PATH, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed : { items: [] };
  } catch {
    return { items: [] };
  }
}

export async function writePendingStore(store) {
  await ensureStore();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function upsertPendingChange(entry) {
  const store = await readPendingStore();
  const nextItems = store.items.filter((item) => item.job_id !== entry.job_id);
  nextItems.unshift(entry);
  const next = { items: nextItems };
  await writePendingStore(next);
  return entry;
}

export async function removePendingChange(jobId) {
  const store = await readPendingStore();
  const next = { items: store.items.filter((item) => item.job_id !== jobId) };
  await writePendingStore(next);
  return { deleted: true, job_id: jobId };
}
