// AUTH-010: the tutor uses the signed-in session only. A token left in this browser never answers.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({ refreshSession: vi.fn() }));
vi.mock('@/lib/sessionExpiry', () => ({ handleSessionExpired: vi.fn() }));

const { refreshSession } = await import('@/lib/axios');
const { handleSessionExpired } = await import('@/lib/sessionExpiry');
const { voiceQnaApi } = await import('./voiceQna');
const { clearTokens, setSessionCookie } = await import('@/lib/tokens');

const reply = (status, body) => ({ status, ok: status < 400, text: async () => JSON.stringify(body) });

let store;
beforeEach(() => {
  vi.clearAllMocks();
  store = { voiceQnaToken: 'left-by-the-last-student' };
  vi.stubGlobal('document', { cookie: '' });
  vi.stubGlobal('window', {
    location: { protocol: 'http:' },
    localStorage: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    },
  });
});

describe('voice tutor auth', () => {
  it('refreshes an expired cookie and never sends a bearer', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(401, {}))
      .mockResolvedValueOnce(reply(200, []));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(refreshSession).mockResolvedValue({});

    await expect(voiceQnaApi.list()).resolves.toEqual([]);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mock.calls.forEach(([, init]) => {
      expect(init.credentials).toBe('include');
      expect(init.headers.Authorization).toBeUndefined();
    });
  });

  it('sends the user to login when the refresh fails, without trying the old token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(401, {}));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(refreshSession).mockRejectedValue(new Error('expired'));

    await expect(voiceQnaApi.remove('c1')).rejects.toMatchObject({ status: 401 });

    expect(handleSessionExpired).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('a 403 stays a 403', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(403, {}));
    vi.stubGlobal('fetch', fetchMock);
    await expect(voiceQnaApi.list()).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not keep the token the start call returns', async () => {
    delete store.voiceQnaToken;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      reply(201, { livekit_url: 'wss://x', livekit_token: 'call', user_token: 'new' }),
    ));
    await voiceQnaApi.start({ jobId: 'j1' });
    expect(store).toEqual({});
  });

  it('logout removes a token an older build stored', () => {
    clearTokens();
    expect(store).toEqual({});
  });

  it('sign-in removes a token an older build stored', () => {
    setSessionCookie();
    expect(store).toEqual({});
  });
});

// P4 DECB: per-college daily caps answer 429 with a sentence; show it verbatim (no retry for "tomorrow").
describe('voice tutor quota and size errors', async () => {
  const { voiceQnaErrorMessage, voiceQnaCanRetry } = await import('./voiceQna');
  const cap = "Your college has reached today's limit of 3000 tutor questions. Try again tomorrow.";

  it('shows the daily-cap 429 sentence verbatim and offers no retry', () => {
    expect(voiceQnaErrorMessage(429, { detail: cap })).toBe(cap);
    expect(voiceQnaCanRetry(429, { detail: cap })).toBe(false);
  });

  it('keeps the short wait message for a plain rate limit', () => {
    expect(voiceQnaErrorMessage(429, {})).toBe('Please wait a moment.');
    expect(voiceQnaCanRetry(429, {})).toBe(true);
  });

  it('explains a 413 oversized request', () => {
    expect(voiceQnaErrorMessage(413, { detail: 'The request is too large (limit 1024 KB).' })).toBe('The request is too large (limit 1024 KB).');
    expect(voiceQnaErrorMessage(413, {})).toBe('That message is too long. Shorten it and try again.');
  });
});
