'use client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Renders children only when the current user's role is in allowedRoles.
 * Superadmin always passes regardless of allowedRoles.
 *
 * @example
 * <RoleGuard allowedRoles={['superadmin', 'college_admin']}>
 *   <DeleteButton />
 * </RoleGuard>
 *
 * <RoleGuard allowedRoles={['faculty']} fallback={<p>Not authorised</p>}>
 *   <ReviewQueue />
 * </RoleGuard>
 */
export default function RoleGuard({ allowedRoles = [], fallback = null, children }) {
  const { role } = useAuth();

  if (role === 'superadmin' || allowedRoles.includes(role)) {
    return children;
  }

  return fallback;
}
