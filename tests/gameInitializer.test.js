const { initializeGame } = require('../src/gameInitializer');

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

  test('should select exactly 10 questions from the pool of 30', () => {
    const selectedQuestions = initializeGame(mockQuestionsPool);
    expect(selectedQuestions).toHaveLength(10);
  });

  test('should select questions without repetition', () => {
    const selectedQuestions = initializeGame(mockQuestionsPool);
    const ids = selectedQuestions.map(q => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });

  test('should shuffle the 3 answer options for each selected question', () => {
    const selectedQuestions = initializeGame(mockQuestionsPool);
    
    selectedQuestions.forEach(selected => {
      const originalQuestion = mockQuestionsPool.find(q => q.id === selected.id);
      
      // Ensure the shuffled options contain the exact same elements
      expect(selected.options.sort()).toEqual(originalQuestion.options.sort());
      
      // Ensure the options array is a new instance (shuffled), not the original reference
      expect(selected.options).not.toBe(originalQuestion.options);
    });
  });

  test('should trigger initialization when "¡Jugar!" is pressed', () => {
    document.body.innerHTML = '<button id="play-btn">¡Jugar!</button>';
    const playBtn = document.getElementById('play-btn');
    const mockCallback = jest.fn();
    
    playBtn.addEventListener('click', () => {
      const result = initializeGame(mockQuestionsPool);
      mockCallback(result);
    });

    playBtn.click();
    
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][0]).toHaveLength(10);
  });
});