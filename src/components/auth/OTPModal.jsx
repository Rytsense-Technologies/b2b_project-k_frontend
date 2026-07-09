'use client';
import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';

// verifyFn: optional override — receives (phone, otpCode) and must return a Promise.
// If not provided, falls back to authApi.verifyOtp(phone, code, 'login').
export default function OTPModal({ open, phone, onSuccess, onClose, verifyFn }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  if (!open) return null;

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      if (verifyFn) {
        await verifyFn(phone, code);
      } else {
        await authApi.verifyOtp(phone, code, 'login');
      }
      toast.success('Phone verified!');
      onSuccess();
    } catch {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authApi.sendOtp(phone);
      toast.success('OTP resent!');
    } catch {
      toast.error('Failed to resend OTP.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card p-8 w-full max-w-sm mx-4 animate-slide-up">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">Verify your number</h3>
            <p className="text-sm text-slate-500 mt-1">
              Enter the 6-digit OTP sent to <span className="font-medium text-slate-700">{phone}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-1">
            <X size={18} />
          </button>
        </div>

        {/* OTP boxes */}
        <div className="flex gap-2.5 justify-center mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-13 text-center text-lg font-bold border-2 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              style={{ height: 52 }}
            />
          ))}
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-primary">
          {loading ? <span className="spinner" /> : 'Verify OTP'}
        </button>

        <p className="text-center text-xs text-slate-500 mt-4">
          Didn&apos;t receive it?{' '}
          <button className="text-blue-600 font-medium hover:underline" onClick={handleResend}>
            Resend
          </button>
        </p>
      </div>
    </div>
  );
}
