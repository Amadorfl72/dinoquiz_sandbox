import { selectRandomQuestions, shuffleQuestionOptions, prepareQuestionsForGame } from './questionUtils';

describe('TRIOFSND-38: Question selection and option shuffling', () => {
  const mockQuestionPool = Array.from({ length: 30 }, (_, i) => ({
    id: `q${i + 1}`,
    text: `Question ${i + 1}`,
    options: [
      { id: `q${i + 1}_o1`, text: 'Option 1', isCorrect: i % 3 === 0 },
      { id: `q${i + 1}_o2`, text: 'Option 2', isCorrect: i % 3 === 1 },
      { id: `q${i + 1}_o3`, text: 'Option 3', isCorrect: i % 3 === 2 },
    ],
  }));

  describe('selectRandomQuestions', () => {
    it('should select exactly 10 questions when requested from a pool of 30', () => {
      const selected = selectRandomQuestions(mockQuestionPool, 10);
      expect(selected).toHaveLength(10);
    });

    it('should not contain duplicate questions', () => {
      const selected = selectRandomQuestions(mockQuestionPool, 10);
      const ids = selected.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should return a new array and not mutate the original pool', () => {
      const originalPoolCopy = [...mockQuestionPool];
      const selected = selectRandomQuestions(mockQuestionPool, 10);
      
      expect(selected).not.toBe(mockQuestionPool);
      expect(mockQuestionPool).toEqual(originalPoolCopy);
    });

    it('should handle requests for more questions than available in the pool without repetition', () => {
      const smallPool = mockQuestionPool.slice(0, 5);
      const selected = selectRandomQuestions(smallPool, 10);
      
      expect(selected).toHaveLength(5);
      const ids = selected.map(q => q.id);
      expect(new Set(ids).size).toBe(5);
    });

    it('should default to 10 questions when no count argument is provided', () => {
      const selected = selectRandomQuestions(mockQuestionPool);
      expect(selected).toHaveLength(10);
    });

    it('should return an empty array when the pool is empty', () => {
      const selected = selectRandomQuestions([], 10);
      expect(selected).toHaveLength(0);
    });

    it('should return an empty array when count is 0', () => {
      const selected = selectRandomQuestions(mockQuestionPool, 0);
      expect(selected).toHaveLength(0);
    });

    it('should select from the full pool without repetition across multiple calls', () => {
      const allSelectedIds = new Set<string>();
      for (let i = 0; i < 3; i++) {
        const selected = selectRandomQuestions(mockQuestionPool, 10);
        const ids = selected.map(q => q.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(10);
        ids.forEach(id => allSelectedIds.add(id));
      }
      // Over 3 calls of 10 from 30, we should have covered a good portion of the pool
      expect(allSelectedIds.size).toBeGreaterThan(10);
    });

    it('should return question objects that are references from the original pool', () => {
      const selected = selectRandomQuestions(mockQuestionPool, 10);
      selected.forEach(question => {
        expect(mockQuestionPool).toContain(question);
      });
    });
  });

  describe('shuffleQuestionOptions', () => {
    it('should return a question with exactly 3 options', () => {
      const question = mockQuestionPool[0];
      const shuffled = shuffleQuestionOptions(question);
      expect(shuffled.options).toHaveLength(3);
    });

    it('should contain the same options as the original question, just in a potentially different order', () => {
      const question = mockQuestionPool[0];
      const shuffled = shuffleQuestionOptions(question);
      
      const originalTexts = question.options.map(o => o.text).sort();
      const shuffledTexts = shuffled.options.map(o => o.text).sort();
      
      expect(shuffledTexts).toEqual(originalTexts);
    });

    it('should not mutate the original question object', () => {
      const question = mockQuestionPool[0];
      const originalOptionsCopy = JSON.parse(JSON.stringify(question.options));
      
      shuffleQuestionOptions(question);
      
      expect(question.options).toEqual(originalOptionsCopy);
    });

    it('should maintain the correct answer flag on the options', () => {
      const question = mockQuestionPool[0];
      const shuffled = shuffleQuestionOptions(question);
      
      const correctOriginal = question.options.filter(o => o.isCorrect);
      const correctShuffled = shuffled.options.filter(o => o.isCorrect);
      
      expect(correctShuffled.length).toBe(correctOriginal.length);
      if (correctOriginal.length > 0) {
        expect(correctShuffled[0].text).toBe(correctOriginal[0].text);
      }
    });

    it('should return a new question object, not the same reference', () => {
      const question = mockQuestionPool[0];
      const shuffled = shuffleQuestionOptions(question);
      expect(shuffled).not.toBe(question);
    });

    it('should return a new options array, not the same reference', () => {
      const question = mockQuestionPool[0];
      const shuffled = shuffleQuestionOptions(question);
      expect(shuffled.options).not.toBe(question.options);
    });

    it('should preserve the question id and text', () => {
      const question = mockQuestionPool[5];
      const shuffled = shuffleQuestionOptions(question);
      expect(shuffled.id).toBe(question.id);
      expect(shuffled.text).toBe(question.text);
    });

    it('should preserve all option ids after shuffling', () => {
      const question = mockQuestionPool[10];
      const shuffled = shuffleQuestionOptions(question);
      const originalIds = question.options.map(o => o.id).sort();
      const shuffledIds = shuffled.options.map(o => o.id).sort();
      expect(shuffledIds).toEqual(originalIds);
    });

    it('should always have exactly one correct option after shuffling', () => {
      const question = mockQuestionPool[0];
      for (let i = 0; i < 20; i++) {
        const shuffled = shuffleQuestionOptions(question);
        const correctCount = shuffled.options.filter(o => o.isCorrect).length;
        expect(correctCount).toBe(1);
      }
    });

    it('should produce different orderings over multiple calls (statistical)', () => {
      const question = mockQuestionPool[0];
      const orderings = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const shuffled = shuffleQuestionOptions(question);
        orderings.add(shuffled.options.map(o => o.id).join(','));
      }
      // With 3 options there are 6 possible permutations; over 30 calls we expect more than 1
      expect(orderings.size).toBeGreaterThan(1);
    });
  });

  describe('prepareQuestionsForGame', () => {
    it('should return exactly 10 questions from a pool of 30', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool, 10);
      expect(prepared).toHaveLength(10);
    });

    it('should not contain duplicate questions', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool, 10);
      const ids = prepared.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should default to 10 questions when no count argument is provided', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool);
      expect(prepared).toHaveLength(10);
    });

    it('should not mutate the original question pool', () => {
      const originalPoolCopy = JSON.parse(JSON.stringify(mockQuestionPool));
      prepareQuestionsForGame(mockQuestionPool, 10);
      expect(mockQuestionPool).toEqual(originalPoolCopy);
    });

    it('should return questions with shuffled options (each question has 3 options)', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool, 10);
      prepared.forEach(question => {
        expect(question.options).toHaveLength(3);
      });
    });

    it('should preserve exactly one correct option per prepared question', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool, 10);
      prepared.forEach(question => {
        const correctCount = question.options.filter(o => o.isCorrect).length;
        expect(correctCount).toBe(1);
      });
    });

    it('should return new question objects, not references from the original pool', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool, 10);
      prepared.forEach(question => {
        expect(mockQuestionPool).not.toContain(question);
      });
    });

    it('should handle a pool smaller than the requested count', () => {
      const smallPool = mockQuestionPool.slice(0, 5);
      const prepared = prepareQuestionsForGame(smallPool, 10);
      expect(prepared).toHaveLength(5);
      const ids = prepared.map(q => q.id);
      expect(new Set(ids).size).toBe(5);
    });

    it('should return an empty array when the pool is empty', () => {
      const prepared = prepareQuestionsForGame([], 10);
      expect(prepared).toHaveLength(0);
    });
  });
});
