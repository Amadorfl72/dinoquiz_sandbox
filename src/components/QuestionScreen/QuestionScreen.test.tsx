import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuestionScreen } from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockQuestion = {
    id: 'q1',
    text: 'What is the capital of France?',
    options: [
      { id: 'o1', text: 'Berlin' },
      { id: 'o2', text: 'Madrid' },
      { id: 'o3', text: 'Paris' },
      { id: 'o4', text: 'Rome' },
    ],
  };

  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the question text correctly', () => {
    render(<QuestionScreen question={mockQuestion} onSubmit={mockOnSubmit} />);
    expect(screen.getByText(mockQuestion.text)).toBeInTheDocument();
  });

  it('renders all answer options', () => {
    render(<QuestionScreen question={mockQuestion} onSubmit={mockOnSubmit} />);
    mockQuestion.options.forEach((option) => {
      expect(screen.getByText(option.text)).toBeInTheDocument();
    });
  });

  it('allows the user to select an answer option', () => {
    render(<QuestionScreen question={mockQuestion} onSubmit={mockOnSubmit} />);
    const optionToSelect = screen.getByText('Paris');
    fireEvent.click(optionToSelect);
    expect(optionToSelect).toHaveClass('selected'); // Assuming selected class is applied
  });

  it('disables the submit button when no answer is selected', () => {
    render(<QuestionScreen question={mockQuestion} onSubmit={mockOnSubmit} />);
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables the submit button when an answer is selected', () => {
    render(<QuestionScreen question={mockQuestion} onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByText('Paris'));
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit with the selected answer when submit button is clicked', () => {
    render(<QuestionScreen question={mockQuestion} onSubmit={mockOnSubmit} />);
    const selectedOptionText = 'Paris';
    const selectedOption = mockQuestion.options.find(o => o.text === selectedOptionText);

    fireEvent.click(screen.getByText(selectedOptionText));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith(mockQuestion.id, selectedOption.id);
  });
});