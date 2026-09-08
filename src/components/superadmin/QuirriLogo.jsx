'use client';

import Image from 'next/image';

const SIZES = {
  sm: { width: 120, height: 40 },
  md: { width: 148, height: 49 },
  lg: { width: 180, height: 60 },
  mark: { width: 36, height: 36 },
};

/**
 * Official Quirri wordmark from /public/quirri-logo.svg
 * Use everywhere instead of the text “ring” placeholder.
 */
export default function QuirriLogo({
  className = '',
  onDark = false,
  size = 'md',
  compact = false,
  priority = false,
  ...rest
}) {
  const key = compact ? 'mark' : size;
  const dims = SIZES[key] || SIZES.md;
  const classes = [
    'quirri-logo',
    compact ? 'quirri-logo--mark' : 'quirri-logo--full',
    onDark ? 'quirri-logo--on-dark' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} role="img" aria-label={rest['aria-hidden'] ? undefined : 'Quirri'} {...rest}>
      <Image
        src="/quirri-logo.svg"
        alt=""
        width={dims.width}
        height={dims.height}
        className="quirri-logo__img"
        priority={priority}
        unoptimized
      />
    </span>
  );
}
