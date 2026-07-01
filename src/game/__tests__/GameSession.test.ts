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

const buildQuestions = (count = 10): Question[] =>
  Array.from({ length: count }, (_, i) => makeQuestion(`q${i + 1}`));

describe('GameSession - TRIOFSND-60', () => {
  describe('initialization', () => {
    it('should be created with exactly 10 selected questions', () => {
      const questions = buildQuestions(10);
      const session = new GameSession(questions);
      expect(session.getSelectedQuestions()).toHaveLength(10);
    });

    it('should throw when initialized with fewer than 10 questions', () => {
      const questions = buildQuestions(9);
      expect(() => new GameSession(questions)).toThrow(/10 questions/i);
    });

    it('should throw when initialized with more than 10 questions', () => {
      const questions = buildQuestions(11);
      expect(() => new GameSession(questions)).toThrow(/10 questions/i);
    });

    it('should throw when initialized with no questions', () => {
      expect(() => new GameSession([])).toThrow(/10 questions/i);
    });

    it('should throw when initialized with duplicate question ids', () => {
      const questions = buildQuestions(10).map((q, i) =>
        i === 5 ? { ...q, id: 'q1' } : q
      );
      expect(() => new GameSession(questions)).toThrow(/duplicate/i);
    });

    it('should start with current question index at 0', () => {
      const session = new GameSession(buildQuestions());
      expect(session.getCurrentIndex()).toBe(0);
    });

    it('should expose the first question as the current one', () => {
      const questions = buildQuestions();
      const session = new GameSession(questions);
      expect(session.getCurrentQuestion()).toEqual(questions[0]);
    });

    it('should not be finished on initialization', () => {
      const session = new GameSession(buildQuestions());
      expect(session.isFinished()).toBe(false);
    });

    it('should keep an empty list of shown question ids initially', () => {
      const session = new GameSession(buildQuestions());
      expect(session.getShownQuestionIds()).toEqual([]);
    });
  });

  describe('question transitions', () => {
    it('should advance to the next question when goToNext is called', () => {
      const questions = buildQuestions();
      const session = new GameSession(questions);
      session.goToNext();
      expect(session.getCurrentIndex()).toBe(1);
      expect(session.getCurrentQuestion()).toEqual(questions[1]);
    });

    it('should advance sequentially through all 10 questions', () => {
      const questions = buildQuestions();
      const session = new GameSession(questions);
      for (let i = 1; i < 10; i++) {
        session.goToNext();
        expect(session.getCurrentIndex()).toBe(i);
        expect(session.getCurrentQuestion()).toEqual(questions[i]);
      }
    });

    it('should mark the session as finished after the last question', () => {
      const session = new GameSession(buildQuestions());
      for (let i = 0; i < 9; i++) session.goToNext();
      expect(session.isFinished()).toBe(false);
      session.goToNext();
      expect(session.isFinished()).toBe(true);
    });

    it('should not advance beyond the last question', () => {
      const session = new GameSession(buildQuestions());
      for (let i = 0; i < 10; i++) session.goToNext();
      expect(session.getCurrentIndex()).toBe(9);
      expect(session.isFinished()).toBe(true);
    });

    it('should throw when goToNext is called after the session is finished', () => {
      const session = new GameSession(buildQuestions());
      for (let i = 0; i < 10; i++) session.goToNext();
      expect(() => session.goToNext()).toThrow(/finished/i);
    });

    it('should not allow going back to a previous question', () => {
      const session = new GameSession(buildQuestions());
      session.goToNext();
      expect(session.getCurrentIndex()).toBe(1);
      expect(() => session.goToPrevious()).toThrow(/not supported|previous/i);
    });

    it('should not allow jumping to an arbitrary already-shown index', () => {
      const session = new GameSession(buildQuestions());
      session.goToNext(); // index 1
      session.goToNext(); // index 2
      expect(() => session.goToIndex(0)).toThrow(/already shown|previous/i);
      expect(() => session.goToIndex(1)).toThrow(/already shown|previous/i);
    });

    it('should allow jumping forward to a not-yet-shown index', () => {
      const questions = buildQuestions();
      const session = new GameSession(questions);
      session.goToIndex(5);
      expect(session.getCurrentIndex()).toBe(5);
      expect(session.getCurrentQuestion()).toEqual(questions[5]);
    });

    it('should throw when jumping to an out-of-range index', () => {
      const session = new GameSession(buildQuestions());
      expect(() => session.goToIndex(-1)).toThrow(/range|invalid/i);
      expect(() => session.goToIndex(10)).toThrow(/range|invalid/i);
    });
  });

  describe('no repeated questions', () => {
    it('should track every shown question id exactly once', () => {
      const questions = buildQuestions();
      const session = new GameSession(questions);
      const shown: string[] = [];
      shown.push(session.getCurrentQuestion().id);
      while (!session.isFinished()) {
        session.goToNext();
        shown.push(session.getCurrentQuestion().id);
      }
      expect(shown).toHaveLength(10);
      expect(new Set(shown).size).toBe(10);
      expect(session.getShownQuestionIds().sort()).toEqual(
        questions.map((q) => q.id).sort()
      );
    });

    it('should never expose a previously shown question as current', () => {
      const questions = buildQuestions();
      const session = new GameSession(questions);
      const seen = new Set<string>([session.getCurrentQuestion().id]);
      while (!session.isFinished()) {
        session.goToNext();
        const currentId = session.getCurrentQuestion().id;
        expect(seen.has(currentId)).toBe(false);
        seen.add(currentId);
      }
    });

    it('should expose remaining (not yet shown) questions', () => {
      const questions = buildQuestions();
      const session = new GameSession(questions);
      session.goToNext();
      session.goToNext();
      const remaining = session.getRemainingQuestions();
      expect(remaining).toHaveLength(8);
      expect(remaining.map((q) => q.id)).toEqual(
        questions.slice(3).map((q) => q.id)
      );
    });

    it('should have no remaining questions when finished', () => {
      const session = new GameSession(buildQuestions());
      while (!session.isFinished()) session.goToNext();
      expect(session.getRemainingQuestions()).toHaveLength(0);
    });
  });

  describe('progress metadata', () => {
    it('should report correct progress as a fraction', () => {
      const session = new GameSession(buildQuestions());
      expect(session.getProgress()).toBe(0);
      session.goToNext();
      expect(session.getProgress()).toBeCloseTo(1 / 9, 5);
      for (let i = 0; i < 8; i++) session.goToNext();
      expect(session.getProgress()).toBe(1);
    });

    it('should report the current question number (1-based)', () => {
      const session = new GameSession(buildQuestions());
      expect(session.getCurrentQuestionNumber()).toBe(1);
      session.goToNext();
      expect(session.getCurrentQuestionNumber()).toBe(2);
    });

    it('should report total questions count', () => {
      const session = new GameSession(buildQuestions());
      expect(session.getTotalQuestions()).toBe(10);
    });
  });

  describe('reset', () => {
    it('should reset the session back to the first question', () => {
      const questions = buildQuestions();
      const session = new GameSession(questions);
      session.goToNext();
      session.goToNext();
      session.reset();
      expect(session.getCurrentIndex()).toBe(0);
      expect(session.getCurrentQuestion()).toEqual(questions[0]);
      expect(session.isFinished()).toBe(false);
      expect(session.getShownQuestionIds()).toEqual([]);
    });

    it('should reset a finished session so it can be played again', () => {
      const session = new GameSession(buildQuestions());
      while (!session.isFinished()) session.goToNext();
      session.reset();
      expect(session.isFinished()).toBe(false);
      expect(() => session.goToNext()).not.toThrow();
    });
  });
});
