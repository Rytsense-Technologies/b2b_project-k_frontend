'use client';

import { useState } from 'react';
import { Icon } from '@/components/student/ui';
import { bandFor } from '@/components/shared/data-viz';
import { BRAND_ACCENT, BRAND_PRIMARY, PROGRESS } from '@/lib/constants/theme';

const RING_COLOR = { strong: PROGRESS, ok: 'white', focus: BRAND_ACCENT, none: 'white' };
const BAND_LABEL = { strong: 'Strong', ok: 'On track', focus: 'Needs focus', none: 'Not scored' };

/** Draws a 1200×630 score card (teal, Poppins) and downloads it as PNG. */
async function downloadScoreCard({ score, role, typeLabel, date, name }) {
  // next/font registers Poppins under a generated family name — use the page's own stack.
  const family = getComputedStyle(document.body).fontFamily || 'Poppins, sans-serif';
  if (document.fonts?.load) {
    await Promise.all([document.fonts.load(`500 32px ${family}`), document.fonts.load(`700 96px ${family}`)]).catch(() => {});
  }
  const font = (weight, size) => `${weight} ${size}px ${family}`;
  const displayName = String(name || '').replace(/\b\w/g, (c) => c.toUpperCase());
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const band = bandFor(score);

  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(W - 40, -40, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = font(500, 32);
  ctx.fillText('Quirri', 80, 110);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = font(400, 24);
  ctx.fillText('Interview score card', 80, 150);

  ctx.fillStyle = 'white';
  ctx.font = font(700, 56);
  const title = role.length > 26 ? `${role.slice(0, 25)}…` : role;
  ctx.fillText(title, 80, 290);
  ctx.font = font(400, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText([typeLabel, date].filter(Boolean).join('  ·  '), 80, 340);
  if (displayName) ctx.fillText(displayName, 80, 520);
  ctx.font = font(500, 28);
  ctx.fillStyle = 'white';
  ctx.fillText(BAND_LABEL[band], 80, 410);

  const cx = 930;
  const cy = 330;
  const r = 150;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  if (score) {
    ctx.strokeStyle = RING_COLOR[band];
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * score) / 100);
    ctx.stroke();
  }
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.font = font(700, 96);
  ctx.fillText(score == null ? '—' : String(score), cx, cy + 30);
  ctx.font = font(400, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText('out of 100', cx, cy + 72);

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `quirri-score-card-${role.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'interview'}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function ShareResults({ score, role, typeLabel, date, name }) {
  const [busy, setBusy] = useState(false);
  const text = `I scored ${score ?? '—'}/100 in my ${typeLabel.toLowerCase()} for ${role} on Quirri.`;
  const enc = encodeURIComponent(text);

  return (
    <section className="srp-card srp-share" aria-labelledby="srp-share-h">
      <div className="srp-card-h">
        <div>
          <h3 id="srp-share-h">Shareable results</h3>
          <p>Share your progress</p>
        </div>
      </div>
      <div className="srp-share-btns">
        <button
          type="button"
          className="sd-btn sd-btn--outline sd-btn--sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { await downloadScoreCard({ score, role, typeLabel, date, name }); } finally { setBusy(false); }
          }}
        >
          <Icon name="download" size={16} /> {busy ? 'Preparing…' : 'Score card'}
        </button>
        <a className="sd-btn sd-btn--ghost sd-btn--sm" href={`https://www.linkedin.com/feed/?shareActive=true&text=${enc}`} target="_blank" rel="noopener noreferrer">
          <Icon name="send" size={16} /> LinkedIn
        </a>
        <a className="sd-btn sd-btn--ghost sd-btn--sm" href={`https://wa.me/?text=${enc}`} target="_blank" rel="noopener noreferrer">
          <Icon name="chat" size={16} /> WhatsApp
        </a>
      </div>
      <div className="srp-note">
        <b>Score card ready</b>
        <p>Download an image with your score, role and readiness to share.</p>
      </div>
    </section>
  );
}
