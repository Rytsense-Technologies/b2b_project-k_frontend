'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';

export default function StructurePage() {
  const { show, hide, TipLayer } = useQuirriTip();

  return (
    <>
      <AdminEmptyModule
        title="Academic Structure"
        description="Department → Program → Year → Semester → Subject → Chapter. Everything else in the platform hangs off this tree."
        epic="EPIC-06 (academic hierarchy)"
        actions={(
          <button
            type="button"
            className="btn btn-primary"
            disabled
            aria-label="New department — not available yet"
            onMouseEnter={(e) => show(e, 'Available when academic hierarchy API is live', 'top')}
            onMouseLeave={hide}
            onFocus={(e) => show(e, 'Available when academic hierarchy API is live', 'top')}
            onBlur={hide}
          >
            New department
          </button>
        )}
      >
        <div className="tree-wrap" style={{ marginTop: 8 }}>
          <div className="card card-p">
            <div className="card-h"><h3>Structure tree</h3></div>
            <p className="card-sub" style={{ marginBottom: 12 }}>
              Departments and programs will appear here once EPIC-06 is connected. No sample tree is shown.
            </p>
            <div className="notice info">
              <div><b>Empty</b> Create your first department when the hierarchy API ships.</div>
            </div>
          </div>
          <div className="card card-p">
            <div className="crumb" style={{ marginBottom: 8 }}>College · Structure</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Subject detail</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
              Select a subject in the tree to manage chapters, videos, and HOD assignment.
            </p>
            <div className="flow">
              <span>Approval flow:</span>
              <span className="step">Upload</span><span className="arr">→</span>
              <span className="step">AI generates</span><span className="arr">→</span>
              <span className="step">HOD approves</span><span className="arr">→</span>
              <span className="step done">Live for students</span>
            </div>
          </div>
        </div>
      </AdminEmptyModule>
      <TipLayer />
    </>
  );
}
