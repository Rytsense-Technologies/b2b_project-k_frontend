// XB-003: en-IN short months spell September "Sept" in Chrome, Firefox and WebKit alike.
// The design system writes three-letter months ("5 Sep 2026"), as lib/superadmin/format.js already does.
import { describe, expect, it } from 'vitest';
import { formatDate } from './utils';
import { formatDate as learningDate, formatDateTime as learningDateTime } from './student/learning';

const SEPT = '2026-09-05T09:00:00';

describe('short dates in September', () => {
  it('lib/utils formatDate uses Sep', () => {
    expect(formatDate(SEPT)).toBe('5 Sep 2026');
  });
  it('student learning dates use Sep', () => {
    expect(learningDate(SEPT)).toBe('5 Sep 2026');
    expect(learningDateTime(SEPT)).toMatch(/^5 Sep 2026 · /);
  });
  it('other months are unchanged', () => {
    expect(formatDate('2026-10-05T09:00:00')).toBe('5 Oct 2026');
  });
});
