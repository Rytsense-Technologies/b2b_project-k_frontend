'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Renders `fallback` on the server and during hydration, then the children.
 *
 * SECB-009 made every page render per request (nonce CSP). Before that, the static build bailed
 * out of server rendering below a useSearchParams Suspense boundary, so these forms only ever
 * existed once React ran. Server-rendered, an e-mail typed (or autofilled) before hydration was
 * wiped when the controlled field hydrated. This keeps the old client-only behaviour.
 */
export default function ClientOnly({ children, fallback = null }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? children : fallback;
}
