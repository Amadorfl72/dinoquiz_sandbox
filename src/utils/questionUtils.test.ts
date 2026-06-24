import { selectRandomQuestions, shuffleAnswerOptions } from './questionUtils';

describe('TRIOFSND-38: Question selection and shuffling', () => {
  const mockQuestions = Array.from({ length: 30 }, (_, i) => ({
    id: `q${i + 1}`,
    text: `Question ${i + 1}`,
    options: [`Option A`, `Option B`, `Option C`],
    correctAnswerIndex: i % 3,
  }));

  describe('selectRandomQuestions', () => {
    it('should select exactly 10 questions from a pool of 30', () => {
      const selected = selectRandomQuestions(mockQuestions, 10);
      expect(selected).toHaveLength(10);
    });

    it('should not have duplicate questions in the selection', () => {
      const selected = selectRandomQuestions(mockQuestions, 10);
      const ids = selected.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should not mutate the original questions array', () => {
      const originalPool = [...mockQuestions];
      selectRandomQuestions(mockQuestions, 10);
      expect(mockQuestions).toEqual(originalPool);
      expect(mockQuestions).toHaveLength(30);
    });

    it('should return the requested number of questions if pool is larger', () => {
      const largePool = [...mockQuestions, ...mockQuestions.map(q => ({...q, id: q.id + '_dup'}))];
      const selected = selectRandomQuestions(largePool, 10);
      expect(selected).toHaveLength(10);
    });

    it('should throw an error if the pool is smaller than the requested count', () => {
      const smallPool = mockQuestions.slice(0, 5);
      expect(() => selectRandomQuestions(smallPool, 10)).toThrow();
    });
  });

  describe('shuffleAnswerOptions', () => {
    const mockQuestion = {
      id: 'q1',
      text: 'Question 1',
      options: ['A', 'B', 'C'],
      correctAnswerIndex: 1, // 'B' is correct
    };

    it('should return a question with 3 options', () => {
      const shuffled = shuffleAnswerOptions(mockQuestion);
      expect(shuffled.options).toHaveLength(3);
    });

    it('should contain the same options as the original question', () => {
      const shuffled = shuffleAnswerOptions(mockQuestion);
      expect(shuffled.options.sort()).toEqual(mockQuestion.options.sort());
    });

    it('should correctly map the correctAnswerIndex to the new shuffled options', () => {
      // Run multiple times to ensure mapping is correct regardless of shuffle order
      for (let i = 0; i < 20; i++) {
        const shuffled = shuffleAnswerOptions(mockQuestion);
        const correctAnswerText = mockQuestion.options[mockQuestion.correctAnswerIndex];
        expect(shuffled.options[shuffled.correctAnswerIndex]).toBe(correctAnswerText);
      }
    });

    it('should not mutate the original question', () => {
      const originalQuestion = { ...mockQuestion, options: [...mockQuestion.options] };
      shuffleAnswerOptions(mockQuestion);
      expect(mockQuestion).toEqual(originalQuestion);
    });
  });
});