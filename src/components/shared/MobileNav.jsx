'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Phone navigation for portal shells (≤860px the sidebar is off-canvas).
 * Wrap the shell with `className={mobileNavShellClass(navOpen)}`, put
 * <MobileNavButton> first in the topbar and <MobileNavScrim> next to the
 * sidebar. Closes on route change, Escape and a tap outside.
 */
export function useMobileNav() {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return { navOpen, openNav: () => setNavOpen(true), closeNav: () => setNavOpen(false) };
}

export function mobileNavShellClass(navOpen) {
  return `q-drawer-shell${navOpen ? ' is-nav-open' : ''}`;
}

export function MobileNavButton({ navOpen, onOpen }) {
  return (
    <button type="button" className="q-nav-btn" aria-label="Open menu" aria-expanded={navOpen} onClick={onOpen}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

export function MobileNavScrim({ navOpen, onClose }) {
  return navOpen ? <button type="button" className="q-nav-scrim" aria-label="Close menu" onClick={onClose} /> : null;
}
