'use client';

import Link from 'next/link';
import { Icon } from '@/components/student/ui';

/**
 * Interviews module header — deep teal banner + Practice / My reports switcher.
 * Shared by /student/interviews and /student/interviews/reports.
 */
export default function InterviewNav({ active = 'practice', reportCount = null, children = null }) {
  return (
    <>
      <section className="sp-banner iv-banner">
        <div className="sp-banner-ic" aria-hidden="true"><Icon name="mic" size={26} /></div>
        <div className="sp-banner-copy">
          <div className="sp-banner-eyebrow">AI mock interviews</div>
          <h2>Practise like it&apos;s the real thing</h2>
          <p className="iv-banner-lede">
            Speak with an AI interviewer built around your resume and target role, then get a scored
            report with feedback on every answer.
          </p>
          {children ? <div className="sp-banner-meta">{children}</div> : null}
        </div>
        <svg className="iv-banner-art" viewBox="0 0 180 130" aria-hidden="true">
          <circle cx="98" cy="66" r="60" fill="rgba(255,255,255,.06)" />
          <rect x="34" y="30" width="86" height="54" rx="10" fill="rgba(255,255,255,.14)" />
          <path d="M48 50h44M48 62h30" stroke="rgba(255,255,255,.7)" strokeWidth="5" strokeLinecap="round" />
          <path d="M60 84l-10 14 22-14z" fill="rgba(255,255,255,.14)" />
          <rect x="86" y="56" width="70" height="44" rx="10" fill="#FFFFFF" />
          <path d="M100 72h40M100 84h24" stroke="#0E5C6B" strokeWidth="5" strokeLinecap="round" />
          <circle cx="160" cy="22" r="6" fill="#F5821F" />
        </svg>
      </section>

      <nav className="sp-tabs" aria-label="Interviews sections">
        <Link
          href="/student/interviews"
          className="sp-tab"
          aria-selected={active === 'practice'}
          aria-current={active === 'practice' ? 'page' : undefined}
        >
          <Icon name="mic" size={16} /> Practice
        </Link>
        <Link
          href="/student/interviews/reports"
          className="sp-tab"
          aria-selected={active === 'reports'}
          aria-current={active === 'reports' ? 'page' : undefined}
        >
          <Icon name="chart" size={16} /> My reports
          {reportCount != null ? <span className="iv-tab-count">{reportCount}</span> : null}
        </Link>
      </nav>
    </>
  );
}
