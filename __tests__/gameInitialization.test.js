const { initializeGame } = require('../src/gameInitialization');

describe('TRIOFSND-9: Game Initialization Logic', () => {
  let mockQuestionsPool;

  beforeEach(() => {
    mockQuestionsPool = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      question: `Question ${i + 1}`,
      options: [`Option A-${i + 1}`, `Option B-${i + 1}`, `Option C-${i + 1}`],
      correctAnswer: `Option A-${i + 1}`
    }));
  });

  it('should select exactly 10 questions from the pool of 30', () => {
    const result = initializeGame(mockQuestionsPool);
    expect(result.selectedQuestions).toHaveLength(10);
  });

  it('should select questions without repetition', () => {
    const result = initializeGame(mockQuestionsPool);
    const selectedIds = result.selectedQuestions.map(q => q.id);
    const uniqueIds = new Set(selectedIds);
    expect(uniqueIds.size).toBe(10);
  });

  it('should shuffle the 3 answer options for each selected question', () => {
    const originalRandom = Math.random;
    
    // Mock Math.random to force a deterministic shuffle
    let callCount = 0;
    Math.random = jest.fn(() => {
      callCount++;
      return callCount % 2 === 0 ? 0.1 : 0.9;
    });

    const result = initializeGame(mockQuestionsPool);

    result.selectedQuestions.forEach(selectedQ => {
      const originalQ = mockQuestionsPool.find(q => q.id === selectedQ.id);
      
      // Verify that the shuffled options contain the exact same elements as the original
      expect(selectedQ.options).toHaveLength(3);
      expect([...selectedQ.options].sort()).toEqual([...originalQ.options].sort());
    });

    // Verify that at least one question's options were actually reordered
    const hasShuffled = result.selectedQuestions.some(selectedQ => {
      const originalQ = mockQuestionsPool.find(q => q.id === selectedQ.id);
      return JSON.stringify(selectedQ.options) !== JSON.stringify(originalQ.options);
    });
    
    expect(hasShuffled).toBe(true);

    Math.random = originalRandom;
  });

  it('should maintain the correct answer reference after shuffling', () => {
    const result = initializeGame(mockQuestionsPool);
    
    result.selectedQuestions.forEach(selectedQ => {
      const originalQ = mockQuestionsPool.find(q => q.id === selectedQ.id);
      // Assuming the logic tracks the correct answer by value, not index
      expect(selectedQ.options).toContain(originalQ.correctAnswer);
    });
  });
});