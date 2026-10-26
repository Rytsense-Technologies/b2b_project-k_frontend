'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function normalizeOptions(options, placeholder) {
  const list = (options || []).map((opt) => {
    if (typeof opt === 'string') return { value: opt, label: opt };
    return { value: opt.value, label: opt.label };
  });
  if (placeholder != null) {
    return [{ value: '', label: placeholder }, ...list.filter((o) => o.value !== '')];
  }
  return list;
}

function emitChange(onChange, name, nextValue) {
  if (typeof onChange !== 'function') return;
  onChange({
    target: { value: nextValue, name: name || undefined },
    currentTarget: { value: nextValue, name: name || undefined },
  });
}

/**
 * Custom Quirri dropdown — never uses the OS native menu
 * (native <select> lists cannot be branded).
 * @see docs/QUIRRI_PRODUCT_UI_RULES.md
 */
export default function QuirriSelect({
  id,
  label,
  hint,
  error,
  full = false,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder,
  disabled = false,
  ariaLabel,
  className = '',
  name,
}) {
  const reactId = useId();
  const selectId = id || name || `quirri-dd-${reactId}`;
  const listId = `${selectId}-listbox`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const items = useMemo(
    () => normalizeOptions(options, placeholder),
    [options, placeholder],
  );

  const current = items.find((o) => String(o.value) === String(value ?? ''))
    || items[0]
    || { value: '', label: placeholder || 'Select' };

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const placeMenu = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxH = Math.min(280, window.innerHeight - r.bottom - 12);
    const openUp = maxH < 120 && r.top > 160;
    setMenuBox({
      left: r.left,
      width: Math.max(r.width, 160),
      top: openUp ? undefined : r.bottom + 6,
      bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: openUp ? Math.min(280, r.top - 12) : maxH,
    });
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    placeMenu();
    const idx = Math.max(0, items.findIndex((o) => String(o.value) === String(value ?? '')));
    setActiveIndex(idx);
    setOpen(true);
  }, [disabled, items, placeMenu, value]);

  const pick = useCallback((next) => {
    emitChange(onChange, name, next);
    close();
    triggerRef.current?.focus();
  }, [close, name, onChange]);

  // Keep the active option visible while moving with the keyboard.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = typeof document !== 'undefined' ? document.getElementById(`${listId}-opt-${activeIndex}`) : null;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, listId, open, menuBox]);

  const typeRef = useRef({ text: '', at: 0 });
  const typeAhead = useCallback((ch, from) => {
    const now = Date.now();
    const t = typeRef.current;
    t.text = now - t.at > 700 ? ch : t.text + ch;
    t.at = now;
    const q = t.text.toLowerCase();
    const base = from < 0 ? 0 : from + (q.length === 1 ? 1 : 0);
    for (let k = 0; k < items.length; k += 1) {
      const i = (base + k) % items.length;
      if (String(items[i].label).toLowerCase().startsWith(q)) return i;
    }
    return -1;
  }, [items]);

  useEffect(() => {
    if (!open) return undefined;
    placeMenu();
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (e.target?.closest?.('.quirri-dd__menu')) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => placeMenu();
    document.addEventListener('mousedown', onDoc);
    // Capture phase: close the menu before a surrounding modal sees Escape.
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [close, open, placeMenu]);

  // Focus stays on the trigger; the active option is exposed via aria-activedescendant.
  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    const { key } = e;
    const printable = key.length === 1 && /\S/.test(key) && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        e.preventDefault();
        openMenu();
      } else if (printable) {
        e.preventDefault();
        const from = items.findIndex((o) => String(o.value) === String(value ?? ''));
        openMenu();
        const i = typeAhead(key, from);
        if (i >= 0) setActiveIndex(i);
      }
      return;
    }
    if (key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (key === 'Home' || key === 'PageUp') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (key === 'End' || key === 'PageDown') {
      e.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) pick(item.value);
      else close();
    } else if (key === 'Tab') {
      close();
    } else if (printable) {
      e.preventDefault();
      const i = typeAhead(key, activeIndex);
      if (i >= 0) setActiveIndex(i);
    }
  };

  const control = (
    <div
      className={`quirri-dd${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${error ? ' is-invalid' : ''}${className ? ` ${className}` : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        id={selectId}
        ref={triggerRef}
        className="quirri-dd__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
        aria-label={label ? undefined : (ariaLabel || placeholder || 'Select')}
        aria-invalid={Boolean(error)}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        onBlur={onBlur}
      >
        <span className={`quirri-dd__value${current.value === '' && placeholder ? ' is-placeholder' : ''}`}>
          {current.label}
        </span>
        <span className="quirri-dd__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {name ? (
        <input type="hidden" name={name} value={value ?? ''} readOnly />
      ) : null}

      {open && menuBox && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="quirri-dd__menu"
            id={listId}
            role="listbox"
            aria-labelledby={selectId}
            style={{
              left: menuBox.left,
              width: menuBox.width,
              top: menuBox.top,
              bottom: menuBox.bottom,
              maxHeight: menuBox.maxHeight,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {items.map((item, index) => {
              const selected = String(item.value) === String(value ?? '');
              const active = index === activeIndex;
              return (
                <div
                  key={`${item.value}-${item.label}`}
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={selected}
                  className={`quirri-dd__option${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(item.value)}
                >
                  <span>{item.label}</span>
                  {selected ? (
                    <svg className="quirri-dd__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" strokeWidth="2.2" />
                    </svg>
                  ) : null}
                </div>
              );
            })}
          </div>,
          document.body,
        )
        : null}
    </div>
  );

  if (!label && !hint && !error) {
    return control;
  }

  return (
    <div className="field" style={full ? { gridColumn: '1 / -1' } : undefined}>
      {label ? <label htmlFor={selectId}>{label}</label> : null}
      {control}
      {error ? (
        <div className="hint field-error" role="alert">{error}</div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}
