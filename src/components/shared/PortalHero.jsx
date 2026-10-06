'use client';

import Link from 'next/link';

/**
 * Portal hero — Quirri Prep welcome banner pattern (docs/agent/design-system.md §Banner).
 * Solid Teal 500 card · white H2 · CTA row = white secondary + ONE Amber 700 primary.
 * Optional side panel (Teal 500) for a short list such as "Top improvement areas".
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
        <aside className="q-hero-side">
          {sideTitle ? (
            <div className="q-hero-side__h">
              <h3>{sideTitle}</h3>
              {sideBadge ? <span className="q-hero-side__badge">{sideBadge}</span> : null}
            </div>
          ) : null}
          {children ? <div className="q-hero-side__body">{children}</div> : null}
          {Array.isArray(sideItems) && sideItems.length ? (
            <ul>
              {sideItems.map((item) => (
                <li key={item.id || item.title}>
                  <span
                    className={`q-hero-side__dot${item.tone ? ` is-${item.tone}` : ''}`}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="q-hero-side__t">{item.title}</div>
                    {item.body ? <div className="q-hero-side__b">{item.body}</div> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
