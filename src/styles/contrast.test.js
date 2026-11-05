// UX-004 / UX-005: text tokens clear WCAG 1.4.3 AA on the surfaces they sit on.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = (name) => readFileSync(path.join(import.meta.dirname, name), 'utf8');

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (c) => {
  const [r, g, b] = c.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a, pct, b) => a.map((v, i) => Math.round(v * pct + b[i] * (1 - pct)));
const token = (source, name) => {
  const m = source.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return rgb(m[1]);
};

describe('muted text token', () => {
  const design = css('quirri-design.css');
  const muted = token(design, 'neutral-500');

  it.each(['neutral-0', 'neutral-50', 'neutral-100'])('reads at 4.5:1 on --%s', (surface) => {
    expect(ratio(muted, token(design, surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('stays lighter than --neutral-600 so the two text levels remain distinct', () => {
    expect(luminance(muted)).toBeGreaterThan(luminance(token(design, 'neutral-600')));
  });

  it('leaves the frozen login card on its original grey', () => {
    expect(design).toMatch(/\.auth\{--neutral-500:#707A7E;--muted-2:#707A7E\}/);
  });
});

// UIX-003: green and teal text tokens, and the student secondary button, clear AA too.
describe('progress and student text tokens', () => {
  const design = css('quirri-design.css');
  const viz = css('data-viz.css');
  const student = css('student-b2c.css');
  const white = [255, 255, 255];
  const teal = (source, name) => {
    const m = source.match(new RegExp(`--${name}:\\s*var\\(--(teal-\\d+)\\)`));
    if (!m) throw new Error(`token --${name} not found`);
    return token(design, m[1]);
  };

  it.each(['neutral-0', 'neutral-50', 'neutral-100', 'progress-soft'])('--progress-text reads at 4.5:1 on --%s', (surface) => {
    expect(ratio(token(design, 'progress-text'), token(design, surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('--band-strong-text reads at 4.5:1 on white and on its band', () => {
    expect(ratio(token(viz, 'band-strong-text'), white)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(viz, 'band-strong-text'), token(viz, 'band-strong-soft'))).toBeGreaterThanOrEqual(4.5);
  });

  it('white on the student secondary button reads at 4.5:1', () => {
    expect(ratio(white, teal(student, 'sb-secondary'))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(white, teal(css('portal-b2c.css'), 'sb-secondary'))).toBeGreaterThanOrEqual(4.5);
  });

  it('student index text uses a token that reads at 4.5:1, not the light index teal', () => {
    expect(ratio(teal(student, 'sb-index-text'), white)).toBeGreaterThanOrEqual(4.5);
    for (const name of ['student-b2c.css', 'student-dashboard.css', 'student-learning.css', 'student-progress.css']) {
      expect(css(name)).not.toMatch(/[{;]color:var\(--sb-index\)/);
    }
  });

  it('real text never uses the placeholder grey', () => {
    expect(css('portal-modules.css')).not.toMatch(/small[^{]*\{color:var\(--neutral-400\)\}/);
  });
});

describe('data pills', () => {
  const pill = css('data-viz.css').match(/\.mdc-pill\{[\s\S]*?\}/)[0];
  const fill = Number(pill.match(/background:color-mix\(in srgb,var\(--mdc-c\) (\d+)%,#fff\)/)[1]) / 100;
  const text = Number(pill.match(/;color:color-mix\(in srgb,var\(--mdc-c\) (\d+)%,#000\)/)[1]) / 100;
  // Series, band and tone colours that reach --mdc-c (data-viz.jsx).
  const hues = ['#2C74E0', '#54B058', '#F5821F', '#6C3CD8', '#23B6B9', '#0E5C6B', '#5CB414', '#4D8691'];

  it.each(hues)('text on the %s tint reads at 4.5:1', (hue) => {
    const c = rgb(hue);
    expect(ratio(mix(c, text, [0, 0, 0]), mix(c, fill, [255, 255, 255]))).toBeGreaterThanOrEqual(4.5);
  });
});

// Brand orange guideline (design-system.md §2). The owner rejected owner-decision row 1 on 3 Nov 2026
// ("make the orange color keep it as such in guideline for entire product") and accepted UX-002 / UX-003:
// white on #F5821F and #F5821F words on white are the documented brand treatment, not defects.
describe('brand orange guideline', () => {
  const design = css('quirri-design.css');

  it('keeps the one orange #F5821F for the CTA fill, orange words and small highlights', () => {
    for (const name of ['accent', 'accent-text', 'highlight', 'amber-500']) {
      expect(design).toMatch(new RegExp(`--${name}:#F5821F;`));
    }
    expect(design).not.toMatch(/--on-accent:/);
  });

  it('paints white text on the orange primary fills', () => {
    expect(design).toMatch(/\.btn-primary\{background:var\(--accent\);color:#fff\}/);
    expect(css('student-portal.css')).toMatch(/\.sd-btn--amber\{background:var\(--accent\);color:#fff\}/);
    expect(css('student-b2c.css')).toMatch(/\.q-student \.btn-primary\{background:var\(--sb-orange\);color:#fff;/);
  });

  it('leaves the frozen login button on its own orange', () => {
    expect(design).toMatch(/\.auth \.btn-primary\{background:var\(--amber-700\)\}/);
  });
});
