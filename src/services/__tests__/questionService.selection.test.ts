import { selectQuestions } from '../questionService';

describe('TRIOFSND-39 - questionService.selectQuestions (invoked on restart)', () => {
  it('returns a non-empty array of questions', () => {
    const questions = selectQuestions();
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('returns questions with the required shape', () => {
    const questions = selectQuestions();
    for (const q of questions) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      expect(q).toHaveProperty('answers');
      expect(q.answers.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns a fresh selection on each call (no shared mutable state)', () => {
    const first = selectQuestions();
    const second = selectQuestions();
    expect(first).not.toBe(second);
  });

  it('completes selection in under 2 seconds', () => {
    const start = performance.now();
    selectQuestions();
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it('returns questions with unique ids', () => {
    const questions = selectQuestions();
    const ids = questions.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
