'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  register,
  value,
  onChange,
  placeholder = 'Password',
  error,
  autoComplete = 'current-password',
  inputClassName = 'input-base',
}) {
  const [show, setShow] = useState(false);
  const inputProps = register ? { ...register } : { value, onChange };

  return (
    <div>
      <div className="relative">
        <input
          {...inputProps}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${inputClassName} pr-10 ${error ? 'error' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
