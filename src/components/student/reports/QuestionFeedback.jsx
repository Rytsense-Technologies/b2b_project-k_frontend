'use client';

import { Icon } from '@/components/student/ui';
import { scoreBandKey, turnScore100 } from '@/lib/student/interviewReport';

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a UTF-8 BOM so Excel opens it with the right characters. */
function downloadCsv(turns, fileBase) {
  const rows = [
    ['#', 'Question', 'Your answer', 'AI feedback', 'Score (out of 100)'],
    ...turns.map((t, i) => [i + 1, t.question, t.answer, t.ai_feedback, turnScore100(t.score) ?? '']),
  ];
  const csv = `﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileBase}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ScoreCell({ score }) {
  const s = turnScore100(score);
  return <span className={`srp-qscore srp-tone--${scoreBandKey(s)}`}>{s == null ? '—' : `${s}/100`}</span>;
}

export default function QuestionFeedback({ turns, fileBase = 'interview-feedback' }) {
  const list = Array.isArray(turns) ? turns : [];
  return (
    <section className="srp-card" aria-labelledby="srp-q-h">
      <div className="srp-card-h">
        <div>
          <h3 id="srp-q-h">Question feedback</h3>
          <p>{list.length ? `Showing ${list.length} of ${list.length} question${list.length === 1 ? '' : 's'}` : 'Feedback on each answer'}</p>
        </div>
        {list.length ? (
          <button type="button" className="sd-btn sd-btn--outline sd-btn--sm" onClick={() => downloadCsv(list, fileBase)}>
            <Icon name="download" size={16} /> Download for Excel
          </button>
        ) : null}
      </div>

      {!list.length ? (
        <p className="srp-muted">No question-level feedback was returned for this interview.</p>
      ) : (
        <>
          <div className="srp-qtable-wrap">
            <table className="srp-qtable">
              <thead>
                <tr>
                  <th scope="col">Questions</th>
                  <th scope="col">Your answers</th>
                  <th scope="col">AI feedback</th>
                  <th scope="col">Score</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t, i) => (
                  <tr key={t.turn_number ?? i}>
                    <td>
                      <div className="srp-q">
                        <span className="srp-q-n" aria-hidden="true">{i + 1}</span>
                        <span>{t.question || `Question ${i + 1}`}</span>
                      </div>
                    </td>
                    <td>
                      <div className="srp-bubble"><Icon name="mic" size={14} /><span>{t.answer || <span className="srp-muted">No answer recorded</span>}</span></div>
                    </td>
                    <td>
                      {t.ai_feedback ? (
                        <div className="srp-bubble srp-bubble--ai"><Icon name="spark" size={14} /><span>{t.ai_feedback}</span></div>
                      ) : <span className="srp-muted">—</span>}
                    </td>
                    <td><ScoreCell score={t.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ol className="srp-qcards">
            {list.map((t, i) => (
              <li key={t.turn_number ?? i} className="srp-qcard">
                <div className="srp-qcard-h">
                  <span className="srp-q-n" aria-hidden="true">{i + 1}</span>
                  <span>{t.question || `Question ${i + 1}`}</span>
                  <ScoreCell score={t.score} />
                </div>
                <div className="srp-bubble"><Icon name="mic" size={14} /><span>{t.answer || <span className="srp-muted">No answer recorded</span>}</span></div>
                {t.ai_feedback ? <div className="srp-bubble srp-bubble--ai"><Icon name="spark" size={14} /><span>{t.ai_feedback}</span></div> : null}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
