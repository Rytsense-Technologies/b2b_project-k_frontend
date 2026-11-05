/** What a GET /faculty/me error means for the portal. */
export function scopeFailure(error) {
  if (!error) return 'none';
  const status = error?.response?.status ?? error?.status;
  const detail = String(error?.response?.data?.detail || error?.message || '');
  return status === 400 && /department/i.test(detail) ? 'no_department' : 'failed';
}

/**
 * Which menu the sidebar shows. Only /faculty/me knows HOD vs Faculty: an HOD's session role
 * can still read "faculty", so until it loads show no links rather than the wrong menu
 * (a definite 'hod' role is safe). If it fails, the base menu keeps the portal navigable.
 */
export function facultyMenuKind({ scope, error, role }) {
  if (scope) return scope.is_hod ? 'hod' : 'faculty';
  if (role === 'hod') return 'hod';
  return error ? 'faculty' : null;
}
