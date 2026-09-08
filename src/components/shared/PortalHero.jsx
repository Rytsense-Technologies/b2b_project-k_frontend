'use client';

import Link from 'next/link';

/**
 * Portal hero matching new_updated_design_four dark teal banner + optional side card.
 * Keep CTAs to one amber primary when both primary and secondary are present.
 */
export default function PortalHero({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  sideTitle,
  sideBadge,
  sideItems,
  children,
}) {
  const hasSide = sideTitle || (Array.isArray(sideItems) && sideItems.length) || children;

  return (
    <div className={`q-hero-split${hasSide ? '' : ' q-hero-split--solo'}`}>
      <div className="banner">
        {eyebrow ? <div className="banner-eyebrow">{eyebrow}</div> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {(primaryHref || secondaryHref) ? (
          <div className="banner-cta">
            {secondaryHref && secondaryLabel ? (
              <Link className="btn btn-light" href={secondaryHref}>{secondaryLabel}</Link>
            ) : null}
            {primaryHref && primaryLabel ? (
              <Link className="btn btn-primary" href={primaryHref}>{primaryLabel}</Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasSide ? (
        <div className="q-card-lift" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          {sideTitle ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>{sideTitle}</h3>
              {sideBadge ? (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                  background: 'var(--warning-soft)', color: 'var(--color-warning)',
                }}
                >
                  {sideBadge}
                </span>
              ) : null}
            </div>
          ) : null}
          {children}
          {Array.isArray(sideItems) && sideItems.length ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {sideItems.map((item) => (
                <li key={item.id || item.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 7, height: 7, borderRadius: '50%', flex: 'none', marginTop: 6,
                      background: item.tone === 'error' ? 'var(--color-error)'
                        : item.tone === 'info' ? 'var(--blue-accent)'
                          : 'var(--color-warning)',
                    }}
                    aria-hidden="true"
                  />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{item.title}</div>
                    {item.body ? (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45 }}>{item.body}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
