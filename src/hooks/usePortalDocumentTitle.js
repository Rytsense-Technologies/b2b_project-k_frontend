'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Sets the browser tab from the portal page title. Root metadata is generic
 * "Quirri"; client layouts cannot export Next metadata.
 *
 * App Router also resets <title> to that default on client navigations that
 * only change the query string (same pathname). Re-apply when that happens.
 */
export function usePortalDocumentTitle(pageTitle, portalName) {
  const pathname = usePathname();
  useEffect(() => {
    const parts = [pageTitle, portalName, 'Quirri']
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .filter((part, index, all) => all.indexOf(part) === index);
    const next = parts.join(' · ');
    const apply = () => {
      if (document.title !== next) document.title = next;
    };
    apply();

    // Observe <head>, not the <title> node — App Router replaces that node
    // on client navigations (including query-string-only changes).
    const observer = typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(apply);
    observer?.observe(document.head, { childList: true, characterData: true, subtree: true });
    const later = [0, 50, 200].map((ms) => window.setTimeout(apply, ms));
    return () => {
      observer?.disconnect();
      later.forEach((id) => window.clearTimeout(id));
    };
  }, [pageTitle, portalName, pathname]);
}
