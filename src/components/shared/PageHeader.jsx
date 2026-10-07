'use client';

/**
 * Page header architecture (docs/ux/ux-architecture.md §4).
 *
 * Every portal page answers "where am I / what is this / what can I do" in ONE header:
 *   breadcrumbs → H1 title → one-line purpose → actions (one amber primary).
 *
 * Layouts render <PortalTopbar> inside <PageHeaderProvider>. Static pages get their header
 * from the portal's pageMeta (longest-prefix match). Record pages override it at runtime:
 *
 *   usePageHeader({ title: dept.name, subtitle, crumbs: [...], actions: <button/> }, [dept]);
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/student/ui';

const PageHeaderContext = createContext({ header: null, setHeader: () => {} });

export function PageHeaderProvider({ children }) {
  const [header, setHeader] = useState(null);
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

/**
 * Override the page header from a page. Pass `null` fields to fall back to route meta.
 * @param {{ title?: string, subtitle?: string, crumbs?: {label: string, href?: string}[], actions?: React.ReactNode } | null} override
 * @param {any[]} deps
 */
export function usePageHeader(override, deps = []) {
  const { setHeader } = useContext(PageHeaderContext);
  useEffect(() => {
    setHeader(override);
    return () => setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Longest-prefix match so /admin/structure/departments/123 resolves to the most specific meta. */
export function resolvePageMeta(pageMeta, pathname, fallback) {
  const key = Object.keys(pageMeta)
    .filter((k) => pathname === k || pathname?.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  return key ? pageMeta[key] : fallback;
}

export function Breadcrumbs({ items }) {
  if (!items?.length) return null;
  return (
    <nav className="pm-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`}>
              {c.href && !last ? (
                <Link href={c.href}>{c.label}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined}>{c.label}</span>
              )}
              {!last ? <Icon name="chev" size={14} className="pm-crumbs-sep" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Top bar for a portal layout.
 * @param {{ meta: {title, subtitle, crumbs?}, home?: {label, href} }} props
 */
export function PortalTopbar({ meta, home }) {
  const { header } = useContext(PageHeaderContext);
  const title = header?.title ?? meta?.title;
  const subtitle = header?.subtitle ?? meta?.subtitle;
  const baseCrumbs = header?.crumbs ?? meta?.crumbs ?? null;
  const crumbs = baseCrumbs
    ? [...(home ? [home] : []), ...baseCrumbs, ...(header?.crumbs ? [] : [{ label: title }])]
    : null;
  const actions = header?.actions ?? null;

  return (
    <header className={`topbar pm-topbar${crumbs ? ' has-crumbs' : ''}`}>
      <div className="pm-topbar-main">
        {crumbs ? <Breadcrumbs items={crumbs} /> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="pm-topbar-actions">{actions}</div> : null}
    </header>
  );
}
