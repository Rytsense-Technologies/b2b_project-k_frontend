'use client';

import QuirriLogo from '@/components/superadmin/QuirriLogo';

/** Shared app logo — always the official Quirri mark from /public/quirri-logo.svg */
export default function Logo({ size = 'md' }) {
  return <QuirriLogo size={size} />;
}
