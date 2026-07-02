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

  test('should trigger initialization when "¡Jugar!" is pressed', () => {
    const mockOnGameStart = jest.fn();
    render(React.createElement(GameScreen, { onGameStart: mockOnGameStart }));
    
    const playButton = screen.getByText('¡Jugar!');
    fireEvent.click(playButton);
    
    expect(mockOnGameStart).toHaveBeenCalledTimes(1);
  });
});
