'use client';

import { Controller } from 'react-hook-form';
import { applyFieldFilter, getFieldRule } from '@/lib/validation';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import QuirriCombobox from '@/components/superadmin/QuirriCombobox';
import IndiaLocationFields from '@/components/superadmin/IndiaLocationFields';

export { QuirriSelect, QuirriCombobox, IndiaLocationFields };

export function QuirriToolbar({ title, subtitle, children }) {
  return (
    <div className="section-head">
      <div>
        <div className="t">{title}</div>
        {subtitle ? <div className="d">{subtitle}</div> : null}
      </div>
      {children ? <div style={{ display: 'flex', gap: 9 }}>{children}</div> : null}
    </div>
  );
}

export function QuirriFilters({ children }) {
  return <div className="toolbar">{children}</div>;
}

export function QuirriHero({ title, description }) {
  return (
    <div className="banner">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function QuirriMetricCards({ items, columns }) {
  return (
    <div className={`stats${columns ? ` c${columns}` : ''}`}>
      {items.map((item) => (
        <div key={item.title || item.k} className="stat">
          <div className="k">{item.title || item.k}</div>
          <div className="v">{item.value ?? item.v}</div>
          {item.trend || item.s ? (
            <div className={`s${item.trendUp ? ' up' : ''}${item.trendDown ? ' down' : ''}`}>
              {item.trend || item.s}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function QuirriSectionTitle({ title, extra, action }) {
  return (
    <div className="card-h">
      <h3>{title}</h3>
      {extra ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>{extra}</span> : null}
      {action}
    </div>
  );
}

export function QuirriTable({ columns, children }) {
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function QuirriLinkButton({ children, onClick, danger = false, type = 'button' }) {
  return (
    <button
      type={type}
      className={`link${danger ? ' danger' : ''}`}
      onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 0, font: 'inherit' }}
    >
      {children}
    </button>
  );
}

export function QuirriBtn({ children, variant = 'default', className = '', type = 'button', onClick, disabled }) {
  const variantClass = {
    primary: 'btn-primary',
    light: 'btn-ghost',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    default: 'btn-ghost',
  }[variant] ?? 'btn-ghost';

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function QuirriFormGrid({ children }) {
  return <div className="grid2">{children}</div>;
}

export function QuirriField({ label, children, full = false, hint, htmlFor, error }) {
  return (
    <div className="field" style={full ? { gridColumn: '1 / -1' } : undefined}>
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {error ? (
        <div className="hint field-error" role="alert">{error}</div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}

/**
 * Catalog-bound text input — uses FIELD_RULES for maxLength, inputMode, charset filter.
 * Wire with react-hook-form via QuirriRHFField or Controlled value/onChange.
 */
export function QuirriControlledField({
  label,
  fieldType,
  name,
  value,
  onChange,
  onBlur,
  error,
  hint,
  full = false,
  disabled = false,
  placeholder,
  id,
  inputRef,
  ...rest
}) {
  const rule = getFieldRule(fieldType);
  const fieldId = id || name || rule.id;

  const handleChange = (e) => {
    const filtered = applyFieldFilter(fieldType, e.target.value, value);
    if (typeof onChange === 'function') {
      onChange(filtered);
    }
  };

  return (
    <QuirriField
      label={label}
      full={full}
      htmlFor={fieldId}
      error={typeof error === 'string' ? error : error?.message}
      hint={hint}
    >
      <input
        ref={inputRef}
        id={fieldId}
        name={name}
        type={rule.type || 'text'}
        inputMode={rule.inputMode}
        autoComplete={rule.autoComplete}
        maxLength={rule.max}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </QuirriField>
  );
}

/** react-hook-form Controller wrapper around QuirriControlledField */
export function QuirriRHFField({
  control,
  name,
  fieldType,
  label,
  hint,
  full,
  disabled,
  placeholder,
  ...rest
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <QuirriControlledField
          fieldType={fieldType}
          label={label}
          name={field.name}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          error={fieldState.error}
          hint={hint}
          full={full}
          disabled={disabled}
          placeholder={placeholder}
          {...rest}
        />
      )}
    />
  );
}

export function QuirriPillList({ items }) {
  return (
    <div className="chips" style={{ marginBottom: 22 }}>
      {items.map((item) => (
        <span key={item} className="chip">{item}</span>
      ))}
    </div>
  );
}

export function SearchBox({ placeholder, value, onChange }) {
  const rule = getFieldRule('search');
  const handleChange = (e) => {
    const next = applyFieldFilter('search', e.target.value, value);
    onChange?.({ ...e, target: { ...e.target, value: next } });
  };
  return (
    <div className="search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4-4" />
      </svg>
      <input
        type="search"
        inputMode={rule.inputMode}
        maxLength={rule.max}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        autoComplete="off"
      />
    </div>
  );
}

export const IconPlus = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
