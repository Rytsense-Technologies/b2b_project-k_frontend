'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon, SectionState } from '@/components/student/ui';
import { TabNav, TabPanel } from '@/components/shared/module-ui';
import ReportHero from '@/components/student/reports/ReportHero';
import ReportRecording from '@/components/student/reports/ReportRecording';
import QuestionFeedback from '@/components/student/reports/QuestionFeedback';
import ShareResults from '@/components/student/reports/ShareResults';
import {
  ActionPlan,
  ContinueFooter,
  InterviewLocked,
  KeyInsights,
  NextPractice,
  ReportHighlights,
  SkillBreakdown,
  TryAgainSoon,
} from '@/components/student/reports/ReportSections';
import { interviewApi } from '@/lib/api/interview';
import { reportsApi } from '@/lib/api/reports';
import { asList } from '@/lib/api/superadmin/http';
import { REPORTS_PATH, formatDate, score100, useInterviewReport } from '@/lib/student/interviewReport';
import { titleCase } from '@/lib/student/learning';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { useTabParam } from '@/hooks/useUrlState';
import '@/styles/student-reports.css';

const START_PATH = '/student/interviews';

function typeLabel(t) {
  return t === 'full' ? 'Full interview' : t === 'mock' ? 'Mock interview' : 'Interview';
}

/**
 * The detail response has no role / type / date, so read them (and the previous
 * attempt's score) from the list — newest first, as the backend orders it.
 */
function useReportContext(sessionId, ready) {
  // The list only holds completed reports — fetch it once the report is ready,
  // otherwise a report opened straight after the interview is not in it yet.
  const { data } = useAsyncResource(
    () => (sessionId && ready ? reportsApi.getLivekit({ page: 1, page_size: 100 }) : Promise.resolve(null)),
    [sessionId, ready],
  );
  return useMemo(() => {
    if (!data) return { item: null, previous: undefined };
    const items = asList(data, []);
    const idx = items.findIndex((i) => i.session_id === sessionId);
    if (idx < 0) return { item: null, previous: null };
    const prev = items[idx + 1];
    return { item: items[idx], previous: prev ? score100(prev.score) : null };
  }, [data, sessionId]);
}

function firstNameOf(user) {
  return titleCase(String(user?.first_name || user?.name || '').trim().split(/\s+/)[0] || '');
}

function ReportInner() {
  const params = useSearchParams();
  const sessionId = params.get('session') || params.get('report') || params.get('id') || '';
  const { phase, errorMessage, report, slowHint } = useInterviewReport(sessionId);
  const { item, previous } = useReportContext(sessionId, phase === 'ready');
  const { user } = useAuth();
  const [tab, setTab] = useTabParam(['summary', 'questions', 'plan'], 'summary');
  // Retake / keep-practising actions only for students who can start an interview (S5).
  // Unknown (still loading or failed) -> hide them rather than offer a locked action.
  const { data: eligibility } = useAsyncResource(() => interviewApi.eligibility(), []);
  const canInterview = eligibility ? eligibility.eligible !== false : false;
  const lockReason = eligibility && eligibility.eligible === false
    ? (eligibility.reason || 'AI interviews open in your final year, or when your department assigns one.')
    : null;

  const back = (
    <Link className="srp-back" href={REPORTS_PATH}>
      <Icon name="back" size={16} /> All reports
    </Link>
  );

  if (!sessionId) {
    return (
      <div className="srp">
        <SectionState tone="err" title="No report selected" action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href={REPORTS_PATH}>Go to My reports</Link>}>
          Open a report from My reports.
        </SectionState>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="srp animate-fade-in">
        {back}
        <section className="srp-generating" aria-live="polite">
          <span className="srp-orb" aria-hidden="true"><Icon name="spark" size={24} /></span>
          <div>
            <h2>Generating your report</h2>
            <p>
              {slowHint
                ? 'This is taking longer than usual. You can stay on this page — we will keep checking.'
                : 'Quirri is scoring your answers. This usually takes under a minute.'}
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (phase !== 'ready' || !report) {
    return (
      <div className="srp animate-fade-in">
        {back}
        <SectionState
          tone="err"
          title={phase === 'cancelled' ? 'No report for this interview' : 'Could not load this report'}
          action={<Link className="sd-btn sd-btn--teal sd-btn--sm" href={REPORTS_PATH}><Icon name="back" size={16} /> Back to reports</Link>}
        >
          {errorMessage || 'Please try again.'}
        </SectionState>
      </div>
    );
  }

  const score = score100(report.overall_score);
  const type = item?.interview_type || null;
  const role = titleCase(item?.title || 'Interview');
  const date = formatDate(item?.completed_date || report.recording_started_at);
  const name = titleCase([user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || '');

  return (
    <div className="srp animate-fade-in">
      <div className="srp-head">
        {back}
        <div className="srp-head-meta">
          <span><Icon name="user" size={14} /> {role}</span>
          {type ? <span><Icon name={type === 'full' ? 'layers' : 'mic'} size={14} /> {typeLabel(type)}</span> : null}
          {date ? <span><Icon name="calendar" size={14} /> {date}</span> : null}
        </div>
      </div>

      <ReportHero
        score={score}
        previous={previous}
        firstName={firstNameOf(user)}
        summary={report.summary}
        retakeHref={canInterview ? START_PATH : null}
        lockReason={lockReason}
      />

      <TabNav
        label="Report sections"
        idBase="srp-tab"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'summary', label: 'Summary' },
          { value: 'questions', label: 'Questions', count: Array.isArray(report.turn_scores) ? report.turn_scores.length : undefined },
          { value: 'plan', label: 'Plan' },
        ]}
      />

      <TabPanel value="summary" current={tab} idBase="srp-tab">
        <div className="srp-tabpanel">
          <ReportHighlights report={report} />
          <div className="srp-grid-2">
            <SkillBreakdown breakdown={report.score_breakdown} />
            <KeyInsights items={report.key_insights} />
          </div>
        </div>
      </TabPanel>

      <TabPanel value="questions" current={tab} idBase="srp-tab">
        <div className="srp-tabpanel">
          <QuestionFeedback turns={report.turn_scores} fileBase={`interview-feedback-${role.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`} />
          {/* Recording / audio exist for full interviews only — no empty boxes for mocks. */}
          {type !== 'mock' ? <ReportRecording report={report} sessionId={sessionId} interviewType={type} /> : null}
        </div>
      </TabPanel>

      <TabPanel value="plan" current={tab} idBase="srp-tab">
        <div className="srp-tabpanel">
          <div className="srp-grid-2">
            <NextPractice items={report.recommended_next_practice} />
            <ActionPlan items={report.action_plan} />
          </div>
          <div className="srp-grid-wide">
            <ShareResults score={score} role={role} typeLabel={typeLabel(type)} date={date} name={name} />
            {canInterview ? <TryAgainSoon /> : <InterviewLocked reason={lockReason} />}
          </div>
          {canInterview ? <ContinueFooter href={START_PATH} /> : null}
        </div>
      </TabPanel>
    </div>
  );
}

/** One interview report — score, recording, skills, per-question feedback, insights, plan. */
export default function StudentReportViewPage() {
  return (
    <Suspense fallback={<div className="srp"><SectionState title="Loading report…" /></div>}>
      <ReportInner />
    </Suspense>
  );
}
