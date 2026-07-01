import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Game } from '../Game';
import * as questionService from '../../services/questionService';

jest.mock('../../services/questionService');

describe('TRIOFSND-34: Implement "Volver a jugar" Game Reset Logic', () => {
  const mockQuestionPool = Array.from({ length: 20 }, (_, i) => ({
    id: `q${i}`,
    text: `Question ${i}`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A'
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    questionService.getRandomQuestions.mockImplementation((count) => {
      // Simulate selecting 'count' unique questions from the pool
      const shuffled = [...mockQuestionPool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    });
  });

  it('should render the "Volver a jugar" button when the game is over', () => {
    render(<Game initialGameState="gameover" initialScore={50} initialQuestionIndex={9} />);
    const resetButton = screen.getByText('Volver a jugar');
    expect(resetButton).toBeInTheDocument();
  });

  it('should reset the game state (score and progress) when "Volver a jugar" is clicked', async () => {
    render(<Game initialGameState="gameover" initialScore={50} initialQuestionIndex={9} />);
    
    const resetButton = screen.getByText('Volver a jugar');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText(/Score: 0/i)).toBeInTheDocument();
      expect(screen.getByText(/Question 1 of 10/i)).toBeInTheDocument();
    });
  });

  it('should select a new random set of 10 questions from the pool without repetition', async () => {
    render(<Game initialGameState="gameover" initialScore={50} initialQuestionIndex={9} />);
    
    const resetButton = screen.getByText('Volver a jugar');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(questionService.getRandomQuestions).toHaveBeenCalledTimes(1);
      expect(questionService.getRandomQuestions).toHaveBeenCalledWith(10);
    });

    // Verify the questions rendered are unique
    const questionElements = screen.getAllByTestId('question-text');
    expect(questionElements).toHaveLength(10);
    
    const questionTexts = questionElements.map(el => el.textContent);
    const uniqueQuestions = new Set(questionTexts);
    expect(uniqueQuestions.size).toBe(10);
  });

  it('should navigate to the first question when "Volver a jugar" is clicked', async () => {
    render(<Game initialGameState="gameover" initialScore={50} initialQuestionIndex={9} />);
    
    const resetButton = screen.getByText('Volver a jugar');
    fireEvent.click(resetButton);

    await waitFor(() => {
      // Assuming the component displays the current question index (1-based for UI)
      expect(screen.getByText(/Question 1 of 10/i)).toBeInTheDocument();
      // Ensure it's not on the last question anymore
      expect(screen.queryByText(/Question 10 of 10/i)).not.toBeInTheDocument();
    });
  });
});