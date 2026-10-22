'use client';

import '@/styles/notification-rules.css';

/**
 * Accessible on/off switch (not a plain button pair).
 *   <Switch checked={on} onChange={(next) => …} label="Password changed" />
 *
 * - role="switch" + aria-checked; Space and Enter toggle (native <button> behaviour).
 * - 44px hit area around a 40×24 track; teal when on, grey when off.
 * - `disabled` (e.g. locked above or saving) keeps it focusable-off and shows the muted track.
 * - `label` is the accessible name when no visible label is linked via `labelledBy`.
 */
export default function Switch({
  checked,
  onChange,
  disabled = false,
  busy = false,
  label,
  labelledBy,
  describedBy,
  id,
  className = '',
}) {
  const toggle = () => {
    if (disabled || busy) return;
    onChange?.(!checked);
  };
  // A native <button>: Enter and Space both fire click, so mouse, keyboard and assistive tech
  // all go through one path.
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
      disabled={disabled}
      className={`q-switch${checked ? ' is-on' : ''}${busy ? ' is-busy' : ''} ${className}`.trim()}
      onClick={toggle}
    >
      <span className="q-switch-track" aria-hidden="true">
        <span className="q-switch-thumb" />
      </span>
    </button>
  );
}
