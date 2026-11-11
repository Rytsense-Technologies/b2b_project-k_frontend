// Videos are watch-only: "Open in a new tab" goes to the app's own /watch page (no Download menu),
// never to the presigned S3 file, and that page is open to every signed-in role.
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { middleware } from '../middleware';

function call(path, cookie = '') {
  return middleware(new NextRequest(`http://localhost:3100${path}`, { headers: { host: 'localhost:3100', cookie } }));
}

describe('watch-only video tab', () => {
  it.each(['superadmin', 'college_admin', 'hod', 'faculty', 'student'])('lets a signed-in %s open /watch', async (role) => {
    const res = await call('/watch/job-1?title=Ch%201', `pk_session=1; pk_role=${role}`);
    expect(res.headers.get('location')).toBeNull();
  });

  it('sends a signed-out visitor to the login page', async () => {
    const res = await call('/watch/job-1');
    expect(res.headers.get('location')).toBe('http://localhost:3100/auth/login');
  });

  it('the preview modal links to /watch, not to the video file', () => {
    const src = readFileSync('src/components/shared/VideoPreviewModal.jsx', 'utf8');
    expect(src).toContain('href={href}');
    expect(src).not.toMatch(/href=\{src\}/);
    expect(src).toContain('`/watch/${encodeURIComponent(jobId)}');
  });

  it('every video player blocks the download menu and right-click', () => {
    const player = readFileSync('src/components/shared/RefreshingVideo.jsx', 'utf8');
    expect(player).toContain('controlsList="nodownload"');
    expect(player).toContain('onContextMenu');
    const watch = readFileSync('src/app/watch/[jobId]/page.jsx', 'utf8');
    expect(watch).toContain('RefreshingVideo');
    expect(watch).not.toMatch(/<video\b/);
  });
});
