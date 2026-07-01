import { GameSession } from '../GameSession';
import { Question } from '../types';

const makeQuestion = (id: string): Question => ({
  id,
  text: `Question ${id}`,
  options: ['A', 'B', 'C', 'D'],
  correctOptionIndex: 0,
  category: 'general',
  difficulty: 'easy',
});

const buildQuestions = (): Question[] =>
  Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i + 1}`));

describe('GameSession - selection integrity (TRIOFSND-60)', () => {
  it('should preserve the exact set of selected question ids throughout the session', () => {
    const questions = buildQuestions();
    const session = new GameSession(questions);
    const selectedIds = session.getSelectedQuestions().map((q) => q.id);
    expect(selectedIds.sort()).toEqual(questions.map((q) => q.id).sort());

    while (!session.isFinished()) session.goToNext();

    const finalSelectedIds = session.getSelectedQuestions().map((q) => q.id);
    expect(finalSelectedIds.sort()).toEqual(questions.map((q) => q.id).sort());
  });

  it('should not mutate the originally provided questions array', () => {
    const questions = buildQuestions();
    const snapshot = questions.map((q) => ({ ...q }));
    // eslint-disable-next-line no-new
    new GameSession(questions);
    expect(questions).toEqual(snapshot);
  });

  it('should not share internal state between two independent sessions', () => {
    const a = new GameSession(buildQuestions());
    const b = new GameSession(buildQuestions());
    a.goToNext();
    a.goToNext();
    expect(b.getCurrentIndex()).toBe(0);
    expect(b.getShownQuestionIds()).toEqual([]);
  });
});
