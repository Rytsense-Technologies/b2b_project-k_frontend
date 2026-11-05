// P4 DECB: seats_used (active + pending, deactivated excluded) drives the seat cap; student_count is unchanged.
import { describe, expect, it } from 'vitest';
import { collegeStats } from './collegeStats';

describe('collegeStats seats', () => {
  it('uses seats_used for the seat meter and keeps student_count for the student total', () => {
    const s = collegeStats({ student_count: 120, seats_used: 95, student_seat_cap: 100 });
    expect(s.students).toBe(120);
    expect(s.seats).toBe(95);
    expect(s.pct).toBe(95);
  });
  it('falls back to the student count when seats_used is absent', () => {
    const s = collegeStats({ student_count: 40, student_seat_cap: 80 });
    expect(s.seats).toBe(40);
    expect(s.pct).toBe(50);
  });
  it('has no percentage without a cap', () => {
    expect(collegeStats({ seats_used: 5 }).pct).toBe(0);
  });
});
