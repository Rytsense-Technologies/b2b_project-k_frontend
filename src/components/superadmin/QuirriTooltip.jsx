'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Quirri floating tip — professional hover/focus label.
 * Never use native HTML `title` for UI hints (OS black tooltips).
 *
 * Placement: right | left | top | bottom
 */
export function useQuirriTip() {
  const [tip, setTip] = useState(null);

  const hide = useCallback(() => setTip(null), []);

  const show = useCallback((event, label, placement = 'right') => {
    const text = typeof label === 'string' ? label.trim() : '';
    if (!text) return;
    const el = event.currentTarget;
    if (!el?.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const gap = 10;
    let top = r.top + r.height / 2;
    let left = r.right + gap;
    let transform = 'translateY(-50%)';

    if (placement === 'left') {
      left = r.left - gap;
      transform = 'translate(-100%, -50%)';
    } else if (placement === 'top') {
      top = r.top - gap;
      left = r.left + r.width / 2;
      transform = 'translate(-50%, -100%)';
    } else if (placement === 'bottom') {
      top = r.bottom + gap;
      left = r.left + r.width / 2;
      transform = 'translate(-50%, 0)';
    }

    setTip({
      label: text,
      top,
      left,
      transform,
      placement,
    });
  }, []);

  useEffect(() => {
    if (!tip) return undefined;
    const onScroll = () => setTip(null);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [tip]);

  const TipLayer = useCallback(() => {
    if (!tip || typeof document === 'undefined') return null;
    return createPortal(
      <div
        className={`quirri-tooltip quirri-tooltip--${tip.placement}`}
        role="tooltip"
        style={{
          top: tip.top,
          left: tip.left,
          transform: tip.transform,
        }}
      >
        <span className="quirri-tooltip__arrow" aria-hidden="true" />
        <span className="quirri-tooltip__label">{tip.label}</span>
      </div>,
      document.body,
    );
  }, [tip]);

  return { tip, show, hide, TipLayer };
}

/**
 * Wrap a control to show a Quirri tip on hover/focus.
 * Prefer aria-label on the child for accessibility; tip is visual only.
 */
export default function QuirriTooltip({
  label,
  placement = 'right',
  disabled = false,
  children,
  className = '',
}) {
  const { show, hide, TipLayer } = useQuirriTip();
  const tipId = useId();

  if (disabled || !label) {
    return children;
  }

  return (
    <span
      className={`quirri-tip-anchor${className ? ` ${className}` : ''}`}
      onMouseEnter={(e) => show(e, label, placement)}
      onMouseLeave={hide}
      onFocus={(e) => show(e, label, placement)}
      onBlur={hide}
      aria-describedby={undefined}
      data-tip-id={tipId}
    >
      {children}
      <TipLayer />
    </span>
  );
}
