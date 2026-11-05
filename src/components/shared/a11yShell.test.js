// UX-006, 008, 009, 010, 011, 013, 014: shell landmarks, headings and field wiring.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(path.join(SRC, p), 'utf8');

const LAYOUTS = [
  'app/superadmin/layout.jsx',
  'app/admin/(portal)/layout.jsx',
  'app/faculty/(portal)/layout.jsx',
  'app/student/(portal)/layout.jsx',
];

describe('portal shell', () => {
  it.each(LAYOUTS)('%s offers a skip link to a focusable main', (file) => {
    const src = read(file);
    expect(src).toMatch(/<SkipLink \/>/);
    expect(src).toMatch(/<main className="content" id="main-content" tabIndex=\{0\}>/);
  });

  it('the skip link targets main and is hidden until focused', () => {
    expect(read('components/shared/SkipLink.jsx')).toMatch(/href="#main-content"/);
    const design = read('styles/quirri-design.css');
    expect(design).toMatch(/\.skip-link\{[^}]*left:-9999px/);
    expect(design).toMatch(/\.skip-link:focus\{[^}]*left:8px/);
  });

  it.each(LAYOUTS.filter((f) => !f.includes('admin/(portal)')))('%s renders the top bar as a banner', (file) => {
    const src = read(file);
    expect(src).toMatch(/<header className="topbar">/);
    expect(src).not.toMatch(/<div className="topbar">/);
  });

  it.each([
    'components/admin/CollegeAdminSidebar.jsx',
    'components/shared/RolePortalSidebar.jsx',
    'components/superadmin/SuperAdminSidebar.jsx',
  ])('%s names its complementary landmark', (file) => {
    expect(read(file)).toMatch(/<aside className=\{`sidebar[^>]*aria-label="Sidebar"/);
  });

  it('the hero side panel names its landmark', () => {
    expect(read('components/shared/PortalHero.jsx')).toMatch(/<aside className="q-hero-side" aria-label=/);
  });
});

describe('heading order', () => {
  it.each([
    ['components/shared/module-ui.jsx', /<div>\s*\{title \? <h2>\{title\}<\/h2> : null\}\s*\{sub/],
    ['components/shared/NotificationRules.jsx', /<h2 id=\{`\$\{gid\}-h`\}>/],
    ['components/shared/McqDocumentReview.jsx', /<h2>Question set<\/h2>/],
    ['components/shared/McqReviewWorkspace.jsx', /<h3 className="mq-group-h">/],
    ['components/shared/SystemNotificationInbox.jsx', /<h3 className="fa-day-h">/],
  ])('%s follows the page h1', (file, pattern) => {
    expect(read(file)).toMatch(pattern);
  });

  it('data-viz card titles are h2', () => {
    expect(read('components/shared/data-viz.jsx')).not.toMatch(/<h3>/);
  });

  it('student progress cards are h2', () => {
    expect(read('app/student/(portal)/progress/page.jsx')).not.toMatch(/<h3>/);
  });

  it('panel styles cover the h2 title', () => {
    for (const [file, sel] of [
      ['styles/quirri-accents.css', '.sp-panel-h :is(h2,h3)'],
      ['styles/student-portal.css', '.sp-panel-h :is(h2,h3)'],
      ['styles/portal-b2c.css', '.sp-panel-h :is(h2,h3)'],
      ['styles/student-settings.css', '.sp-panel-h :is(h2,h3)'],
      ['styles/notification-rules.css', '.nr-card-h :is(h2,h3)'],
      ['styles/portal-faculty.css', '.fa-mcq-head :is(h2,h3)'],
      ['styles/student-progress.css', '.spg-card-h :is(h2,h3)'],
    ]) expect(read(file)).toContain(sel);
    expect(read('styles/quirri-accents.css')).not.toMatch(/\.sp-panel-h h3/);
  });
});

describe('programme list', () => {
  const src = read('components/shared/AcademicStructureWorkspace.jsx');

  it('is a list of pressed buttons, not a broken listbox', () => {
    expect(src).not.toMatch(/role="listbox"/);
    expect(src).not.toMatch(/role="option"/);
    expect(src).toMatch(/aria-pressed=\{p\.id === selectedId\}/);
  });
});

describe('document titles', () => {
  it.each([
    ['app/auth/forgot-password/layout.js', 'Forgot password'],
    ['app/auth/reset-password/layout.js', 'Reset password'],
    ['app/activate/layout.js', 'Activate account'],
  ])('%s sets %s', (file, title) => {
    expect(read(file)).toContain(`export const metadata = { title: '${title}' };`);
  });
});

describe('field errors', () => {
  it('QuirriField ties its error to the control', () => {
    const ui = read('components/superadmin/quirri-ui.jsx');
    expect(ui).toMatch(/'aria-describedby': error \? `\$\{fieldId\}-error` : undefined/);
    expect(ui).toMatch(/errorId=\{`\$\{fieldId\}-error`\}/);
    expect(ui).toMatch(/id=\{errorId\} className="hint field-error"/);
  });

  it('PasswordInput marks and describes the invalid field', () => {
    const src = read('components/auth/PasswordInput.jsx');
    expect(src).toMatch(/aria-invalid=\{Boolean\(error\)\}/);
    expect(src).toMatch(/aria-describedby=\{error \? errorId : undefined\}/);
    expect(src).toMatch(/<div id=\{errorId\} className="err" role="alert">/);
  });

  it('QuirriSelect describes its trigger with the error or hint', () => {
    const src = read('components/superadmin/QuirriSelect.jsx');
    expect(src).toMatch(/aria-describedby=\{error \|\| hint \? `\$\{selectId\}-msg` : undefined\}/);
    expect(src).toMatch(/id=\{`\$\{selectId\}-msg`\} className="hint field-error"/);
  });
});

describe('focus is kept when a control changes or goes busy', () => {
  it('FacultyAccessGate keeps Try again focusable while retrying', () => {
    const src = read('components/faculty/FacultyAccessGate.jsx');
    expect(src).toMatch(/aria-disabled=\{retrying\}/);
    expect(src).not.toMatch(/\sdisabled=\{retrying\}/);
  });

  it('VoiceQnaPanel keeps the typed question focusable and returns focus after rename', () => {
    const src = read('components/student/VoiceQnaPanel.jsx');
    expect(src).toMatch(/readOnly=\{typeBusy\}/);
    expect(src).not.toMatch(/disabled=\{typeBusy\}\s*\n?\s*onChange/);
    expect(src).toMatch(/sl-rename-btn-\$\{/);
    expect(src).toMatch(/renameFocusId/);
  });
});
