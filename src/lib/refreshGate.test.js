// FE-023: a tab regaining focus fires visibilitychange and focus; refresh once.
import { describe, expect, it } from 'vitest';
import { createRefreshGate } from './refreshGate';

describe('createRefreshGate', () => {
  it('lets one of two events through and reopens after the gap', () => {
    let now = 100000;
    const gate = createRefreshGate(5000, () => now);
    expect(gate()).toBe(true);
    expect(gate()).toBe(false);
    now += 4999;
    expect(gate()).toBe(false);
    now += 1;
    expect(gate()).toBe(true);
  });
});
