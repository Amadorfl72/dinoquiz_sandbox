import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameFlow from '../GameFlow';

// Mock child components to isolate GameFlow routing logic
jest.mock('../QuestionScreen', () => ({ onAnswer }) => (
  <div data-testid="question-screen">
    <button data-testid="correct-answer" onClick={() => onAnswer(true)}>Correct</button>
    <button data-testid="incorrect-answer" onClick={() => onAnswer(false)}>Incorrect</button>
  </div>
));

jest.mock('../FunFactScreen', () => ({ onNext }) => (
  <div data-testid="fun-fact-screen">
    <button data-testid="next-button" onClick={onNext}>Next</button>
  </div>
));

jest.mock('../ResultsScreen', () => () => (
  <div data-testid="results-screen">Results</div>
));

describe('TRIOFSND-28: Integrate Fun Fact screen into game flow', () => {
  const mockQuestions = [
    { id: 1, text: 'Question 1', funFact: 'Fact 1' },
    { id: 2, text: 'Question 2', funFact: 'Fact 2' },
    { id: 3, text: 'Question 3', funFact: 'Fact 3' }
  ];

  it('transitions to Fun Fact screen after a correct answer', () => {
    render(<GameFlow questions={mockQuestions} />);
    
    expect(screen.getByTestId('question-screen')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('correct-answer'));
    
    expect(screen.queryByTestId('question-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
  });

  it('transitions to Fun Fact screen after an incorrect answer', () => {
    render(<GameFlow questions={mockQuestions} />);
    
    expect(screen.getByTestId('question-screen')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('incorrect-answer'));
    
    expect(screen.queryByTestId('question-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
  });

  it('routes to the next question when Next is clicked and it is not the last question', () => {
    render(<GameFlow questions={mockQuestions} />);
    
    // Answer first question
    fireEvent.click(screen.getByTestId('correct-answer'));
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
    
    // Click Next
    fireEvent.click(screen.getByTestId('next-button'));
    
    // Should show next question
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('question-screen')).toBeInTheDocument();
  });

  it('routes to the results screen when Next is clicked and it is the last question', () => {
    render(<GameFlow questions={mockQuestions} />);
    
    // Answer all questions
    for (let i = 0; i < mockQuestions.length; i++) {
      expect(screen.getByTestId('question-screen')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('incorrect-answer'));
      expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('next-button'));
    }
    
    // After the last question's Next button, should be on Results screen
    expect(screen.queryByTestId('question-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('results-screen')).toBeInTheDocument();
  });
});