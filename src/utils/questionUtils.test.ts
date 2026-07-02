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

    it('should have shuffled options for each question (same elements, potentially different order)', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool, 10);
      prepared.forEach(question => {
        const originalQuestion = mockQuestionPool.find(q => q.id === question.id)!;
        const originalTexts = originalQuestion.options.map(o => o.text).sort();
        const preparedTexts = question.options.map(o => o.text).sort();
        expect(preparedTexts).toEqual(originalTexts);
      });
    });

    it('should preserve the correct answer flag for each question', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool, 10);
      prepared.forEach(question => {
        const originalQuestion = mockQuestionPool.find(q => q.id === question.id)!;
        const originalCorrect = originalQuestion.options.filter(o => o.isCorrect);
        const preparedCorrect = question.options.filter(o => o.isCorrect);
        expect(preparedCorrect.length).toBe(originalCorrect.length);
        if (originalCorrect.length > 0) {
          expect(preparedCorrect[0].text).toBe(originalCorrect[0].text);
        }
      });
    });

    it('should default to 10 questions when no count is provided', () => {
      const prepared = prepareQuestionsForGame(mockQuestionPool);
      expect(prepared).toHaveLength(10);
    });

    it('should not mutate the original pool', () => {
      const originalPoolCopy = JSON.parse(JSON.stringify(mockQuestionPool));
      prepareQuestionsForGame(mockQuestionPool, 10);
      expect(mockQuestionPool).toEqual(originalPoolCopy);
    });

    it('should handle a pool smaller than the requested count', () => {
      const smallPool = mockQuestionPool.slice(0, 5);
      const prepared = prepareQuestionsForGame(smallPool, 10);
      expect(prepared).toHaveLength(5);
      const ids = prepared.map(q => q.id);
      expect(new Set(ids).size).toBe(5);
    });
  });
});
