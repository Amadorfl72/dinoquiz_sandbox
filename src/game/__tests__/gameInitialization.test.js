const { initializeGame } = require('../gameInitialization');

describe('TRIOFSND-9: Game Initialization Logic', () => {
  const mockQuestionPool = Array.from({ length: 30 }, (_, i) => ({
    id: `q${i + 1}`,
    text: `Question ${i + 1}`,
    correctAnswer: `Correct ${i + 1}`,
    wrongAnswers: [`Wrong ${i + 1}a`, `Wrong ${i + 1}b`]
  }));

  it('should select exactly 10 questions from the pool of 30', () => {
    const selectedQuestions = initializeGame(mockQuestionPool);
    expect(selectedQuestions).toHaveLength(10);
  });

  it('should not have duplicate questions in the selection', () => {
    const selectedQuestions = initializeGame(mockQuestionPool);
    const ids = selectedQuestions.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });

  it('should shuffle the 3 answer options for each selected question', () => {
    const selectedQuestions = initializeGame(mockQuestionPool);
    
    selectedQuestions.forEach(question => {
      expect(question.options).toHaveLength(3);
      
      const originalQuestion = mockQuestionPool.find(q => q.id === question.id);
      const expectedOptions = [
        originalQuestion.correctAnswer,
        originalQuestion.wrongAnswers[0],
        originalQuestion.wrongAnswers[1]
      ];
      
      // Verify all original options are present in the shuffled array
      expectedOptions.forEach(opt => {
        expect(question.options).toContain(opt);
      });
    });
  });

  it('should not mutate the original question pool', () => {
    const poolCopy = JSON.parse(JSON.stringify(mockQuestionPool));
    initializeGame(mockQuestionPool);
    expect(mockQuestionPool).toEqual(poolCopy);
  });
});