// FE-022, FE-017: sign-out is honest about the server, and leaves nothing behind.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/auth', () => ({ authApi: { logout: vi.fn() } }));
vi.mock('@/lib/api/faculty/directory', () => ({ facultyDirectoryApi: { me: vi.fn() } }));

const { default: toast } = await import('react-hot-toast');
const { authApi } = await import('@/lib/api/auth');
const { facultyDirectoryApi } = await import('@/lib/api/faculty/directory');
const { loadFacultyScope } = await import('@/hooks/useFacultyScope');
const { queryClient } = await import('@/lib/queryClient');
const { clearCredentials } = await import('@/store/slices/authSlice');
const { clearClientSession, signOut } = await import('./signOut');

const router = { push: vi.fn(), replace: vi.fn() };
const dispatch = vi.fn();

beforeEach(() => { vi.clearAllMocks(); });

describe('signOut', () => {
  it('reports success when the server ended the session', async () => {
    vi.mocked(authApi.logout).mockResolvedValue({});
    expect(await signOut({ dispatch, router })).toBe(true);
    expect(toast.success).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/auth/login');
  });

  it('warns, and still clears this device, when the server call fails', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(Object.assign(new Error('x'), { response: { status: 500 } }));
    expect(await signOut({ dispatch, router })).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error.mock.calls[0][0]).toMatch(/may still be active/i);
    expect(dispatch).toHaveBeenCalledWith(clearCredentials());
    expect(router.push).toHaveBeenCalledWith('/auth/login');
  });

  it('warns when the network is down', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new Error('Network Error'));
    expect(await signOut({ dispatch, router })).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it('treats 401 as already signed out', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(Object.assign(new Error('x'), { response: { status: 401 } }));
    expect(await signOut({ dispatch, router })).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('clearClientSession', () => {
  it('drops the faculty scope so the next user reloads it', async () => {
    vi.mocked(facultyDirectoryApi.me).mockResolvedValueOnce({ is_hod: false });
    expect(await loadFacultyScope()).toEqual({ is_hod: false });
    clearClientSession(dispatch);
    vi.mocked(facultyDirectoryApi.me).mockResolvedValueOnce({ is_hod: true });
    expect(await loadFacultyScope()).toEqual({ is_hod: true });
    expect(facultyDirectoryApi.me).toHaveBeenCalledTimes(2);
  });

  it('clears redux and the query cache', () => {
    const clear = vi.spyOn(queryClient, 'clear');
    clearClientSession(dispatch);
    expect(dispatch).toHaveBeenCalledWith(clearCredentials());
    expect(clear).toHaveBeenCalled();
  });

  it('removes browser copies of the session', () => {
    const removed = [];
    const storage = { removeItem: (k) => removed.push(k), length: 0, key: () => null };
    vi.stubGlobal('window', { sessionStorage: storage, localStorage: storage });
    clearClientSession(dispatch);
    vi.unstubAllGlobals();
    expect(removed).toEqual(expect.arrayContaining(['pk_user', 'pk_plan', 'voiceQnaToken']));
  });
});
