'use client';

import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import AdminEmptyModule from '@/components/admin/AdminEmptyModule';

export default function FacultyDashboardPage() {
  return (
    <div className="animate-fade-in">
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
            title: 'Department & subject limited',
            body: 'You only see content and students assigned to your subjects.',
            tone: 'info',
          },
        ]}
      />

      <div className="stats c3" style={{ marginTop: 4 }}>
        <div className="stat">
          <div className="k">Videos pending</div>
          <div className="v">—</div>
          <div className="s">Needs content review API</div>
        </div>
        <div className="stat">
          <div className="k">MCQs pending</div>
          <div className="v">—</div>
          <div className="s">Needs MCQ review API</div>
        </div>
        <div className="stat">
          <div className="k">Subjects</div>
          <div className="v">—</div>
          <div className="s">Needs EPIC-06 scope data</div>
        </div>
      </div>

      <AdminEmptyModule
        title="Department overview"
        description="Queues and analytics connect when review and academic hierarchy APIs are live."
        epic="content review + EPIC-06"
        actions={<Link className="link" href="/faculty/videos">Open video review →</Link>}
      />
    </div>
  );
}
