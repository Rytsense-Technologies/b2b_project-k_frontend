'use client';

import { QuirriSelect, QuirriField } from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';

/**
 * Upload & Content — UI scaffold only.
 * edu_video exists without College Admin RBAC — do not call until gated.
 */
export default function ContentPage() {
  const { show, hide, TipLayer } = useQuirriTip();

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Upload &amp; Content</div>
          <div className="d">
            Upload chapter by chapter. Each chapter will generate a video lecture and an MCQ set, then route to the department HOD.
          </div>
        </div>
      </div>

      <div className="notice info" style={{ marginBottom: 18 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div>
          <b>Upload disabled for College Admin</b>
          The generation pipeline exists, but college-scoped RBAC is not confirmed yet. This screen is ready; it will not call the API until access is gated. Academic placement also needs EPIC-06.
        </div>
      </div>

      <div className="cols a" style={{ alignItems: 'start', marginBottom: 18 }}>
        <div className="card card-p">
          <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>New chapter upload</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 18 }}>
            Pick the exact location in your academic structure once hierarchy is live.
          </p>
          <div className="grid2">
            <QuirriSelect
              label="Department"
              value=""
              onChange={() => {}}
              disabled
              placeholder="Select department"
              options={[]}
            />
            <QuirriSelect
              label="Program"
              value=""
              onChange={() => {}}
              disabled
              placeholder="Select program"
              options={[]}
            />
          </div>
          <div className="grid2">
            <QuirriSelect
              label="Year"
              value=""
              onChange={() => {}}
              disabled
              placeholder="Select year"
              options={[]}
            />
            <QuirriSelect
              label="Semester"
              value=""
              onChange={() => {}}
              disabled
              placeholder="Select semester"
              options={[]}
            />
          </div>
          <QuirriField label="Subject">
            <input disabled placeholder="Select subject first" />
          </QuirriField>
          <QuirriField label="Chapter title">
            <input disabled placeholder="e.g. Trees & Binary Search Trees" />
          </QuirriField>
          <QuirriField label="Source material">
            <div
              className="drop"
              aria-disabled="true"
              style={{ opacity: 0.7, pointerEvents: 'none' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
              </svg>
              <div className="t">Drop scanned book pages, or click to browse</div>
              <div className="s">PDF, PPT, DOCX or image scans · up to 50 MB · English</div>
            </div>
          </QuirriField>
          <div className="flow" style={{ marginBottom: 16 }}>
            <span className="step">On submit:</span>
            <span>The AI builds a video lecture and an MCQ set, then assigns both to the department HOD for approval.</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled
            aria-label="Upload and generate — not available yet"
            {...{
              onMouseEnter: (e) => show(e, 'Enabled when content RBAC and structure APIs are live', 'top'),
              onMouseLeave: hide,
              onFocus: (e) => show(e, 'Enabled when content RBAC and structure APIs are live', 'top'),
              onBlur: hide,
            }}
          >
            Upload &amp; generate
          </button>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Content status</h3>
            <QuirriSelect
              ariaLabel="Filter by status"
              value=""
              onChange={() => {}}
              disabled
              placeholder="All statuses"
              options={[
                { value: 'generating', label: 'Generating' },
                { value: 'pending', label: 'Pending approval' },
                { value: 'sent_back', label: 'Sent back' },
                { value: 'published', label: 'Published' },
              ]}
            />
          </div>
          <div className="card-sub">Every chapter through review. Visible to you and the HOD.</div>
          <div className="notice info" style={{ margin: 16 }}>
            <div><b>No jobs yet</b> Status rows appear after College Admin can safely call the content pipeline.</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Subject / chapter</th>
                <th>Placement</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4}>No content jobs to show.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>HOD feedback — needs your action</h3></div>
        <div className="card-sub">When an HOD sends a chapter back, it lands here for fix and regenerate.</div>
        <div className="notice info" style={{ margin: 16 }}>
          <div><b>Empty</b> Feedback queue requires content + HOD review APIs.</div>
        </div>
      </div>

      <TipLayer />
    </div>
  );
}
