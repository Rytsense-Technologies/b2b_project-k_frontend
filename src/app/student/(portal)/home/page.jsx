'use client';

import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import AdminEmptyModule from '@/components/admin/AdminEmptyModule';

export default function StudentHomePage() {
  return (
    <div className="animate-fade-in">
      <PortalHero
        eyebrow="Student · your semester"
        title="Welcome back"
        description="Pick up where you left off — watch lectures built from your syllabus, ask the AI tutor, take assessments, or practise a mock interview."
        secondaryHref="/student/subjects"
        secondaryLabel="My subjects"
        primaryHref="/student/interviews"
        primaryLabel="Start mock interview"
        sideTitle="Up next"
        sideItems={[
          {
            id: 'subjects',
            title: 'Continue learning',
            body: 'Subjects and chapter progress appear here when the student learning API is live.',
            tone: 'info',
          },
        ]}
      />

      <div className="stats c4" style={{ marginTop: 4 }}>
        <div className="stat">
          <div className="k">Chapters done</div>
          <div className="v">—</div>
          <div className="s">Needs learning progress API</div>
        </div>
        <div className="stat">
          <div className="k">Assessments</div>
          <div className="v">—</div>
          <div className="s">Needs assessment API</div>
        </div>
        <div className="stat">
          <div className="k">Interviews left</div>
          <div className="v">—</div>
          <div className="s">Needs EPIC-18</div>
        </div>
        <div className="stat">
          <div className="k">Leaderboard</div>
          <div className="v">—</div>
          <div className="s">Needs cohort ranking API</div>
        </div>
      </div>

      <AdminEmptyModule
        title="Learning home"
        description="Classroom, AI tutor and assessment entry points connect when student learning APIs are live."
        epic="student learning + assessment"
        actions={<Link className="link" href="/student/subjects">Browse subjects →</Link>}
      />
    </div>
  );
}
