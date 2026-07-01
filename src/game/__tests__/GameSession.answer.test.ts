import { GameSession } from '../GameSession';
import { Question } from '../types';

const makeQuestion = (id: string, correct = 0): Question => ({
  id,
  text: `Question ${id}`,
  options: ['A', 'B', 'C', 'D'],
  correctOptionIndex: correct,
  category: 'general',
  difficulty: 'easy',
});

const buildQuestions = (): Question[] =>
  Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i + 1}`, i % 4));

describe('GameSession - answer handling integration (TRIOFSND-60)', () => {
  it('should record an answer for the current question and advance', () => {
    const session = new GameSession(buildQuestions());
    session.answerCurrent(0);
    expect(session.getCurrentIndex()).toBe(1);
    expect(session.getAnswers()).toHaveLength(1);
    expect(session.getAnswers()[0]).toMatchObject({
      questionId: 'q1',
      selectedOptionIndex: 0,
    });
  });

  it('should not allow answering the same question twice', () => {
    const session = new GameSession(buildQuestions());
    session.answerCurrent(0); // advances to index 1
    expect(() => session.answerCurrent(0)).not.toThrow(); // answers q2
    expect(session.getAnswers()).toHaveLength(2);
  });

  it('should not allow answering after the session is finished', () => {
    const session = new GameSession(buildQuestions());
    while (!session.isFinished()) session.answerCurrent(0);
    expect(() => session.answerCurrent(0)).toThrow(/finished/i);
  });

  it('should compute the final score from recorded answers', () => {
    const questions = buildQuestions();
    const session = new GameSession(questions);
    // Answer all correctly
    while (!session.isFinished()) {
      const current = session.getCurrentQuestion();
      session.answerCurrent(current.correctOptionIndex);
    }
    expect(session.getScore()).toBe(10);
  });

  it('should compute a partial score when some answers are wrong', () => {
    const questions = buildQuestions();
    const session = new GameSession(questions);
    let i = 0;
    while (!session.isFinished()) {
      const current = session.getCurrentQuestion();
      // Answer wrong on even questions, correct on odd
      session.answerCurrent(i % 2 === 0 ? (current.correctOptionIndex + 1) % 4 : current.correctOptionIndex);
      i++;
    }
    expect(session.getScore()).toBe(5);
  });
});
