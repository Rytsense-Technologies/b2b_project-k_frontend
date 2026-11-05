import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectUser, selectIsAuthed,
  selectRole, selectTenantId, selectPermissions,
} from '@/store/slices/authSlice';
import { signOut } from '@/lib/auth/signOut';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const dispatch     = useAppDispatch();
  const router       = useRouter();
  const user         = useAppSelector(selectUser);
  const isAuthed     = useAppSelector(selectIsAuthed);
  const role         = useAppSelector(selectRole);
  const tenantId     = useAppSelector(selectTenantId);
  const permissions  = useAppSelector(selectPermissions);

  const logout = () => signOut({ dispatch, router });

  // Returns true if the user holds the given permission.
  // Superadmin always passes — '*' in permissions grants everything.
  const hasPermission = (permission) => {
    if (!permissions?.length) return false;
    return permissions.includes('*') || permissions.includes(permission);
  };

  // Returns true if the current role matches any of the supplied roles.
  const isRole = (...roles) => roles.includes(role);

  return { user, isAuthed, logout, role, tenantId, hasPermission, isRole };
}
