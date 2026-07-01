import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuestionScreen from './QuestionScreen';

describe('QuestionScreen Component', () => {
  const mockQuestion = {
    question: 'What dinosaur is known for having three horns?',
    options: ['T-Rex', 'Triceratops', 'Stegosaurus', 'Velociraptor'],
    correctAnswer: 'Triceratops',
    dinosaurImage: 'triceratops.png',
    funFact: 'The Triceratops had a beak-like mouth and could grow up to 9 meters long!'
  };
  
  const mockOnAnswerSelected = jest.fn();
  const mockOnNextQuestion = jest.fn();
  
  beforeEach(() => {
    render(
      <QuestionScreen
        question={mockQuestion.question}
        options={mockQuestion.options}
        correctAnswer={mockQuestion.correctAnswer}
        dinosaurImage={mockQuestion.dinosaurImage}
        funFact={mockQuestion.funFact}
        onAnswerSelected={mockOnAnswerSelected}
        onNextQuestion={mockOnNextQuestion}
      />
    );
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders question and options correctly', () => {
    expect(screen.getByText(mockQuestion.question)).toBeInTheDocument();
    mockQuestion.options.forEach(option => {
      expect(screen.getByText(option)).toBeInTheDocument();
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', mockQuestion.dinosaurImage);
  });
  
  test('handles correct answer selection', () => {
    const correctOption = screen.getByText(mockQuestion.correctAnswer);
    fireEvent.click(correctOption);
    
    expect(correctOption).toHaveClass('correct');
    expect(screen.getByText(mockQuestion.funFact)).toBeInTheDocument();
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
    expect(mockOnAnswerSelected).toHaveBeenCalledWith(true);
  });
  
  test('handles incorrect answer selection', () => {
    const incorrectOptions = mockQuestion.options.filter(option => option !== mockQuestion.correctAnswer);
    const firstIncorrectOption = screen.getByText(incorrectOptions[0]);
    fireEvent.click(firstIncorrectOption);
    
    expect(firstIncorrectOption).toHaveClass('incorrect');
    expect(screen.getByText(mockQuestion.correctAnswer)).toHaveClass('correct');
    expect(screen.getByText(mockQuestion.funFact)).toBeInTheDocument();
    expect(mockOnAnswerSelected).toHaveBeenCalledWith(false);
  });
  
  test('disables options after selection', () => {
    const firstOption = screen.getByText(mockQuestion.options[0]);
    fireEvent.click(firstOption);
    
    mockQuestion.options.forEach(option => {
      const optionButton = screen.getByText(option);
      expect(optionButton).toBeDisabled();
    });
  });
  
  test('proceeds to next question', () => {
    const firstOption = screen.getByText(mockQuestion.options[0]);
    fireEvent.click(firstOption);
    
    const nextButton = screen.getByText('Siguiente');
    fireEvent.click(nextButton);
    
    expect(mockOnNextQuestion).toHaveBeenCalled();
  });
});