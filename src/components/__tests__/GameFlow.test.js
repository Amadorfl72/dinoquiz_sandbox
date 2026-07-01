import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameFlow from '../GameFlow';
import { GameProvider } from '../../context/GameContext';

// Mock child components to isolate GameFlow routing logic
jest.mock('../../screens/FunFactScreen', () => ({ onNext }) => (
  <div data-testid="fun-fact-screen">
    <button data-testid="next-button" onClick={onNext}>Next</button>
  </div>
));

jest.mock('../../screens/QuestionScreen', () => ({ onAnswer }) => (
  <div data-testid="question-screen">
    <button data-testid="answer-correct-btn" onClick={() => onAnswer(true)}>Correct</button>
    <button data-testid="answer-incorrect-btn" onClick={() => onAnswer(false)}>Incorrect</button>
  </div>
));

jest.mock('../../screens/ResultsScreen', () => () => (
  <div data-testid="results-screen" />
));

describe('TRIOFSND-28: Integrate Fun Fact screen into game flow', () => {
  const mockQuestions = [
    { id: 1, text: 'Question 1', funFact: 'Fact 1' },
    { id: 2, text: 'Question 2', funFact: 'Fact 2' }
  ];

  const renderGameFlow = (questions = mockQuestions) => {
    return render(
      <GameProvider initialQuestions={questions}>
        <GameFlow />
      </GameProvider>
    );
  };

  test('should transition to Fun Fact screen after a correct answer', () => {
    renderGameFlow();
    
    expect(screen.getByTestId('question-screen')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('answer-correct-btn'));
    
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('question-screen')).not.toBeInTheDocument();
  });

  test('should transition to Fun Fact screen after an incorrect answer', () => {
    renderGameFlow();
    
    expect(screen.getByTestId('question-screen')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('answer-incorrect-btn'));
    
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('question-screen')).not.toBeInTheDocument();
  });

  test('should route to the next question when Next is clicked and it is not the last question', () => {
    renderGameFlow();
    
    fireEvent.click(screen.getByTestId('answer-correct-btn'));
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('next-button'));
    
    expect(screen.getByTestId('question-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
  });

  test('should route to the results screen when Next is clicked and it is the last question', () => {
    const singleQuestion = [mockQuestions[0]];
    renderGameFlow(singleQuestion);
    
    fireEvent.click(screen.getByTestId('answer-incorrect-btn'));
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('next-button'));
    
    expect(screen.getByTestId('results-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
  });
});