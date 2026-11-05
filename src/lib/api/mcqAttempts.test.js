// Owner decision 9 (BACKEND-006): staff see how many attempts exist before they regenerate or edit an approved quiz.
import { describe, expect, it } from 'vitest';
import { mcqAttemptCount, mcqAttemptWarning } from './mcq';

describe('quiz attempt warning', () => {
  it('reads the attempt count from the staff MCQ document', () => {
    expect(mcqAttemptCount({ attempt_count: 3 })).toBe(3);
    expect(mcqAttemptCount({ attempt_count: '2' })).toBe(2);
    expect(mcqAttemptCount({ attempt_count: 0 })).toBe(0);
  });

  it('returns null when the backend sends no count (no guessed number)', () => {
    expect(mcqAttemptCount(null)).toBeNull();
    expect(mcqAttemptCount({})).toBeNull();
    expect(mcqAttemptCount({ attempt_count: -1 })).toBeNull();
    expect(mcqAttemptCount({ attempt_count: 'x' })).toBeNull();
  });

  it('words the warning with the count', () => {
    expect(mcqAttemptWarning(1)).toBe('1 student attempt already exists. That student keeps their score and stays locked.');
    expect(mcqAttemptWarning(4)).toBe('4 student attempts already exist. Those students keep their scores and stay locked.');
    expect(mcqAttemptWarning(0)).toBe('No student has attempted this quiz yet.');
    expect(mcqAttemptWarning(null)).toBeNull();
  });
});
