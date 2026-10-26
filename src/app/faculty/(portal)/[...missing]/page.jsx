'use client';

import FacultyNotFound from '../not-found';

/**
 * Any unknown /faculty/... URL: render the portal's not-found screen as a
 * normal client page, so the shell (sidebar, scope, profile) hydrates the
 * same way as every other page - calling notFound() here left the sidebar on
 * placeholders after a hard reload.
 */
export default function MissingPage() {
  return <FacultyNotFound />;
}
