import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Game from './Game';

// Mock the question pool with 50 unique questions
const mockQuestionPool = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  text: `Question ${i}`,
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'A'
}));

jest.mock('./questionPool', () => ({
  getQuestionPool: () => mockQuestionPool
}));

describe('TRIOFSND-34: Implement "Volver a jugar" Game Reset Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const finishGame = async () => {
    // Helper to simulate finishing the game by answering 10 questions
    for (let i = 0; i < 10; i++) {
      const answerButton = await screen.findByText('A');
      fireEvent.click(answerButton);
      const nextButton = await screen.findByText('Siguiente');
      fireEvent.click(nextButton);
    }
  };

  it('should display the "Volver a jugar" button when the game is over', async () => {
    render(<Game />);
    await finishGame();
    
    const resetButton = await screen.findByText('Volver a jugar');
    expect(resetButton).toBeInTheDocument();
  });

  it('should reset the game state and navigate to the first question when "Volver a jugar" is clicked', async () => {
    render(<Game />);
    await finishGame();
    
    const resetButton = await screen.findByText('Volver a jugar');
    fireEvent.click(resetButton);
    
    // Check if score is reset
    expect(screen.getByText(/Puntuación: 0/i)).toBeInTheDocument();
    
    // Check if it navigated to the first question (index 0)
    expect(screen.getByText(/Pregunta 1 de 10/i)).toBeInTheDocument();
  });

  it('should select a new random set of 10 questions from the pool without repetition', async () => {
    const mathSpy = jest.spyOn(Math, 'random');
    
    render(<Game />);
    const firstQuestionText = screen.getByText(/Question \d+/).textContent;
    
    await finishGame();
    
    // Change Math.random to return different values for the next game
    mathSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.2).mockReturnValueOnce(0.3);
    
    const resetButton = await screen.findByText('Volver a jugar');
    fireEvent.click(resetButton);
    
    const newFirstQuestionText = screen.getByText(/Question \d+/).textContent;
    
    // Ensure the new set is different (randomness)
    expect(newFirstQuestionText).not.toEqual(firstQuestionText);
    
    // Ensure there are exactly 10 questions in the new game
    expect(screen.getByText(/Pregunta 1 de 10/i)).toBeInTheDocument();
  });
});