import { selectRandomQuestions, shuffleAnswerOptions } from './questionUtils';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

describe('TRIOFSND-38: Question selection and shuffling', () => {
  const generateQuestions = (count: number): Question[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `q${i + 1}`,
      text: `Question ${i + 1}`,
      options: [
        { id: `o1`, text: 'Option 1', isCorrect: true },
        { id: `o2`, text: 'Option 2', isCorrect: false },
        { id: `o3`, text: 'Option 3', isCorrect: false },
      ],
    }));
  };

  describe('selectRandomQuestions', () => {
    it('should select exactly 10 questions from a pool of 30', () => {
      const pool = generateQuestions(30);
      const selected = selectRandomQuestions(pool, 10);
      expect(selected).toHaveLength(10);
    });

    it('should not contain duplicate questions', () => {
      const pool = generateQuestions(30);
      const selected = selectRandomQuestions(pool, 10);
      const ids = selected.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should return all questions if pool size is less than requested count', () => {
      const pool = generateQuestions(5);
      const selected = selectRandomQuestions(pool, 10);
      expect(selected).toHaveLength(5);
    });

    it('should not mutate the original pool', () => {
      const pool = generateQuestions(30);
      const poolCopy = JSON.parse(JSON.stringify(pool));
      selectRandomQuestions(pool, 10);
      expect(pool).toEqual(poolCopy);
    });
  });

  describe('shuffleAnswerOptions', () => {
    it('should return exactly 3 options', () => {
      const question = generateQuestions(1)[0];
      const shuffled = shuffleAnswerOptions(question);
      expect(shuffled.options).toHaveLength(3);
    });

    it('should contain the same options as the original question', () => {
      const question = generateQuestions(1)[0];
      const shuffled = shuffleAnswerOptions(question);
      const originalIds = question.options.map(o => o.id).sort();
      const shuffledIds = shuffled.options.map(o => o.id).sort();
      expect(shuffledIds).toEqual(originalIds);
    });

    it('should not mutate the original question options', () => {
      const question = generateQuestions(1)[0];
      const originalOptionsOrder = question.options.map(o => o.id);
      shuffleAnswerOptions(question);
      expect(question.options.map(o => o.id)).toEqual(originalOptionsOrder);
    });

    it('should eventually shuffle the options (probabilistic test)', () => {
      const question = generateQuestions(1)[0];
      let shuffled = false;
      // Run multiple times to check if it actually shuffles
      for (let i = 0; i < 20; i++) {
        const result = shuffleAnswerOptions(question);
        const resultIds = result.options.map(o => o.id);
        const originalIds = question.options.map(o => o.id);
        if (JSON.stringify(resultIds) !== JSON.stringify(originalIds)) {
          shuffled = true;
          break;
        }
      }
      expect(shuffled).toBe(true);
    });
  });
});
