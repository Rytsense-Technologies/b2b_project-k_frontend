// UX-015 / UX-016 / UX-007: heavy libraries stay out of route chunks, and charts keep a text alternative.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColumnChart, TrendChart, columnSummary, trendSummary } from './data-viz';

// Vitest compiles JSX to React.createElement; Next injects React itself.
globalThis.React = React;

const SRC = path.resolve(import.meta.dirname, '../..');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.jsx?$/.test(name) && !/\.test\.jsx?$/.test(name) ? [full] : [];
  });
}

const staticImporters = (pattern) => walk(SRC)
  .filter((f) => pattern.test(readFileSync(f, 'utf8')))
  .map((f) => path.relative(SRC, f).replace(/\\/g, '/'));

describe('code splitting', () => {
  it('only the lazy chart module imports recharts', () => {
    expect(staticImporters(/from ['"]recharts['"]/)).toEqual(['components/shared/data-viz-charts.jsx']);
  });

  it('nothing imports the chart module statically', () => {
    expect(staticImporters(/from ['"][^'"]*data-viz-charts['"]/)).toEqual([]);
  });

  it('only the voice panel imports livekit-client', () => {
    expect(staticImporters(/from ['"]livekit-client['"]/)).toEqual(['components/student/VoiceQnaPanel.jsx']);
  });

  it('nothing imports the voice panel statically', () => {
    expect(staticImporters(/from ['"][^'"]*VoiceQnaPanel['"]/)).toEqual([]);
  });
});

describe('chart text alternatives', () => {
  const columns = [{ label: 'CSE', value: 72 }, { label: 'ECE', value: 41 }];
  const points = [
    { label: '1 Oct', score: 40 },
    { label: '2 Oct', score: 90 },
    { label: '3 Oct', score: 60 },
  ];
  const series = [{ key: 'score', name: 'Quiz score' }];

  it('summarises columns as label and value', () => {
    expect(columnSummary('Average score', columns, { suffix: '%' })).toBe('Average score: CSE 72%, ECE 41%');
  });

  it('summarises a trend by latest, lowest and highest', () => {
    expect(trendSummary('Quiz scores', points, series, { suffix: '%' }))
      .toBe('Quiz scores: 3 points from 1 Oct to 3 Oct. Quiz score: latest 60%, lowest 40%, highest 90%');
  });

  it('ColumnChart exposes an image with that name', () => {
    const html = renderToStaticMarkup(createElement(ColumnChart, { data: columns, label: 'Average score', suffix: '%' }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Average score: CSE 72%, ECE 41%"');
  });

  it('TrendChart exposes an image with that name', () => {
    const html = renderToStaticMarkup(createElement(TrendChart, { data: points, series, label: 'Quiz scores', suffix: '%' }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Quiz scores: 3 points');
  });
});
