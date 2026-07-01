import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameFlow from '../GameFlow';

// Mock child components to isolate flow logic
jest.mock('../components/QuestionScreen', () => ({ onAnswer }) => (
  <div data-testid="question-screen">
    <button onClick={() => onAnswer(true)} data-testid="correct-answer-btn">Correct Answer</button>
    <button onClick={() => onAnswer(false)} data-testid="incorrect-answer-btn">Incorrect Answer</button>
  </div>
));

jest.mock('../components/FunFactScreen', () => ({ onNext }) => (
  <div data-testid="fun-fact-screen">
    <button onClick={onNext} data-testid="next-btn">Next</button>
  </div>
));

jest.mock('../components/ResultsScreen', () => () => (
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
    
    fireEvent.click(screen.getByTestId('correct-answer-btn'));
    
    expect(screen.queryByTestId('question-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
  });

  it('transitions to Fun Fact screen after an incorrect answer', () => {
    render(<GameFlow questions={mockQuestions} />);
    
    expect(screen.getByTestId('question-screen')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('incorrect-answer-btn'));
    
    expect(screen.queryByTestId('question-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
  });

  it('routes to the next question when Next is clicked and it is not the last question', () => {
    render(<GameFlow questions={mockQuestions} />);
    
    // Answer first question
    fireEvent.click(screen.getByTestId('correct-answer-btn'));
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
    
    // Click Next
    fireEvent.click(screen.getByTestId('next-btn'));
    
    // Should show next question
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('question-screen')).toBeInTheDocument();
  });

  it('routes to the results screen when Next is clicked on the last question', () => {
    render(<GameFlow questions={mockQuestions} />);
    
    // Answer first question
    fireEvent.click(screen.getByTestId('correct-answer-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));
    
    // Answer second question
    fireEvent.click(screen.getByTestId('incorrect-answer-btn'));
    fireEvent.click(screen.getByTestId('next-btn'));
    
    // Answer third (last) question
    fireEvent.click(screen.getByTestId('correct-answer-btn'));
    expect(screen.getByTestId('fun-fact-screen')).toBeInTheDocument();
    
    // Click Next on last question
    fireEvent.click(screen.getByTestId('next-btn'));
    
    // Should show results screen
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('results-screen')).toBeInTheDocument();
  });
});