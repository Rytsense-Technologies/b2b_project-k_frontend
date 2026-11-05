// AUTH-022: a failed refresh rejects every waiting edu_video call; nothing stays pending.
import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({ refreshSession: vi.fn() }));
vi.mock('@/lib/sessionExpiry', () => ({ handleSessionExpired: vi.fn() }));

axios.defaults.adapter = async (config) => {
  const err = new Error('HTTP 401');
  err.config = config;
  err.response = { status: 401, data: {}, headers: {}, config };
  throw err;
};

const { refreshSession } = await import('@/lib/axios');
const { handleSessionExpired } = await import('@/lib/sessionExpiry');
const { eduVideoApi } = await import('./eduVideo');

describe('edu_video refresh failure', () => {
  it('rejects all parallel calls', async () => {
    vi.mocked(refreshSession).mockRejectedValue(new Error('expired'));
    const settled = await Promise.allSettled([eduVideoApi.getStatus('a'), eduVideoApi.getStatus('b')]);
    expect(settled.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(handleSessionExpired).toHaveBeenCalled();
  });
});
