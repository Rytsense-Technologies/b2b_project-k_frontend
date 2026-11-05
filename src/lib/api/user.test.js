// UX-019: the shell and Settings both ask for /auth/me on load; one request serves both.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn() } }));

const { default: api } = await import('@/lib/axios');
const { userApi } = await import('./user');
const { settingsApi } = await import('./superadmin/modules');

beforeEach(() => { vi.mocked(api.get).mockReset(); });

describe('GET /auth/me', () => {
  it('shares one in-flight request between overlapping callers', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { user: { id: 1 } } });
    const [a, b] = await Promise.all([userApi.getMe(), settingsApi.get()]);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('never reuses a finished request', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} });
    await userApi.getMe();
    await settingsApi.get();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('asks again after a failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ data: {} });
    await expect(userApi.getMe()).rejects.toThrow('x');
    await expect(userApi.getMe()).resolves.toEqual({ data: {} });
  });
});
