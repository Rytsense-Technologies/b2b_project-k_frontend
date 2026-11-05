// PIPE-004: the reviewer sees what degraded in a plan.
import { describe, expect, it } from 'vitest';
import { planQualityNotes } from './planQuality';

const scenes = [{ scene_id: 11 }, { scene_id: 12 }, { scene_id: 13 }];

describe('planQualityNotes', () => {
  it('says nothing about a plan where every step ran', () => {
    expect(planQualityNotes({ scenes, truncated: false, quality: { unplanned_chapters: [], missing_illustrations: [] } })).toEqual([]);
  });

  it('says nothing about an old plan with no quality data', () => {
    expect(planQualityNotes({ scenes })).toEqual([]);
    expect(planQualityNotes(null)).toEqual([]);
  });

  it('names the chapters', () => {
    const notes = planQualityNotes({
      scenes,
      quality: {
        unplanned_chapters: ['Cells'],
        dropped_chapters: ['Tissues'],
        unverified_chapters: ['Cells', 'Organs'],
        coverage_unchecked_chapters: ['Blood'],
      },
    });
    expect(notes).toHaveLength(4);
    expect(notes[0]).toContain('Tissues');
    expect(notes[1]).toContain('Cells');
    expect(notes[2]).toContain('Cells, Organs');
    expect(notes[3]).toContain('Blood');
  });

  it('turns scene ids into the slide numbers the reviewer sees', () => {
    const notes = planQualityNotes({ scenes, quality: { missing_illustrations: [12], undrawable_slides: [11, 13] } });
    expect(notes[0]).toMatch(/slide 2$/);
    expect(notes[1]).toMatch(/slides 1, 3$/);
  });

  it('lists unsupported slide text', () => {
    expect(planQualityNotes({ scenes, quality: { unsupported_slide_text: ['90% of cells'] } })[0]).toContain('90% of cells');
  });

  it('reports a video cut at the length limit', () => {
    expect(planQualityNotes({ scenes, truncated: true })[0]).toMatch(/length limit/i);
  });
});
