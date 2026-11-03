// P4_DECP: GET /edu_video/captions/{job_id} serves WebVTT; 404 means no captions (hide the toggle).
import { describe, expect, it, vi } from 'vitest';
import { applyCaptionsMode, probeCaptions } from './captions';

const res = (status, type = 'text/vtt; charset=utf-8') => ({ ok: status >= 200 && status < 300, status, headers: { get: () => type } });

describe('captions probe', () => {
  it('is available for a 200 WebVTT answer, with the login cookie', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(200));
    await expect(probeCaptions('/edu_video/captions/j1', fetchImpl)).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('/edu_video/captions/j1', expect.objectContaining({ credentials: 'include' }));
  });

  it('is unavailable on 404, 401, a non-VTT body or a network error', async () => {
    await expect(probeCaptions('/c', vi.fn().mockResolvedValue(res(404)))).resolves.toBe(false);
    await expect(probeCaptions('/c', vi.fn().mockResolvedValue(res(401)))).resolves.toBe(false);
    await expect(probeCaptions('/c', vi.fn().mockResolvedValue(res(200, 'text/html')))).resolves.toBe(false);
    await expect(probeCaptions('/c', vi.fn().mockRejectedValue(new Error('offline')))).resolves.toBe(false);
    await expect(probeCaptions('', vi.fn())).resolves.toBe(false);
  });

  it('shows or hides the captions text track', () => {
    const track = { kind: 'captions', mode: 'disabled' };
    const video = { textTracks: [track] };
    applyCaptionsMode(video, true);
    expect(track.mode).toBe('showing');
    applyCaptionsMode(video, false);
    expect(track.mode).toBe('hidden');
    expect(() => applyCaptionsMode(null, true)).not.toThrow();
  });
});
