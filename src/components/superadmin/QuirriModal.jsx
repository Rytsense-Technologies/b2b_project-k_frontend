'use client';

import { useEffect } from 'react';

export default function QuirriModal({
  open,
  onClose,
  title,
  crumb,
  children,
  footer,
  wide = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay show" onClick={onClose} role="presentation">
      <div
        className={`modal${wide ? ' wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-h">
          <div>
            <h3>{title}</h3>
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
