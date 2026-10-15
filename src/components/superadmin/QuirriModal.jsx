'use client';

import { useId, useRef } from 'react';
import { useOverlay } from './overlayStack';

/**
 * Brand modal. Focus moves in on open, Tab is trapped, focus returns to the opener on close,
 * body scroll is locked, and Esc closes only the topmost overlay (shared overlay stack).
 */
export default function QuirriModal({
  open,
  onClose,
  title,
  crumb,
  children,
  footer,
  wide = false,
  busy = false,
  initialFocus,
}) {
  const ref = useRef(null);
  const titleId = useId();
  useOverlay(open, ref, onClose, { busy, initialFocus });

  if (!open) return null;

  return (
    <div className="overlay show" onClick={() => { if (!busy) onClose?.(); }} role="presentation">
      <div
        ref={ref}
        className={`modal${wide ? ' wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-h">
          <div>
            <h3 id={titleId}>{title}</h3>
            {crumb ? <div className="crumb">{crumb}</div> : null}
          </div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-b">{children}</div>
        {footer ? <div className="modal-f">{footer}</div> : null}
      </div>
    </div>
  );
}
