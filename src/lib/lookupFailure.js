import toast from 'react-hot-toast';

/**
 * A supporting list (filter options, a picker) failed to load. Without this the page reads
 * as if there were no options. 401 is handled by the session redirect; 403 means this role
 * has no such list, which an empty dropdown states correctly.
 */
export function reportLookupFailure(name, err) {
  const status = err?.response?.status ?? err?.status;
  if (status === 401 || status === 403) return;
  toast.error(`Could not load ${name}. Lists on this page may be incomplete. Reload to try again.`, { id: `lookup:${name}` });
}
