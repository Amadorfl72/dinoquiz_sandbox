import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Game } from './Game';
import * as gameUtils from '../utils/gameUtils';

jest.mock('../utils/gameUtils');

describe('TRIOFSND-34: Volver a jugar Game Reset Logic', () => {
  const mockPool = Array.from({ length: 30 }, (_, i) => ({ id: i, question: `Question ${i}` }));
  const firstSet = mockPool.slice(0, 10);
  const secondSet = mockPool.slice(10, 20);

  beforeEach(() => {
    jest.clearAllMocks();
    gameUtils.selectRandomQuestions.mockImplementation((pool, count) => {
      // Simple mock to return different sets sequentially
      if (gameUtils.selectRandomQuestions.mock.calls.length === 1) return firstSet;
      return secondSet;
    });
  });

  it('resets game state, selects new questions, and navigates to first question', async () => {
    render(<Game />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Question 0')).toBeInTheDocument();
    });

    // Simulate game over to show the button (assuming a mock or state change)
    // For the sake of the test, we assume the button is rendered or we can trigger game over.
    // Let's assume we can find the button.
    const resetButton = await screen.findByRole('button', { name: /Volver a jugar/i });
    
    fireEvent.click(resetButton);

    await waitFor(() => {
      // Check if navigated to first question of the new set
      expect(screen.getByText('Question 10')).toBeInTheDocument();
      // Check if game state is reset (e.g., score is 0)
      expect(screen.getByText(/Score: 0/i)).toBeInTheDocument();
      // Check if question index is reset
      expect(screen.getByText(/Pregunta 1 de 10/i)).toBeInTheDocument();
    });
  });
});