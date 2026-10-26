'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUser, setUser } from '@/store/slices/authSlice';
import { userApi } from '@/lib/api/user';
import { unwrap } from '@/lib/api/superadmin/http';

/**
 * The store only rehydrates from this tab's sessionStorage — a new tab, a hard
 * reload after the session copy was cleared, or a restarted browser with a
 * still-valid session has no profile, so sidebars fall back to placeholders.
 * Load it from /auth/me once whenever the profile is missing.
 * `always` refreshes it once on mount too (institution names can change).
 */
export function useHydrateProfile({ always = false } = {}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const hasProfile = Boolean(user?.email || user?.name || user?.first_name);

  useEffect(() => {
    if (hasProfile && !always) return undefined;
    let cancelled = false;
    userApi.getMe().then(unwrap).then((res) => {
      const me = res?.user ?? res; // /auth/me → { user: {...} }
      if (cancelled || !me?.id) return;
      const first = me.first_name ?? '';
      const last = me.last_name ?? '';
      const profile = {
        id: me.id,
        email: me.email,
        first_name: first || null,
        last_name: last || null,
        name: [first, last].filter(Boolean).join(' ') || me.name || me.email,
        avatar_url: me.avatar_url ?? null,
        college_name: me.college_name ?? me.tenant_name ?? null,
        tenant_name: me.tenant_name ?? me.college_name ?? null,
        university_name: me.university_name ?? null,
        department: me.department ?? null,
        phone: me.phone_number ?? null,
      };
      dispatch(setUser(profile));
      try { sessionStorage.setItem('pk_user', JSON.stringify(profile)); } catch { /* private mode */ }
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `always` runs once per mount
  }, [always ? null : hasProfile, dispatch]);

  return user;
}
