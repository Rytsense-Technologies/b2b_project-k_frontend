import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectUser, selectPlan, selectIsAuthed, clearCredentials,
  selectRole, selectTenantId, selectPermissions,
} from '@/store/slices/authSlice';
import { queryClient } from '@/lib/queryClient';
import api from '@/lib/axios';
import { clearTokens } from '@/lib/tokens';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function useAuth() {
  const dispatch     = useAppDispatch();
  const router       = useRouter();
  const user         = useAppSelector(selectUser);
  const plan         = useAppSelector(selectPlan);
  const isAuthed     = useAppSelector(selectIsAuthed);
  const role         = useAppSelector(selectRole);
  const tenantId     = useAppSelector(selectTenantId);
  const permissions  = useAppSelector(selectPermissions);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore — still clear local state */ }
    clearTokens();
    dispatch(clearCredentials());
    queryClient.clear();
    router.push('/auth/login');
    toast.success("You're signed out.");
  };

  // Returns true if the user holds the given permission.
  // Superadmin always passes — '*' in permissions grants everything.
  const hasPermission = (permission) => {
    if (!permissions?.length) return false;
    return permissions.includes('*') || permissions.includes(permission);
  };

  // Returns true if the current role matches any of the supplied roles.
  const isRole = (...roles) => roles.includes(role);

  return { user, plan, isAuthed, logout, role, tenantId, hasPermission, isRole };
}
