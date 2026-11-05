// FE-016: interviews are hidden by event id, never by words in a title.
import { describe, expect, it } from 'vitest';
import { isInterviewEvent } from './interviewOff';
import { isInboxRow } from '../notifications/inboxPoller';

describe('isInterviewEvent', () => {
  it.each(['interview_completed', 'mock_interview_ready', 'INTERVIEW_REPORT'])('hides %s', (id) => {
    expect(isInterviewEvent(id)).toBe(true);
  });

  it.each(['assessment_available', 'content_published', '', null])('keeps %s', (id) => {
    expect(isInterviewEvent(id)).toBe(false);
  });
});

describe('isInboxRow', () => {
  it.each(['Mock test paper published', 'Interview skills: new chapter'])('keeps "%s"', (title) => {
    expect(isInboxRow({ event: 'assessment_available', event_label: 'Assessment available', title })).toBe(true);
  });

  it('hides an interview event', () => {
    expect(isInboxRow({ event: 'interview_completed', title: 'Done' })).toBe(false);
  });

  it('drops empty rows', () => {
    expect(isInboxRow(null)).toBe(false);
  });
});
