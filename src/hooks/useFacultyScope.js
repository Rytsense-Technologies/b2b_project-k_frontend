'use client';

import { useEffect, useState } from 'react';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';

// One /faculty/me request per page load, shared by the sidebar and pages.
let cached = null;
let inflight = null;

function load(force = false) {
  if (force) {
    cached = null;
    inflight = null;
  }
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = facultyDirectoryApi.me()
      .then((data) => { cached = data; return data; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/**
 * HOD / Faculty scope from GET /faculty/me: { role, is_hod, department_name,
 * subjects, subject_limited, read_only, ... }.
 * `scope` is null until loaded (and on the server), so first render matches.
 */
export function useFacultyScope() {
  const [scope, setScope] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    load()
      .then((data) => { if (alive) setScope(data); })
      .catch((err) => { if (alive) setError(err); });
    return () => { alive = false; };
  }, []);

  return { scope, error, reload: () => load(true).then((d) => { setScope(d); return d; }) };
}

export function clearFacultyScopeCache() {
  cached = null;
  inflight = null;
}
