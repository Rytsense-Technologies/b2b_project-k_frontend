'use client';

import { useState } from 'react';

const EYE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EYE_OFF = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.4 0 10 7 10 7a17 17 0 0 1-2.5 3.35M6.6 6.6A17 17 0 0 0 2 11s3.6 7 10 7a9 9 0 0 0 5.4-1.6" />
    <path d="M2 2l20 20" />
  </svg>
);

export default function PasswordInput({
  register,
  value,
  onChange,
  placeholder = '••••••••',
  error,
  autoComplete = 'current-password',
  id,
  inputClassName = '',
  maxLength,
}) {
  const [show, setShow] = useState(false);
  const inputProps = register ? { ...register } : { value, onChange };

  return (
    <div>
      <div className="pw-wrap">
        <input
          {...inputProps}
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`${inputClassName}${error ? ' invalid' : ''}`.trim()}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? EYE_OFF : EYE}
        </button>
      </div>
      {error ? <div className="err">{error}</div> : null}
    </div>
  );
}
