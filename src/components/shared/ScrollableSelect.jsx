'use client';
import { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/** Visible rows in open list; remainder scroll inside panel */
export const DROPDOWN_VISIBLE_ITEMS = 5;
const ROW_HEIGHT_PX = 40;
export const DROPDOWN_LIST_MAX_HEIGHT = DROPDOWN_VISIBLE_ITEMS * ROW_HEIGHT_PX;
const MENU_GAP = 4;

/**
 * Custom select — open list shows at most 5 options with scroll (native <select> cannot do this).
 * Menu renders in a portal so it is not clipped by overflow containers.
 */
export default function ScrollableSelect({
  value = '',
  onChange,
  options = [],
  disabled = false,
  readOnly = false,
  placeholder = 'Select…',
  className = '',
  buttonClassName = 'input-base',
  id: idProp,
  'aria-label': ariaLabel,
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => setMounted(true), []);

  const updateMenuPosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const openUp = spaceBelow < DROPDOWN_LIST_MAX_HEIGHT && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(DROPDOWN_LIST_MAX_HEIGHT, Math.max(available, ROW_HEIGHT_PX * 2));

    setMenuRect({
      left: rect.left,
      width: rect.width,
      maxHeight,
      top: openUp ? undefined : rect.bottom + MENU_GAP,
      bottom: openUp ? window.innerHeight - rect.top + MENU_GAP : undefined,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const t = e.target;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const isPlaceholder = !selected;

  if (readOnly) {
    return (
      <div className={`relative w-full ${className}`}>
        <div
          className={`${buttonClassName} w-full text-slate-600 cursor-default select-none`}
          aria-label={ariaLabel}
        >
          <span className="truncate block">{isPlaceholder ? '—' : displayLabel}</span>
        </div>
      </div>
    );
  }

  const menu =
    open && !disabled && menuRect && mounted
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-labelledby={id}
            className="fixed z-[9999] py-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto overscroll-contain"
            style={{
              left: menuRect.left,
              width: menuRect.width,
              top: menuRect.top,
              bottom: menuRect.bottom,
              maxHeight: menuRect.maxHeight,
            }}
          >
            {options.map((opt) => {
              const active = value === opt.value;
              return (
                <li key={opt.value || '__empty__'} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3.5 text-sm transition-colors ${
                      active
                        ? 'bg-blue-50 text-[#0b66d6] font-medium'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                    style={{ minHeight: ROW_HEIGHT_PX, lineHeight: `${ROW_HEIGHT_PX - 16}px` }}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={`relative w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className={`${buttonClassName} w-full text-left flex items-center justify-between gap-2 ${
          disabled ? 'cursor-default bg-slate-50 text-slate-600 opacity-100' : ''
        } ${isPlaceholder ? 'text-slate-400' : 'text-slate-800'}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
