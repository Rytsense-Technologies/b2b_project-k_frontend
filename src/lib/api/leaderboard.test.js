// UX-020: the page polls 100 rows; scores do not change every 15 seconds.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEADERBOARD_REFRESH_MS } from './leaderboard';

describe('leaderboard refresh', () => {
  it('polls once a minute, like the rest of the live pages', () => {
    expect(LEADERBOARD_REFRESH_MS).toBe(60000);
  });

  it('is what the page uses', () => {
    const page = readFileSync(path.resolve('src/app/student/(portal)/leaderboard/page.jsx'), 'utf8');
    expect(page).toMatch(/setInterval\(refresh, LEADERBOARD_REFRESH_MS\)/);
  });
});
