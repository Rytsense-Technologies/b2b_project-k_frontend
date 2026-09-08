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
        close();
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => placeMenu();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [close, open, placeMenu]);

  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) openMenu();
      else if (e.key === 'Enter' || e.key === ' ') {
        const item = items[activeIndex];
        if (item) pick(item.value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) openMenu();
    }
  };

  const onMenuKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(items.length - 1, (i < 0 ? 0 : i) + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) pick(item.value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(items.length - 1);
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
            tabIndex={-1}
            aria-labelledby={selectId}
            style={{
              left: menuBox.left,
              width: menuBox.width,
              top: menuBox.top,
              bottom: menuBox.bottom,
              maxHeight: menuBox.maxHeight,
            }}
            onKeyDown={onMenuKeyDown}
          >
            {items.map((item, index) => {
              const selected = String(item.value) === String(value ?? '');
              const active = index === activeIndex;
              return (
                <button
                  key={`${item.value}-${item.label}`}
                  type="button"
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
                </button>
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
