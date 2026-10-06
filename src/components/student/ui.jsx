'use client';

/**
 * Small shared UI pieces for the student portal (icons, states, chips).
 * Visual system: src/styles/student-portal.css (.sd-* / .sp-*).
 */

const PATHS = {
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7" />,
  play: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>,
  playFill: <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" />,
  check: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>,
  tick: <path d="M5 12l5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  mic: <path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4zM5 11a7 7 0 0 0 14 0M12 18v3" />,
  micOff: <path d="M3 3l18 18M9 9v2a3 3 0 0 0 5 2.2M15 9.3V6a3 3 0 0 0-5.7-1.3M19 11a7 7 0 0 1-1.1 3.8M5 11a7 7 0 0 0 11 5.7M12 18v3" />,
  clip: <path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12l2 2 4-4" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M15 18l-6-6 6-6" />,
  chev: <path d="M9 6l6 6-6 6" />,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  doc: <><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M15 3v5h5" /></>,
  download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  upload: <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />,
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 4.5a3.2 3.2 0 0 1 0 6.4M18 14.8c1.8.7 3 2.5 3 5.2" /></>,
  userPlus: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M18 8v6M15 11h6" /></>,
  building: <><path d="M3 21h18M5 21V8l7-4 7 4v13" /><path d="M10 21v-6h4v6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  alert: <><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  tree: <><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-2h12v2" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M15 8l2 2" /></>,
  phone2: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
};

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`sd-i ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.info}
    </svg>
  );
}

export function SectionState({ tone = 'info', title, children, action = null }) {
  return (
    <div className={`sd-state sd-state--${tone}`} role={tone === 'err' ? 'alert' : undefined}>
      <Icon name={tone === 'err' ? 'info' : 'info'} size={18} />
      <div className="sd-state-body">
        <b>{title}</b>
        {children ? <span>{children}</span> : null}
        {action ? <div className="sd-state-action">{action}</div> : null}
      </div>
    </div>
  );
}

export function Kpi({ icon, label, value, sub, tone }) {
  return (
    <div className="sd-kpi">
      <div className="sd-kpi-h"><Icon name={icon} size={16} /><span>{label}</span></div>
      <div className={`sd-kpi-v${tone ? ` is-${tone}` : ''}`}>{value ?? '—'}</div>
      {sub ? <div className="sd-kpi-s">{sub}</div> : null}
    </div>
  );
}

/** Score → tone key used by .sp-score / .sd-tone-- classes. */
export function scoreToneKey(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'none';
  if (n >= 75) return 'good';
  if (n >= 50) return 'mid';
  return 'low';
}
