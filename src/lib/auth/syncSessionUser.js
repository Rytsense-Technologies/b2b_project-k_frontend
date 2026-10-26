import { store } from '@/store';
import { setUser } from '@/store/slices/authSlice';

/**
 * After a profile save (PATCH /auth/me), push the new name / phone / avatar
 * into the redux auth user AND the `pk_user` sessionStorage copy, so the
 * sidebar and avatar menus update without a reload.
 *
 * Accepts the /auth/me response in any of its shapes ({ user }, { data: { user } },
 * or the user object itself) or a partial { first_name, last_name, phone_number }.
 * Only keys that are present are changed. Returns the merged profile.
 *
 * @param {object} user
 * @param {Function} [dispatch] — defaults to the app store's dispatch.
 */
export function syncSessionUser(user, dispatch = store.dispatch) {
  const me = user?.data?.user ?? user?.user ?? user?.data ?? user;
  if (!me || typeof me !== 'object') return null;

  const patch = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(me, k);
  if (has('id')) patch.id = me.id;
  if (has('email')) patch.email = me.email;
  if (has('first_name')) patch.first_name = me.first_name || null;
  if (has('last_name')) patch.last_name = me.last_name || null;
  if (has('avatar_url')) patch.avatar_url = me.avatar_url ?? null;
  if (has('phone_number')) patch.phone = me.phone_number ?? null;
  else if (has('phone')) patch.phone = me.phone ?? null;

  let current = {};
  try {
    current = JSON.parse(sessionStorage.getItem('pk_user') || '{}') || {};
  } catch { /* private mode / bad JSON */ }
  const base = { ...current, ...(store.getState()?.auth?.user || {}) };

  if (has('first_name') || has('last_name') || has('name')) {
    const first = has('first_name') ? me.first_name : base.first_name;
    const last = has('last_name') ? me.last_name : base.last_name;
    patch.name = [first, last].filter(Boolean).join(' ') || me.name || base.email || patch.email || '';
  }

  dispatch(setUser(patch));
  const merged = { ...base, ...patch };
  try { sessionStorage.setItem('pk_user', JSON.stringify(merged)); } catch { /* private mode */ }
  return merged;
}

export default syncSessionUser;
