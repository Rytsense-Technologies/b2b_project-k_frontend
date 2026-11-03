import { useEffect, useState } from 'react';
import { rateLimitInfo } from '@/lib/api/superadmin/http';

/** Disable an action for Retry-After seconds after an HTTP 429. */
export function useRetryAfter() {
  const [until, setUntil] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!until) {
      setSeconds(0);
      return undefined;
    }
    const tick = () => {
      const left = Math.ceil((until - Date.now()) / 1000);
      setSeconds(Math.max(0, left));
      if (left <= 0) setUntil(0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);

  return {
    seconds,
    disabled: seconds > 0,
    arm(errOrSeconds) {
      const n = typeof errOrSeconds === 'number'
        ? errOrSeconds
        : (rateLimitInfo(errOrSeconds)?.retryAfter || 0);
      if (n > 0) setUntil(Date.now() + n * 1000);
    },
  };
}
