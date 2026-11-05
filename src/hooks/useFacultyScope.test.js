// FE-007: a failed /faculty/me is an error with Retry, never an endless load.
import { describe, expect, it } from 'vitest';
import { facultyMenuKind, scopeFailure } from '@/components/faculty/facultyNav';

describe('scopeFailure', () => {
  it('is none while there is no error', () => {
    expect(scopeFailure(null)).toBe('none');
  });

  it('recognises the no-department answer', () => {
    expect(scopeFailure({ response: { status: 400, data: { detail: 'No department assigned' } } })).toBe('no_department');
  });

  it.each([
    [{ response: { status: 500 } }],
    [{ response: { status: 400, data: { detail: 'Bad request' } } }],
    [new Error('Network Error')],
  ])('anything else is a retryable failure', (err) => {
    expect(scopeFailure(err)).toBe('failed');
  });
});

describe('facultyMenuKind', () => {
  const failed = { response: { status: 500 } };

  it('keeps the base menu when the scope failed to load', () => {
    expect(facultyMenuKind({ scope: null, error: failed, role: 'faculty' })).toBe('faculty');
  });

  it('shows nothing while the scope is simply loading', () => {
    expect(facultyMenuKind({ scope: null, error: null, role: 'faculty' })).toBeNull();
  });

  it('a definite hod session gets the HOD menu at once', () => {
    expect(facultyMenuKind({ scope: null, error: null, role: 'hod' })).toBe('hod');
  });

  it('the scope decides once it has loaded', () => {
    expect(facultyMenuKind({ scope: { is_hod: true }, error: null, role: 'faculty' })).toBe('hod');
    expect(facultyMenuKind({ scope: { is_hod: false }, error: null, role: 'hod' })).toBe('faculty');
  });
});
