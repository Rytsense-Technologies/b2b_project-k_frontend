'use client';

/**
 * Shared module-page kit (all portals) — docs/agent/design-system.md §4b "Module page recipe".
 * Quirri Prep pattern: Teal banner → KPI row → Teal filter bar → cards/list → detail drawer.
 * CSS: student-portal.css (.sp-* / .sd-*) + superadmin-universities.css (.un-*) + portal-modules.css (.pm-*),
 * all loaded globally from src/app/layout.js.
 */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon, Kpi, SectionState } from '@/components/student/ui';
import { SearchBox } from '@/components/superadmin/quirri-ui';

export { Icon, Kpi, SectionState, SearchBox };

export function initials(name = '', fallback = 'Q') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || fallback) + (parts[1]?.[0] || '')).toUpperCase();
}

export function countLabel(n) {
  return n == null || n === '' ? '—' : Number(n).toLocaleString('en-IN');
}

/** Module page wrapper — vertical 24px rhythm. */
export function ModulePage({ className = '', children }) {
  return <div className={`animate-fade-in sp pm-page ${className}`.trim()}>{children}</div>;
}

/** Teal 500 banner with icon tile, overline, H2, lede, optional chips and ONE primary action. */
export function ModuleBanner({ icon = 'layers', eyebrow, title, lede, chips = null, actions = null }) {
  return (
    <section className="sp-banner pm-banner">
      <div className="sp-banner-ic" aria-hidden="true"><Icon name={icon} size={26} /></div>
      <div className="sp-banner-copy">
        {eyebrow ? <div className="sp-banner-eyebrow">{eyebrow}</div> : null}
        <h2>{title}</h2>
        {lede ? <p className="pm-banner-lede">{lede}</p> : null}
        {chips ? <div className="pm-chips">{chips}</div> : null}
      </div>
      {actions ? <div className="sp-banner-cta">{actions}</div> : null}
    </section>
  );
}

/** KPI row. items: [{ icon, label, value, sub, tone }] */
export function KpiRow({ items, label = 'Summary' }) {
  return (
    <section className={`sd-kpis pm-kpis pm-kpis--${Math.min(items.length, 4)}`} aria-label={label}>
      {items.map((k) => (
        <Kpi key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} tone={k.tone} />
      ))}
    </section>
  );
}

/** Teal filter bar. Put SearchBox / QuirriSelect / SegTabs / ViewToggle / buttons inside. */
export function FilterBar({ children, label = 'Filters' }) {
  return (
    <section className="sp-panel un-toolbar pm-filter" aria-label={label}>
      <div className="toolbar">{children}</div>
    </section>
  );
}

/** Segmented control. options: [{ value, label, count? }] */
export function SegTabs({ options, value, onChange, label = 'Filter' }) {
  return (
    <div className="sp-tabs un-seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          role="tab"
          className="sp-tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <Icon name={o.icon} size={16} /> : null}
          {o.label}
          {o.count != null ? <span className="pm-count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ViewToggle({ value, onChange }) {
  return (
    <div className="sp-tabs un-seg" role="tablist" aria-label="View">
      <button type="button" role="tab" className="sp-tab" aria-selected={value === 'grid'} onClick={() => onChange('grid')} aria-label="Card view">
        <Icon name="grid" size={16} />
      </button>
      <button type="button" role="tab" className="sp-tab" aria-selected={value === 'list'} onClick={() => onChange('list')} aria-label="List view">
        <Icon name="list" size={16} />
      </button>
    </div>
  );
}

/** White panel with H4 head (title, sub, action) — Prep card. */
export function Panel({ title, sub, action = null, children, className = '', bodyClassName = 'sp-panel-b' }) {
  return (
    <section className={`sp-panel ${className}`.trim()}>
      {title || action ? (
        <div className="sp-panel-h">
          <div>
            {title ? <h3>{title}</h3> : null}
            {sub ? <p>{sub}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </section>
  );
}

export function StatusPill({ active, on = 'Active', off = 'Inactive', tone }) {
  const t = tone || (active ? 'good' : 'err');
  return (
    <span className={`sp-pill sp-pill--${t}`}>
      <i className="un-dot" aria-hidden="true" />
      {active ? on : off}
    </span>
  );
}

export function IconButton({ icon, label, onClick, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      className={`un-icon-btn${danger ? ' is-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

export function Mono({ name, size = 'md', muted = false }) {
  const cls = size === 'sm' ? ' un-mono--sm' : size === 'lg' ? ' un-mono--lg' : '';
  return <span className={`un-mono${cls}${muted ? ' pm-mono--muted' : ''}`}>{initials(name)}</span>;
}

/** Definition list for drawers / detail panels. items: [{ label, value, full }] */
export function InfoList({ items }) {
  return (
    <dl className="un-dl">
      {items.map((it) => (
        <div key={it.label} className={it.full ? 'is-full' : undefined}>
          <dt>{it.label}</dt>
          <dd>{it.value == null || it.value === '' ? '—' : it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Right-hand detail drawer with Teal hero. Esc and backdrop close. */
export function DetailDrawer({ open, onClose, eyebrow, title, mono, pills = null, stats = null, footer = null, wide = false, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="un-drawer-wrap" role="presentation" onClick={onClose}>
      <aside
        className={`un-drawer${wide ? ' pm-drawer--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? `${title} details` : 'Details'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="un-drawer-hero">
          <button type="button" className="un-drawer-x" onClick={onClose} aria-label="Close details">
            <Icon name="x" size={18} />
          </button>
          {mono ? <span className="un-mono un-mono--lg">{initials(mono)}</span> : null}
          {eyebrow ? <div className="sp-banner-eyebrow">{eyebrow}</div> : null}
          <h2>{title}</h2>
          {pills ? <div className="sp-banner-meta">{pills}</div> : null}
        </div>
        <div className="un-drawer-body">
          {stats ? (
            <div className={`un-drawer-stats pm-drawer-stats--${Math.min(stats.length, 3)}`}>
              {stats.map((s) => <div key={s.label}><small>{s.label}</small><b>{s.value}</b></div>)}
            </div>
          ) : null}
          {children}
        </div>
        {footer ? <div className="un-drawer-foot">{footer}</div> : null}
      </aside>
    </div>
  );
}

export function DrawerSection({ title, action = null, children }) {
  return (
    <section className="un-drawer-sec">
      {title || action ? (
        <div className="un-drawer-sec-h">
          {title ? <h3>{title}</h3> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Numbered form section used inside QuirriModal forms. */
export function FormSection({ n, title, sub, children }) {
  return (
    <section className="un-form-sec">
      <div className="un-form-h">
        {n != null ? <span className="un-form-n">{n}</span> : null}
        <div><b>{title}</b>{sub ? <small>{sub}</small> : null}</div>
      </div>
      {children}
    </section>
  );
}

/** Soft-delete / destructive confirmation body. */
export function ConfirmNote({ danger = false, icon, title, children }) {
  return (
    <div className={`un-confirm${danger ? ' is-danger' : ''}`}>
      <span className="un-confirm-ic"><Icon name={icon || (danger ? 'lock' : 'refresh')} size={22} /></span>
      <div>
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

export function Pager({ page, pageSize, total, shown, onPage, noun = 'items' }) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = total ? Math.min(total, (page - 1) * pageSize + (shown ?? pageSize)) : 0;
  const pages = total ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  if (!total || pages <= 1) return null;
  return (
    <div className="un-pager">
      <span>Showing {countLabel(from)}–{countLabel(to)} of {countLabel(total)} {noun}</span>
      <div>
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="back" size={14} /> Previous
        </button>
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <Icon name="chev" size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Honest "not live yet" module body (no mocks): illustration + what this module will show,
 * what unlocks it, and up to three preview steps.
 */
export function ComingSoon({ icon = 'layers', title, body, unlock, steps = [], actions = null }) {
  return (
    <>
      <section className="sp-empty-hero pm-soon">
        <div className="pm-soon-art" aria-hidden="true">
          <span className="pm-soon-ring" />
          <span className="pm-soon-tile"><Icon name={icon} size={32} /></span>
          <span className="pm-soon-dot" />
        </div>
        <div className="pm-soon-copy">
          <span className="sp-pill sp-pill--teal"><Icon name="clock" size={13} /> Not available yet</span>
          <h2>{title}</h2>
          {body ? <p>{body}</p> : null}
          {unlock ? <p className="pm-soon-unlock">Connects when {unlock} is live. Nothing is mocked here.</p> : null}
          {actions ? <div className="sp-banner-cta">{actions}</div> : null}
        </div>
      </section>
      {steps.length ? (
        <section className="pm-steps" aria-label="What this module will do">
          {steps.map((s, i) => (
            <div key={s.title} className="pm-step">
              <span className="pm-step-n">{i + 1}</span>
              <div>
                <b>{s.title}</b>
                {s.body ? <small>{s.body}</small> : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

/* ==========================================================================
   Record & navigation patterns (docs/ux/ux-architecture.md §4 — Slice 1)
   ========================================================================== */

/**
 * Compact position-in-hierarchy strip. levels: [{ label, state: 'done'|'current'|'later' }]
 * Answers "where does this sit?" without repeating the page title.
 */
export function HierarchyStrip({ label = 'Hierarchy', levels }) {
  return (
    <nav className="pm-hier" aria-label={label}>
      <ol>
        {levels.map((l, i) => (
          <li key={l.label} className={`is-${l.state || 'later'}`} aria-current={l.state === 'current' ? 'true' : undefined}>
            <span className="pm-hier-dot" aria-hidden="true" />
            <span className="pm-hier-label">{l.label}</span>
            {l.state === 'later' ? <span className="pm-hier-note">Not available yet</span> : null}
            {i < levels.length - 1 ? <Icon name="chev" size={14} className="pm-hier-sep" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Record identity card: monogram, overline, name, meta chips and key facts. */
export function RecordHero({ overline, title, mono, muted = false, meta = null, facts = [], children = null }) {
  return (
    <section className="pm-record" aria-label={typeof title === 'string' ? `${title} summary` : 'Summary'}>
      <div className="pm-record-id">
        {mono ? <span className={`un-mono un-mono--lg pm-record-mono${muted ? ' pm-mono--muted' : ''}`}>{initials(mono)}</span> : null}
        <div className="pm-record-t">
          {overline ? <span className="pm-overline">{overline}</span> : null}
          <h2>{title}</h2>
          {meta ? <div className="pm-record-meta">{meta}</div> : null}
        </div>
      </div>
      {facts.length ? (
        <dl className="pm-record-facts">
          {facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd className={f.tone ? `is-${f.tone}` : undefined}>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </section>
  );
}

/** Accessible underline tabs (role=tablist, arrow keys). tabs: [{ value, label, count? }] */
export function TabNav({ tabs, value, onChange, label = 'Sections', idBase = 'tab' }) {
  const onKey = (e) => {
    const i = tabs.findIndex((t) => t.value === value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      onChange(next.value);
      document.getElementById(`${idBase}-${next.value}`)?.focus();
    }
  };
  return (
    <div className="tabs pm-tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t) => (
        <button
          key={t.value}
          id={`${idBase}-${t.value}`}
          type="button"
          role="tab"
          className={`tab${value === t.value ? ' active' : ''}`}
          aria-selected={value === t.value}
          aria-controls={`${idBase}-panel-${t.value}`}
          tabIndex={value === t.value ? 0 : -1}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count != null ? <span className="ct">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ value, current, idBase = 'tab', children }) {
  if (value !== current) return null;
  return (
    <div role="tabpanel" id={`${idBase}-panel-${value}`} aria-labelledby={`${idBase}-${value}`} className="pm-tabpanel">
      {children}
    </div>
  );
}

/**
 * Side form drawer for short create/edit forms (<= 6 fields). Esc / backdrop close,
 * focuses the first field on open and returns focus to the opener on close.
 */
export function FormDrawer({ open, onClose, title, description, footer, children, busy = false }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector('input, select, textarea, button.quirri-dd__trigger');
      el?.focus();
    }, 30);
    const onKey = (e) => { if (e.key === 'Escape' && !busyRef.current) closeRef.current?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      openerRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="un-drawer-wrap pm-form-drawer-wrap" role="presentation" onClick={() => { if (!busy) onClose?.(); }}>
      <aside
        ref={panelRef}
        className="un-drawer pm-form-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-form-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pm-form-drawer-h">
          <div>
            <h2 id="pm-form-drawer-title">{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close" disabled={busy}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="pm-form-drawer-b">{children}</div>
        {footer ? <div className="pm-form-drawer-f">{footer}</div> : null}
      </aside>
    </div>
  );
}

/** Low-frequency, high-risk actions kept at the bottom of a record (progressive disclosure). */
export function DangerZone({ title = 'Status', description, children }) {
  return (
    <section className="pm-danger" aria-label={title}>
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="pm-danger-actions">{children}</div>
    </section>
  );
}

/** Success / next-step callout. links: [{ label, href, icon }] */
export function Callout({ tone = 'success', title, children, links = [], onDismiss }) {
  return (
    <section className={`pm-callout is-${tone}`} role="status">
      <span className="pm-callout-ic" aria-hidden="true"><Icon name={tone === 'success' ? 'tick' : 'info'} size={18} /></span>
      <div className="pm-callout-body">
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
        {links.length ? (
          <div className="pm-callout-links">
            {links.map((l) => (
              <Link key={l.label} href={l.href} className="pm-callout-link">
                {l.icon ? <Icon name={l.icon} size={16} /> : null}{l.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button type="button" className="pm-callout-x" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </section>
  );
}

/** Compact people list for record pages. people: [{ id, name, email, meta }] */
export function PeopleList({ people, empty }) {
  if (!people.length) return empty || null;
  return (
    <ul className="pm-people">
      {people.map((p) => (
        <li key={p.id || p.email}>
          <span className="pm-person">
            <span className="pm-av" aria-hidden="true">{initials(p.name || p.email)}</span>
            <span>
              <b>{p.name || p.email}</b>
              {p.email && p.name ? <small>{p.email}</small> : null}
            </span>
          </span>
          {p.meta ? <span className="pm-people-meta">{p.meta}</span> : null}
        </li>
      ))}
    </ul>
  );
}
