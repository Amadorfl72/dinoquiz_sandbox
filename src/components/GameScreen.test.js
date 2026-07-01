import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameScreen } from './GameScreen';
import * as questionPool from './questionPool';

jest.mock('./questionPool');

describe('TRIOFSND-34: Volver a jugar Game Reset Logic', () => {
  const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
    id: `q${i}`,
    text: `Question ${i}`,
    answer: `Answer ${i}`
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    questionPool.getRandomQuestions.mockImplementation((count, exclude = []) => {
      const available = mockQuestions.filter(q => !exclude.includes(q.id));
      return available.slice(0, count);
    });
  });

  it('resets game state, selects 10 new questions without repetition, and navigates to first question', async () => {
    const initialQuestions = mockQuestions.slice(0, 10);
    
    // Render the component in a "Game Over" state
    render(<GameScreen initialQuestions={initialQuestions} gameOver={true} />);

    // Verify game over screen is shown
    expect(screen.getByText(/Game Over/i)).toBeInTheDocument();
    
    // Click the reset button
    fireEvent.click(screen.getByText(/Volver a jugar/i));

    // Check if getRandomQuestions was called with 10 and excluded the previous questions
    expect(questionPool.getRandomQuestions).toHaveBeenCalledWith(10, initialQuestions.map(q => q.id));

    // Wait for state update and verify reset
    await waitFor(() => {
      // Verify we are back to the first question
      expect(screen.getByTestId('current-question-index')).toHaveTextContent('1 / 10');
      // Verify score is reset
      expect(screen.getByTestId('current-score')).toHaveTextContent('0');
      // Verify lives/attempts are reset if applicable
      expect(screen.getByTestId('current-lives')).toHaveTextContent('3');
    });
  });
});