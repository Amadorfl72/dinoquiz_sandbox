const { initializeGame, QUESTIONS_POOL } = require('./game');

describe('TRIOFSND-9: Game Initialization Logic', () => {
  describe('Question Selection', () => {
    it('should select exactly 10 questions', () => {
      const selectedQuestions = initializeGame();
      expect(selectedQuestions).toHaveLength(10);
    });

    it('should select questions without repetition', () => {
      const selectedQuestions = initializeGame();
      const ids = selectedQuestions.map(q => q.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(10);
    });

    it('should select questions from the pool of 30', () => {
      const selectedQuestions = initializeGame();
      selectedQuestions.forEach(q => {
        const originalQuestion = QUESTIONS_POOL.find(pq => pq.id === q.id);
        expect(originalQuestion).toBeDefined();
      });
    });
  });

  describe('Answer Shuffling', () => {
    it('should have exactly 3 answer options for each selected question', () => {
      const selectedQuestions = initializeGame();
      selectedQuestions.forEach(q => {
        expect(q.options).toHaveLength(3);
      });
    });

    it('should shuffle the options while maintaining the same elements', () => {
      const selectedQuestions = initializeGame();
      selectedQuestions.forEach(q => {
        const originalQuestion = QUESTIONS_POOL.find(pq => pq.id === q.id);
        const sortedOriginal = [...originalQuestion.options].sort();
        const sortedShuffled = [...q.options].sort();
        expect(sortedShuffled).toEqual(sortedOriginal);
      });
    });

    it('should randomize the order of the options (not always original order)', () => {
      let orderChanged = false;
      for (let i = 0; i < 20; i++) {
        const selectedQuestions = initializeGame();
        selectedQuestions.forEach(q => {
          const originalQuestion = QUESTIONS_POOL.find(pq => pq.id === q.id);
          if (JSON.stringify(q.options) !== JSON.stringify(originalQuestion.options)) {
            orderChanged = true;
          }
        });
      }
      expect(orderChanged).toBe(true);
    });
  });

  describe('Trigger', () => {
    it('should execute initialization logic when ¡Jugar! is pressed', () => {
      // Assuming initializeGame is the function bound to the '¡Jugar!' button click event
      const result = initializeGame();
      expect(result).toBeDefined();
      expect(result).toHaveLength(10);
    });
  });
});