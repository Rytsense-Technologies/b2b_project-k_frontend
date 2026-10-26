'use client';

import { useEffect } from 'react';

/**
 * Sets the browser tab from the portal page title. Root metadata is generic
 * "Quirri"; client layouts cannot export Next metadata.
 */
export function usePortalDocumentTitle(pageTitle, portalName) {
  useEffect(() => {
    const parts = [pageTitle, portalName, 'Quirri']
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .filter((part, index, all) => all.indexOf(part) === index);
    document.title = parts.join(' · ');
  }, [pageTitle, portalName]);
}
