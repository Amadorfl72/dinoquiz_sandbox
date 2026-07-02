import { selectRandomQuestions, shuffleQuestionOptions, Question } from './questionUtils';

describe('TRIOFSND-38: Question selection and option shuffling', () => {
  const mockQuestionPool: Question[] = Array.from({ length: 30 }, (_, i) => ({
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
  });
});