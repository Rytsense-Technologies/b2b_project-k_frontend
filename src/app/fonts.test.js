// FE-024: Poppins only, at the locked weights.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const layout = readFileSync(path.resolve(import.meta.dirname, 'layout.js'), 'utf8');

describe('root layout fonts', () => {
  it('does not load DM Sans', () => {
    expect(layout).not.toMatch(/dmSans|DM_Sans|student\/fonts/);
    expect(existsSync(path.resolve(import.meta.dirname, '../lib/student/fonts.js'))).toBe(false);
  });

  it('requests only the locked Poppins weights', () => {
    const weights = layout.match(/weight:\s*\[([^\]]*)\]/)[1].match(/\d+/g);
    expect(weights).toEqual(['400', '500', '700']);
  });
});
