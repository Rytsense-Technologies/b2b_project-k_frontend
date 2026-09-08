'use client';

/**
 * College Admin module frame — section head + honest empty/error.
 * Never fill tables with sample/demo numbers.
 */
export default function AdminEmptyModule({
  title,
  description,
  epic,
  actions = null,
  children = null,
}) {
  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">{title}</div>
          {description ? <div className="d">{description}</div> : null}
        </div>
        {actions}
      </div>
      <div className="notice info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div>
          <b>Not available yet</b>
          {epic
            ? ` This module connects when ${epic} is live. Nothing is mocked here.`
            : ' This module is not connected to a live API yet. Nothing is mocked here.'}
        </div>
      </div>
      {children}
    </div>
  );
}
