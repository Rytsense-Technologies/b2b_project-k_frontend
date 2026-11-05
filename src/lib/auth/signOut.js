import toast from 'react-hot-toast';
import { authApi } from '@/lib/api/auth';
import { queryClient } from '@/lib/queryClient';
import { clearQuizDrafts } from '@/lib/student/quizDraft';
import { clearTokens } from '@/lib/tokens';
import { clearFacultyScopeCache } from '@/hooks/useFacultyScope';
import { clearCredentials } from '@/store/slices/authSlice';

/** Everything this browser holds for the signed-in user. The next sign-in in this tab starts clean. */
export function clearClientSession(dispatch) {
  clearTokens();
  clearFacultyScopeCache();
  clearQuizDrafts();
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem('pk_user');
      window.sessionStorage.removeItem('pk_plan');
    } catch { /* private mode */ }
  }
  dispatch(clearCredentials());
  queryClient.clear();
}

/**
 * POST /auth/logout, then clear this device either way. A 401 means the server already
 * ended the session. Any other failure leaves the httpOnly cookies possibly valid, so say so.
 * @returns {Promise<boolean>} whether the server confirmed the sign-out
 */
export async function signOut({ dispatch, router, loginPath = '/auth/login' }) {
  let confirmed = true;
  try {
    await authApi.logout();
  } catch (err) {
    confirmed = err?.response?.status === 401;
  }
  clearClientSession(dispatch);
  if (confirmed) {
    toast.success('Logged out successfully');
  } else {
    toast.error(
      'Signed out on this device, but we could not reach the server. Your session may still be active until it expires.',
      { duration: 8000 },
    );
  }
  router.push(loginPath);
  return confirmed;
}
