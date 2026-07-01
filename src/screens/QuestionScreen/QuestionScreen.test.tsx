import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuestionScreen from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockQuestion = {
    id: 'q1',
    text: 'What is the capital of France?',
    options: ['Paris', 'London', 'Berlin', 'Madrid'],
  };

  const mockOnAnswer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the question text correctly', () => {
    const { getByText } = render(
      <QuestionScreen question={mockQuestion} onAnswer={mockOnAnswer} />
    );
    expect(getByText('What is the capital of France?')).toBeTruthy();
  });

  it('renders all available options', () => {
    const { getByText } = render(
      <QuestionScreen question={mockQuestion} onAnswer={mockOnAnswer} />
    );
    expect(getByText('Paris')).toBeTruthy();
    expect(getByText('London')).toBeTruthy();
    expect(getByText('Berlin')).toBeTruthy();
    expect(getByText('Madrid')).toBeTruthy();
  });

  it('calls onAnswer with the correct question id and selected option when an option is pressed', () => {
    const { getByText } = render(
      <QuestionScreen question={mockQuestion} onAnswer={mockOnAnswer} />
    );
    const optionButton = getByText('Paris');
    fireEvent.press(optionButton);
    expect(mockOnAnswer).toHaveBeenCalledWith('q1', 'Paris');
  });

  it('does not call onAnswer if the same option is pressed multiple times (optional debounce/disable behavior)', () => {
    const { getByText } = render(
      <QuestionScreen question={mockQuestion} onAnswer={mockOnAnswer} />
    );
    const optionButton = getByText('Paris');
    fireEvent.press(optionButton);
    fireEvent.press(optionButton);
    expect(mockOnAnswer).toHaveBeenCalledTimes(1);
  });
});