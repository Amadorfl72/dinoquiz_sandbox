import QuestionService from '../services/QuestionService';

describe('QuestionService', () => {
  describe('startup validation', () => {
    it('should validate questions on startup without throwing', () => {
      expect(() => QuestionService).not.toThrow();
    });

    it('should load the questions array after validation', () => {
      expect(Array.isArray(QuestionService.questions)).toBe(true);
      expect(QuestionService.questions.length).toBeGreaterThan(0);
    });
  });

  describe('validateQuestions', () => {
    it('should throw if questions is not an array', () => {
      expect(() => QuestionService.validateQuestions({})).toThrow('Questions must be an array');
      expect(() => QuestionService.validateQuestions(null)).toThrow('Questions must be an array');
      expect(() => QuestionService.validateQuestions('string')).toThrow('Questions must be an array');
    });

    it('should throw if a question is missing an id', () => {
      const invalid = [
        { text: 'Test', options: ['A', 'B'], correctAnswer: 0, funFact: 'Fun', dinosaurImage: 'img.png' }
      ];
      expect(() => QuestionService.validateQuestions(invalid)).toThrow('Question at index 0 must have an id');
    });

    it('should throw if a question is missing text', () => {
      const invalid = [
        { id: 1, options: ['A', 'B'], correctAnswer: 0, funFact: 'Fun', dinosaurImage: 'img.png' }
      ];
      expect(() => QuestionService.validateQuestions(invalid)).toThrow('Question at index 0 must have a text');
    });

    it('should throw if a question has fewer than 2 options', () => {
      const invalid = [
        { id: 1, text: 'Test', options: ['A'], correctAnswer: 0, funFact: 'Fun', dinosaurImage: 'img.png' }
      ];
      expect(() => QuestionService.validateQuestions(invalid)).toThrow('Question at index 0 must have at least 2 options');
    });

    it('should throw if options is not an array', () => {
      const invalid = [
        { id: 1, text: 'Test', options: 'not-array', correctAnswer: 0, funFact: 'Fun', dinosaurImage: 'img.png' }
      ];
      expect(() => QuestionService.validateQuestions(invalid)).toThrow('Question at index 0 must have at least 2 options');
    });

    it('should throw if correctAnswer is missing', () => {
      const invalid = [
        { id: 1, text: 'Test', options: ['A', 'B'], funFact: 'Fun', dinosaurImage: 'img.png' }
      ];
      expect(() => QuestionService.validateQuestions(invalid)).toThrow('Question at index 0 must have a correctAnswer');
    });

    it('should throw if correctAnswer is null', () => {
      const invalid = [
        { id: 1, text: 'Test', options: ['A', 'B'], correctAnswer: null, funFact: 'Fun', dinosaurImage: 'img.png' }
      ];
      expect(() => QuestionService.validateQuestions(invalid)).toThrow('Question at index 0 must have a correctAnswer');
    });

    it('should throw if funFact is missing', () => {
      const invalid = [
        { id: 1, text: 'Test', options: ['A', 'B'], correctAnswer: 0, dinosaurImage: 'img.png' }
      ];
      expect(() => QuestionService.validateQuestions(invalid)).toThrow('Question at index 0 must have a funFact');
    });

    it('should throw if dinosaurImage is missing', () => {
      const invalid = [
        { id: 1, text: 'Test', options: ['A', 'B'], correctAnswer: 0, funFact: 'Fun' }
      ];
      expect(() => QuestionService.validateQuestions(invalid)).toThrow('Question at index 0 must have a dinosaurImage');
    });

    it('should not throw for a fully valid question set', () => {
      const valid = [
        { id: 1, text: 'Test', options: ['A', 'B'], correctAnswer: 0, funFact: 'Fun', dinosaurImage: 'img.png' },
        { id: 2, text: 'Test 2', options: ['A', 'B', 'C'], correctAnswer: 1, funFact: 'Fun 2', dinosaurImage: 'img2.png' }
      ];
      expect(() => QuestionService.validateQuestions(valid)).not.toThrow();
    });
  });

  describe('getRandomQuestions', () => {
    it('should return the requested number of questions', () => {
      const poolSize = QuestionService.questions.length;
      const selected = QuestionService.getRandomQuestions(poolSize);
      expect(selected).toHaveLength(poolSize);
    });

    it('should return questions without repetition', () => {
      const poolSize = QuestionService.questions.length;
      const selected = QuestionService.getRandomQuestions(poolSize);
      const uniqueIds = new Set(selected.map(q => q.id));
      expect(uniqueIds.size).toBe(poolSize);
    });

    it('should return a subset smaller than the pool without repetition', () => {
      const selected = QuestionService.getRandomQuestions(2);
      expect(selected).toHaveLength(2);
      const uniqueIds = new Set(selected.map(q => q.id));
      expect(uniqueIds.size).toBe(2);
    });

    it('should return valid question objects with all required fields', () => {
      const selected = QuestionService.getRandomQuestions(2);
      selected.forEach((q) => {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('text');
        expect(q).toHaveProperty('options');
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q).toHaveProperty('correctAnswer');
        expect(q).toHaveProperty('funFact');
        expect(q).toHaveProperty('dinosaurImage');
      });
    });

    it('should not mutate the original questions array', () => {
      const originalOrder = QuestionService.questions.map(q => q.id);
      QuestionService.getRandomQuestions(2);
      const currentOrder = QuestionService.questions.map(q => q.id);
      expect(currentOrder).toEqual(originalOrder);
    });

    it('should throw when requesting more questions than available in the pool', () => {
      const poolSize = QuestionService.questions.length;
      const tooMany = poolSize + 1;
      expect(() => QuestionService.getRandomQuestions(tooMany)).toThrow(
        `Cannot select ${tooMany} questions from a pool of ${poolSize}`
      );
    });

    it('should throw when requesting the default 10 from a pool smaller than 10', () => {
      const poolSize = QuestionService.questions.length;
      if (poolSize < 10) {
        expect(() => QuestionService.getRandomQuestions()).toThrow(
          `Cannot select 10 questions from a pool of ${poolSize}`
        );
      }
    });

    it('should throw when requesting 100 questions', () => {
      expect(() => QuestionService.getRandomQuestions(100)).toThrow();
    });

    it('should return all questions when count equals pool size', () => {
      const poolSize = QuestionService.questions.length;
      const selected = QuestionService.getRandomQuestions(poolSize);
      const selectedIds = selected.map(q => q.id).sort();
      const poolIds = QuestionService.questions.map(q => q.id).sort();
      expect(selectedIds).toEqual(poolIds);
    });
  });
});
