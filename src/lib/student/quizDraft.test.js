// FE-021: in-progress answers survive a reload.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearQuizDraft, clearQuizDrafts, loadQuizDraft, saveQuizDraft } from './quizDraft';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

const QUESTIONS = [
  { id: 'q1', option_a: 'a', option_b: 'b', option_c: 'c', option_d: 'd' },
  { id: 'q2', option_a: 'a', option_b: 'b', option_c: 'c', option_d: 'd' },
];

beforeEach(() => {
  vi.stubGlobal('window', { sessionStorage: memoryStorage() });
});

describe('quiz drafts', () => {
  it('restores saved answers for the same job', () => {
    saveQuizDraft('job-1', { answers: { q1: ['A'], q2: ['B', 'C'] }, index: 1 });
    expect(loadQuizDraft('job-1', QUESTIONS)).toEqual({ answers: { q1: ['A'], q2: ['B', 'C'] }, index: 1 });
  });

  it('keeps drafts for different chapters apart', () => {
    saveQuizDraft('job-1', { answers: { q1: ['A'] }, index: 0 });
    expect(loadQuizDraft('job-2', QUESTIONS)).toEqual({ answers: {}, index: 0 });
  });

  it('drops answers to questions that were edited away', () => {
    saveQuizDraft('job-1', { answers: { gone: ['A'], q1: ['Z', 'B'] }, index: 9 });
    expect(loadQuizDraft('job-1', QUESTIONS)).toEqual({ answers: { q1: ['B'] }, index: 1 });
  });

  it('ignores a corrupt entry', () => {
    window.sessionStorage.setItem('pk_quiz_draft:job-1', '{not json');
    expect(loadQuizDraft('job-1', QUESTIONS)).toEqual({ answers: {}, index: 0 });
  });

  it('clearQuizDraft removes one chapter', () => {
    saveQuizDraft('job-1', { answers: { q1: ['A'] }, index: 0 });
    clearQuizDraft('job-1');
    expect(loadQuizDraft('job-1', QUESTIONS)).toEqual({ answers: {}, index: 0 });
  });

  it('clearQuizDrafts removes every chapter and nothing else', () => {
    saveQuizDraft('job-1', { answers: { q1: ['A'] }, index: 0 });
    saveQuizDraft('job-2', { answers: { q1: ['A'] }, index: 0 });
    window.sessionStorage.setItem('other', 'x');
    clearQuizDrafts();
    expect(window.sessionStorage.length).toBe(1);
    expect(window.sessionStorage.getItem('other')).toBe('x');
  });

  it('does not throw when storage is blocked', () => {
    vi.stubGlobal('window', {
      get sessionStorage() { throw new Error('denied'); },
    });
    expect(() => saveQuizDraft('job-1', { answers: {}, index: 0 })).not.toThrow();
    expect(loadQuizDraft('job-1', QUESTIONS)).toEqual({ answers: {}, index: 0 });
    expect(() => clearQuizDrafts()).not.toThrow();
  });
});
