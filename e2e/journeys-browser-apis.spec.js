import { expect, test } from '@playwright/test';
import { CA, journeyViewport, settled, signedInContext, unique } from './journeys-helpers';

// XB (4 Nov 2026): the browser-specific surfaces the other journeys never touch.
// 1. The CSV file input and drag-and-drop on Students › Bulk import (dry run only: nothing is saved).
// 2. The text-track API that src/lib/student/captions.js drives (no seeded lecture video exists).

test.describe.configure({ mode: 'serial' });

let context;
let page;

test.beforeAll(async ({ browser }) => {
  context = await signedInContext(browser, CA, { viewport: journeyViewport() });
  page = await context.newPage();
});

test.afterAll(async () => {
  await context.close();
});

const csv = (email) => `first_name,last_name,email,department\nAsha,Raman,${email},Science A\n`;

async function expectChecked(saves) {
  await expect(page.getByText('1 ready').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add 1 student' })).toBeEnabled();
  expect(saves, 'a real import was sent').toEqual([]);
}

function watchSaves() {
  const saves = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /bulk/i.test(r.url()) && !/dry_run=true|"dry_run":\s*true/.test(`${r.url()} ${r.postData() || ''}`)) saves.push(r.url());
  });
  return saves;
}

test('a CSV picked with the file input is read and checked', async () => {
  const saves = watchSaves();
  await page.goto('/admin/students?tab=import');
  await settled(page);
  await page.locator('input[type="file"][accept*="csv"]').setInputFiles({
    name: 'students.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv(`${unique('xb-file-')}@example.com`)),
  });
  await expectChecked(saves);
  await expect(page.getByText('students.csv').first()).toBeVisible();
});

test('a CSV dropped on the drop zone is read and checked', async () => {
  const saves = watchSaves();
  await page.goto('/admin/students?tab=import');
  await settled(page);
  const text = csv(`${unique('xb-drop-')}@example.com`);
  const data = await page.evaluateHandle((body) => {
    const dt = new DataTransfer();
    dt.items.add(new File([body], 'dropped.csv', { type: 'text/csv' }));
    return dt;
  }, text);
  const zone = page.getByRole('button', { name: 'Choose a CSV file' });
  await zone.dispatchEvent('dragover', { dataTransfer: data });
  await zone.dispatchEvent('drop', { dataTransfer: data });
  await expectChecked(saves);
  await expect(page.getByText('dropped.csv').first()).toBeVisible();
});

test('a file that is not CSV is refused before upload', async () => {
  await page.goto('/admin/students?tab=import');
  await settled(page);
  await page.locator('input[type="file"][accept*="csv"]').setInputFiles({ name: 'students.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
  await expect(page.getByText('Choose a .csv file.', { exact: false }).first()).toBeVisible();
});

test('WebVTT captions load from the app origin and toggle like captions.js does', async () => {
  const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nNamaste, class\n';
  await page.route('**/__xb__/captions.vtt', (route) => route.fulfill({ status: 200, contentType: 'text/vtt', body: vtt }));
  await page.route('**/__xb__/player', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><video id="v" preload="metadata"><track kind="captions" srclang="en" label="English" src="/__xb__/captions.vtt" default></video>',
  }));
  await page.goto('/__xb__/player');
  const state = await page.evaluate(async () => {
    const video = document.getElementById('v');
    const el = video.querySelector('track');
    const track = video.textTracks[0];
    track.mode = 'hidden'; // forces a load in engines that skip tracks on a source-less video
    await new Promise((resolve) => {
      if (el.readyState === 2) resolve();
      el.addEventListener('load', resolve, { once: true });
      el.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 5000);
    });
    // applyCaptionsMode(video, on): every captions/subtitles track to showing or hidden.
    const apply = (on) => {
      for (let i = 0; i < video.textTracks.length; i += 1) {
        const t = video.textTracks[i];
        if (t.kind === 'captions' || t.kind === 'subtitles') t.mode = on ? 'showing' : 'hidden';
      }
    };
    apply(true);
    const on = track.mode;
    apply(false);
    return { readyState: el.readyState, cues: track.cues ? track.cues.length : -1, text: track.cues?.[0]?.text, on, off: track.mode, kind: track.kind };
  });
  expect(state).toEqual({ readyState: 2, cues: 1, text: 'Namaste, class', on: 'showing', off: 'hidden', kind: 'captions' });
});
