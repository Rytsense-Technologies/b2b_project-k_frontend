import { describe, expect, it } from 'vitest';
import { codeTakenMessage, createdMessage, savedCodeOf } from './savedCode';

// P4 DECB: a taken code (case-insensitive) is now refused with 409 instead of being swapped
// for the next series code, so the "was already in use" toast is gone and the form shows a field error.
describe('createdMessage', () => {
  it('is plain when the typed code was kept', () => {
    expect(createdMessage('University', 'ab-1', 'AB-1')).toBe('University created');
  });
  it('names the issued code when none was typed', () => {
    expect(createdMessage('College', '', 'COL-0002')).toBe('College created as COL-0002');
    expect(createdMessage('College', '  ', undefined)).toBe('College created');
  });
  it('never claims a reassignment any more', () => {
    expect(createdMessage('University', 'ab-1', 'UNI-0001')).toBe('University created');
  });
});

describe('savedCodeOf', () => {
  it('reads a college create response and a plain record', () => {
    expect(savedCodeOf({ college: { id: 'c1', code: 'COL-0003' }, admins_invited: [] })).toBe('COL-0003');
    expect(savedCodeOf({ code: 'UNI-0001' })).toBe('UNI-0001');
    expect(savedCodeOf(null)).toBeUndefined();
  });
});

describe('codeTakenMessage', () => {
  const detail = 'The code MIT is already in use. Choose another code, or leave it empty for the next one.';
  it('returns the API sentence for a 409 about the code', () => {
    expect(codeTakenMessage({ response: { status: 409, data: { detail } } })).toBe(detail);
  });
  it('ignores other conflicts and other statuses', () => {
    expect(codeTakenMessage({ response: { status: 409, data: { detail: 'Could not allocate a unique college ID. Please try again.' } } })).toBeNull();
    expect(codeTakenMessage({ response: { status: 422, data: { detail } } })).toBeNull();
    expect(codeTakenMessage(null)).toBeNull();
  });
});
