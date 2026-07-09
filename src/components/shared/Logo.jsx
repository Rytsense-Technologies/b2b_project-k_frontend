'use client';
import Image from 'next/image';
import projectKLogo from '@/assets/images/project-k-logo.svg';

export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { width: 150, height: 50 },
    md: { width: 190, height: 70 },
    lg: { width: 220, height: 69 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center justify-center">
      <Image
        src={projectKLogo}
        alt="Project K"
        width={s.width}
        height={s.height}
        priority
      />
    </div>
  );
}
