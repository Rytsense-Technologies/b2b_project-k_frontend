'use client';

import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import { ModulePage, KpiRow, Panel, Icon, SectionState, countLabel } from '@/components/shared/module-ui';
import ScopeNotice from '@/components/faculty/ScopeNotice';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useFacultyScope } from '@/hooks/useFacultyScope';

function when(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** HOD / Faculty home: what is waiting for review in their scope, live. */
export default function FacultyDashboardPage() {
  const { scope } = useFacultyScope();
  const { data, loading, error, reload } = useAsyncResource(() => facultyDirectoryApi.overview(), []);
  const first = loading && !data;
  const kpi = (v) => (first ? null : countLabel(v ?? 0));
  const isHod = Boolean(scope?.is_hod);
  const where = scope?.department_name || 'your department';

  return (
    <ModulePage className="fa-page">
      <PortalHero
        eyebrow={scope ? `${isHod ? 'Head of department' : 'Faculty'} · ${where}` : 'HOD / Faculty'}
        title="Review queue"
        description="Generated chapter videos and MCQs land here for your approval. Nothing reaches students until it is published and its questions are approved."
        secondaryHref="/faculty/videos"
        secondaryLabel="Review videos"
        primaryHref="/faculty/mcq"
        primaryLabel="Review MCQs"
        sideTitle="Your scope"
        sideItems={scope ? [
          {
            id: 'scope',
            title: isHod ? 'Whole department' : scope.read_only ? 'Department, view only' : 'Your subjects',
            body: isHod
              ? `You review every chapter in ${where}, assign mock interviews and see all results.`
              : scope.read_only
                ? 'Your College Admin has not assigned you subjects yet, so you can look but not publish or approve.'
                : `${(scope.subjects || []).map((s) => s.name).join(', ')} — content and students of these subjects.`,
            tone: 'info',
          },
          {
            id: 'publish',
            title: 'You decide what goes live',
            body: 'Chapters stay hidden from students until they are published, and quizzes until their questions are approved.',
            tone: 'info',
          },
        ] : []}
      />

      <ScopeNotice scope={scope} what="chapters and students" />

      {error ? (
        <SectionState
          tone="err"
          title="Could not load your queue"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Try again in a moment.')}
        </SectionState>
      ) : null}

      <KpiRow
        label="Review summary"
        items={[
          { icon: 'video', label: 'Videos to review', value: kpi(data?.videos_awaiting), sub: data ? `${countLabel(data.videos_published)} published · ${countLabel(data.videos_in_progress)} in progress` : 'Sent by your College Admin' },
          { icon: 'check', label: 'MCQ sets to approve', value: kpi(data?.mcq_to_approve), sub: data?.mcq_not_generated ? `${countLabel(data.mcq_not_generated)} chapters without questions yet` : 'Generated and waiting' },
          { icon: 'book', label: 'Subjects', value: kpi(data?.subjects), sub: isHod ? 'In your department' : 'Assigned to you' },
          { icon: 'users', label: 'Students', value: kpi(data?.students), sub: isHod || scope?.read_only ? 'Active in your department' : 'Active in your subjects' },
        ]}
      />

      <div className="fa-dash-cols">
        <Panel
          title="Waiting for you"
          sub={data?.read_only ? 'View only — you can open these but not publish or approve yet.' : 'Newest first. Open one to review it.'}
          bodyClassName=""
        >
          {first ? <SectionState title="Loading…" /> : null}
          {data && !data.queue.length ? (
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="tick" size={20} /></span>
              <div>
                <b>All caught up</b>
                <small>Chapters your College Admin sends for review, and question sets to approve, appear here.</small>
              </div>
            </div>
          ) : null}
          {data?.queue?.length ? (
            <ul className="fa-queue">
              {data.queue.map((q) => (
                <li key={`${q.kind}-${q.job_id}`}>
                  <Link href={`${q.kind === 'video' ? '/faculty/videos' : '/faculty/mcq'}?job=${q.job_id}`}>
                    <span className="sp-row-ic" aria-hidden="true"><Icon name={q.kind === 'video' ? 'video' : 'check'} size={20} /></span>
                    <span className="sp-row-main">
                      <b>{q.chapter_title}</b>
                      <span className="sp-row-meta">
                        {q.kind === 'video' ? 'Video to review' : 'Questions to approve'}
                        {when(q.since) ? ` · ${when(q.since)}` : ''}
                      </span>
                    </span>
                    <span className="fa-go" aria-hidden="true"><Icon name="chev" size={16} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
        <Panel title="Shortcuts" sub="Everything in your scope." bodyClassName="">
          <ul className="fa-queue">
            {[
              { href: '/faculty/subjects', icon: 'book', title: 'Subjects', body: 'Chapters and their review status' },
              { href: '/faculty/students', icon: 'users', title: 'Students', body: 'Progress, quizzes and interviews' },
              { href: '/faculty/interviews', icon: 'mic', title: 'Interview assignments', body: isHod ? 'Assign mock interviews to cohorts' : 'Cohorts and their results' },
              { href: '/faculty/analytics', icon: 'chart', title: 'Analytics', body: 'Completion, scores and Q&A demand' },
            ].map((m) => (
              <li key={m.href}>
                <Link href={m.href}>
                  <span className="sp-row-ic" aria-hidden="true"><Icon name={m.icon} size={18} /></span>
                  <span className="sp-row-main">
                    <b>{m.title}</b>
                    <span className="sp-row-meta">{m.body}</span>
                  </span>
                  <span className="fa-go" aria-hidden="true"><Icon name="chev" size={16} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </ModulePage>
  );
}
