const { initializeGame } = require('../src/utils/gameUtils');
const { render, screen, fireEvent } = require('@testing-library/react');
const React = require('react');
const GameScreen = require('../src/components/GameScreen').default;

describe('TRIOFSND-9: Game Initialization Logic', () => {
  let mockQuestionsPool;

  beforeEach(() => {
    mockQuestionsPool = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      question: `Question ${i + 1}`,
      answers: [
        { text: `Option A-${i + 1}`, correct: true },
        { text: `Option B-${i + 1}`, correct: false },
        { text: `Option C-${i + 1}`, correct: false }
      ]
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

  test('should only include questions that exist in the original pool', () => {
    const selectedQuestions = initializeGame(mockQuestionsPool);
    const poolIds = new Set(mockQuestionsPool.map(q => q.id));
    selectedQuestions.forEach(q => {
      expect(poolIds.has(q.id)).toBe(true);
    });
  });

  test('should shuffle the answer options for each selected question', () => {
    const selectedQuestions = initializeGame(mockQuestionsPool);
    
    selectedQuestions.forEach(selected => {
      const originalQuestion = mockQuestionsPool.find(q => q.id === selected.id);
      
      // Ensure the shuffled answers contain the exact same elements
      expect(selected.answers.map(a => a.text).sort()).toEqual(
        originalQuestion.answers.map(a => a.text).sort()
      );
      
      // Ensure the answers array is a new instance (shuffled), not the original reference
      expect(selected.answers).not.toBe(originalQuestion.answers);
    });
  });

  test('should preserve the correct flag on shuffled answers', () => {
    const selectedQuestions = initializeGame(mockQuestionsPool);
    
    selectedQuestions.forEach(selected => {
      const originalQuestion = mockQuestionsPool.find(q => q.id === selected.id);
      const originalCorrectCount = originalQuestion.answers.filter(a => a.correct).length;
      const selectedCorrectCount = selected.answers.filter(a => a.correct).length;
      expect(selectedCorrectCount).toBe(originalCorrectCount);
    });
  });

  test('should not mutate the original questions pool', () => {
    const poolCopy = JSON.parse(JSON.stringify(mockQuestionsPool));
    initializeGame(mockQuestionsPool);
    expect(mockQuestionsPool).toEqual(poolCopy);
  });

  test('should not mutate the original answer arrays', () => {
    const originalAnswerOrders = mockQuestionsPool.map(q => q.answers.map(a => a.text).join(','));
    initializeGame(mockQuestionsPool);
    const afterAnswerOrders = mockQuestionsPool.map(q => q.answers.map(a => a.text).join(','));
    expect(afterAnswerOrders).toEqual(originalAnswerOrders);
  });

  test('should trigger initialization when "¡Jugar!" is pressed', () => {
    const mockOnGameStart = jest.fn();
    render(React.createElement(GameScreen, { onGameStart: mockOnGameStart }));
    
    const playButton = screen.getByText('¡Jugar!');
    fireEvent.click(playButton);
    
    expect(mockOnGameStart).toHaveBeenCalledTimes(1);
  });

  test('should render a question and its answer buttons after initialization', () => {
    const mockOnGameStart = jest.fn();
    render(React.createElement(GameScreen, { onGameStart: mockOnGameStart }));
    
    const playButton = screen.getByText('¡Jugar!');
    fireEvent.click(playButton);
    
    // After clicking, question buttons should be rendered
    const buttons = screen.getAllByRole('button');
    // 3 answer buttons + 1 play button = 4 buttons
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  test('should initialize game on mount via useEffect', () => {
    const mockOnGameStart = jest.fn();
    render(React.createElement(GameScreen, { onGameStart: mockOnGameStart }));
    
    // On mount, gameQuestions should be initialized so question content renders
    const buttons = screen.getAllByRole('button');
    // 3 answer buttons + 1 play button
    expect(buttons.length).toBe(4);
  });

  test('should produce different selections across multiple calls (randomness sanity)', () => {
    const results = [];
    for (let i = 0; i < 20; i++) {
      results.push(initializeGame(mockQuestionsPool).map(q => q.id).join(','));
    }
    const uniqueResults = new Set(results);
    // With 30 choose 10, it's astronomically unlikely all 20 calls produce identical output
    expect(uniqueResults.size).toBeGreaterThan(1);
  });
});
