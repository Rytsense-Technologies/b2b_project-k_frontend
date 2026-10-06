'use client';

import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import { ModulePage, KpiRow, Panel, Icon } from '@/components/shared/module-ui';

const QUEUES = [
  {
    href: '/faculty/videos',
    icon: 'video',
    title: 'Video review',
    body: 'Preview chapters your College Admin sends, fix slides, then publish to students.',
  },
  {
    href: '/faculty/mcq',
    icon: 'check',
    title: 'MCQ review',
    body: 'Check generated questions and the answer key for each rendered chapter.',
  },
];

const COMING = [
  { href: '/faculty/subjects', icon: 'book', title: 'Subjects' },
  { href: '/faculty/students', icon: 'users', title: 'Students' },
  { href: '/faculty/interviews', icon: 'mic', title: 'Interview assignments' },
  { href: '/faculty/analytics', icon: 'chart', title: 'Department analytics' },
];

export default function FacultyDashboardPage() {
  return (
    <ModulePage className="fa-page">
      <PortalHero
        eyebrow="HOD / Faculty · Department scope"
        title="Review queue"
        description="Generated videos and MCQs land here for your approval. Nothing publishes to students until you approve it."
        secondaryHref="/faculty/videos"
        secondaryLabel="Review videos"
        primaryHref="/faculty/mcq"
        primaryLabel="Review MCQs"
        sideTitle="Your scope"
        sideItems={[
          {
            id: 'scope',
            title: 'Department and subject limited',
            body: 'You only see content and students assigned to your subjects.',
            tone: 'info',
          },
          {
            id: 'publish',
            title: 'You decide what goes live',
            body: 'Chapters stay hidden from students until you publish them.',
            tone: 'info',
          },
        ]}
      />

      <KpiRow
        label="Review summary"
        items={[
          { icon: 'video', label: 'Videos pending', value: null, sub: 'See Video review' },
          { icon: 'check', label: 'MCQ sets to check', value: null, sub: 'See MCQ review' },
          { icon: 'book', label: 'Subjects', value: null, sub: 'Shown when subjects go live' },
        ]}
      />

      <div className="fa-dash-cols">
        <Panel
          title="Your review queues"
          sub="Open a queue to see what is waiting for you."
          bodyClassName=""
        >
          <ul className="fa-queue">
            {QUEUES.map((q) => (
              <li key={q.href}>
                <Link href={q.href}>
                  <span className="sp-row-ic" aria-hidden="true"><Icon name={q.icon} size={20} /></span>
                  <span className="sp-row-main">
                    <b>{q.title}</b>
                    <span className="sp-row-meta">{q.body}</span>
                  </span>
                  <span className="fa-go" aria-hidden="true"><Icon name="chev" size={16} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Department overview"
          sub="These modules connect when the academic hierarchy is live."
          bodyClassName=""
        >
          <ul className="fa-soon-list">
            {COMING.map((m) => (
              <li key={m.href}>
                <Link href={m.href}>
                  <span className="sp-row-ic sp-row-ic--muted" aria-hidden="true"><Icon name={m.icon} size={18} /></span>
                  <b>{m.title}</b>
                  <span className="sp-pill">Not available yet</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </ModulePage>
  );
}
