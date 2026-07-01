import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Game from './Game';
import * as questionPool from '../../api/questionPool';

jest.mock('../../api/questionPool');

describe('TRIOFSND-34: Game Reset Logic - Volver a jugar', () => {
  const mockPool = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    question: `Question ${i}`,
    answer: `Answer ${i}`,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    questionPool.getQuestions.mockResolvedValue(mockPool);
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the "Volver a jugar" button', async () => {
    render(<Game />);
    await waitFor(() => expect(screen.getByText('Volver a jugar')).toBeInTheDocument());
  });

  it('resets the game state and navigates to the first question when clicked', async () => {
    render(<Game />);
    await waitFor(() => expect(screen.getByText('Volver a jugar')).toBeInTheDocument());
    
    const resetButton = screen.getByText('Volver a jugar');
    fireEvent.click(resetButton);

    await waitFor(() => {
      // Check that the score is reset
      expect(screen.getByTestId('score').textContent).toBe('0');
      // Check that the current question index is reset to 1 (first question)
      expect(screen.getByTestId('question-number').textContent).toBe('1 / 10');
      // Check that the reset button is no longer visible
      expect(screen.queryByText('Volver a jugar')).not.toBeInTheDocument();
    });
  });

  it('selects a new random set of 10 questions from the pool without repetition', async () => {
    render(<Game />);
    await waitFor(() => expect(screen.getByText('Volver a jugar')).toBeInTheDocument());
    
    // Change random mock to ensure a different set is fetched on reset
    jest.spyOn(global.Math, 'random').mockReturnValue(0.1);
    
    const resetButton = screen.getByText('Volver a jugar');
    fireEvent.click(resetButton);

    await waitFor(() => {
      const questionIds = screen.getAllByTestId('question-id').map(el => parseInt(el.textContent, 10));
      
      // Should select exactly 10 questions
      expect(questionIds.length).toBe(10);
      // Should have no repetitions
      expect(new Set(questionIds).size).toBe(10);
    });
  });

  it('loads a completely new game state upon clicking', async () => {
    render(<Game />);
    await waitFor(() => expect(screen.getByText('Volver a jugar')).toBeInTheDocument());
    
    const resetButton = screen.getByText('Volver a jugar');
    fireEvent.click(resetButton);

    // Verify that a new fetch request was made to the question pool
    await waitFor(() => {
      expect(questionPool.getQuestions).toHaveBeenCalledTimes(2);
    });
    
    // Verify that progress bar or lives are reset
    expect(screen.getByTestId('progress-bar').getAttribute('data-value')).toBe('0');
  });
});