'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/shared/module-ui';

/**
 * Row action menu (kebab) for Super Admin tables. The menu is portalled to <body> with
 * fixed positioning so a scrolling table never clips it. Esc / outside click / scroll close it.
 * items: [{ label, icon?, onClick, danger?, disabled? }] (falsy entries are skipped)
 */
export default function RowMenu({ label = 'Actions', items }) {
  const list = (items || []).filter(Boolean);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  }, []);

  const toggle = () => {
    if (open) { close(); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 220;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
    const spaceBelow = window.innerHeight - r.bottom;
    const estimated = list.length * 44 + 16;
    const top = spaceBelow < estimated + 8 ? Math.max(8, r.top - estimated - 4) : r.bottom + 4;
    setBox({ top, left, width });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(true); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const btns = [...(menuRef.current?.querySelectorAll('button:not(:disabled)') || [])];
        const i = btns.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
        btns[next]?.focus();
      }
    };
    const onScroll = () => close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    // Focus the first item for keyboard users.
    requestAnimationFrame(() => menuRef.current?.querySelector('button:not(:disabled)')?.focus());
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  if (!list.length) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="un-icon-btn sa-kebab"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open && box && typeof document !== 'undefined' ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className="sa-menu"
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          {list.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              className={`sa-menu-item${it.danger ? ' is-danger' : ''}`}
              disabled={it.disabled}
              onClick={() => { close(true); it.onClick?.(); }}
            >
              {it.icon ? <Icon name={it.icon} size={16} /> : null}
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      ) : null}
    </>
  );
}
