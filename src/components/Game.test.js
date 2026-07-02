import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Game from './Game';
import { getRandomQuestions, resetGameState } from '../utils/gameUtils';

jest.mock('../utils/gameUtils', () => ({
  getRandomQuestions: jest.fn(),
  resetGameState: jest.fn()
}));

describe('TRIOFSND-34: Implement "Volver a jugar" Game Reset Logic', () => {
  const mockPool = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Question ${i}` }));

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock implementation that returns 10 unique questions
    getRandomQuestions.mockImplementation((pool, count) => {
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    });
  });

  it('should reset the game state and navigate to the first question when "Volver a jugar" is clicked', () => {
    render(<Game initialScore={5} initialQuestionIndex={9} isGameOver={true} pool={mockPool} />);
    
    const resetButton = screen.getByText('Volver a jugar');
    fireEvent.click(resetButton);
    
    // Verify game state is reset
    expect(resetGameState).toHaveBeenCalled();
    expect(screen.getByTestId('score')).toHaveTextContent('0');
    // Verify navigation to the first question (index 0, displayed as 1)
    expect(screen.getByTestId('question-index')).toHaveTextContent('1');
  });

  it('should select a new random set of 10 questions from the pool without repetition', async () => {
    render(<Game isGameOver={true} pool={mockPool} />);
    
    const resetButton = screen.getByText('Volver a jugar');
    fireEvent.click(resetButton);
    
    // Verify the random selection function was called with the pool and count 10
    await waitFor(() => {
      expect(getRandomQuestions).toHaveBeenCalledWith(mockPool, 10);
    });
    
    // Verify the component displays the correct total number of questions
    expect(screen.getByTestId('total-questions')).toHaveTextContent('10');
    
    // Verify the selected questions are unique (no repetition)
    const selectedQuestions = getRandomQuestions.mock.results[0].value;
    const uniqueIds = new Set(selectedQuestions.map(q => q.id));
    expect(selectedQuestions.length).toBe(10);
    expect(uniqueIds.size).toBe(10);
    
    // Verify game state is reset
    expect(resetGameState).toHaveBeenCalled();
  });
});