'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function normalizeOptions(options) {
  return (options || []).map((opt) => {
    if (typeof opt === 'string') return { value: opt, label: opt };
    return { value: opt.value, label: opt.label };
  });
}

function emitChange(onChange, name, nextValue) {
  if (typeof onChange !== 'function') return;
  onChange({
    target: { value: nextValue, name: name || undefined },
    currentTarget: { value: nextValue, name: name || undefined },
  });
}

/**
 * Searchable Quirri listbox — type to filter; same chrome as QuirriSelect.
 * Use for India state / district (and any long option lists).
 */
export default function QuirriCombobox({
  id,
  label,
  hint,
  error,
  full = false,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Type to search…',
  disabled = false,
  ariaLabel,
  className = '',
  name,
  emptyMessage = 'No matches',
}) {
  const reactId = useId();
  const selectId = id || name || `quirri-cb-${reactId}`;
  const listId = `${selectId}-listbox`;
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState('');

  const items = useMemo(() => normalizeOptions(options), [options]);

  const selected = items.find((o) => String(o.value) === String(value ?? ''));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o) => o.label.toLowerCase().includes(q));
  }, [items, query]);

  const displayValue = open ? query : (selected?.label ?? '');

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setQuery('');
  }, []);

  const placeMenu = useCallback(() => {
    const el = inputRef.current;
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
    setQuery(selected?.label || '');
    placeMenu();
    setActiveIndex(0);
    setOpen(true);
  }, [disabled, placeMenu, selected?.label]);

  const pick = useCallback((next) => {
    emitChange(onChange, name, next);
    close();
    inputRef.current?.blur();
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
        inputRef.current?.blur();
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

  const onInputKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) openMenu();
      else setActiveIndex((i) => Math.min(filtered.length - 1, (i < 0 ? 0 : i) + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) openMenu();
      else setActiveIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[activeIndex]) pick(filtered[activeIndex].value);
      else if (!open) openMenu();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  };

  const control = (
    <div
      className={`quirri-dd quirri-cb${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${error ? ' is-invalid' : ''}${className ? ` ${className}` : ''}`}
      ref={rootRef}
    >
      <div className="quirri-dd__trigger quirri-cb__trigger">
        <input
          id={selectId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={label ? undefined : (ariaLabel || placeholder || 'Search')}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) {
              placeMenu();
              setOpen(true);
            }
            setActiveIndex(0);
            if (value) emitChange(onChange, name, '');
          }}
          onFocus={() => {
            if (!disabled) openMenu();
          }}
          onKeyDown={onInputKeyDown}
          onBlur={onBlur}
        />
        <span className="quirri-dd__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {name ? (
        <input type="hidden" name={name} value={value ?? ''} readOnly />
      ) : null}

      {open && menuBox && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="quirri-dd__menu"
            id={listId}
            role="listbox"
            style={{
              left: menuBox.left,
              width: menuBox.width,
              top: menuBox.top,
              bottom: menuBox.bottom,
              maxHeight: menuBox.maxHeight,
            }}
          >
            {filtered.length === 0 ? (
              <div className="quirri-dd__empty">{emptyMessage}</div>
            ) : (
              filtered.map((item, index) => {
                const selectedRow = String(item.value) === String(value ?? '');
                const active = index === activeIndex;
                return (
                  <button
                    key={`${item.value}-${item.label}`}
                    type="button"
                    role="option"
                    aria-selected={selectedRow}
                    className={`quirri-dd__option${selectedRow ? ' is-selected' : ''}${active ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(item.value)}
                  >
                    <span>{item.label}</span>
                    {selectedRow ? (
                      <svg className="quirri-dd__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path d="M5 12l5 5L20 7" strokeWidth="2.2" />
                      </svg>
                    ) : null}
                  </button>
                );
              })
            )}
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
