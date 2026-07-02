import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuestionScreen from '../src/components/QuestionScreen';

describe('QuestionScreen', () => {
  const mockQuestion = {
    statement: 'What is the largest dinosaur?',
    illustration: 'brachiosaurus.png',
    options: ['T-Rex', 'Brachiosaurus', 'Velociraptor'],
  };

  it('renders the question statement', () => {
    const { getByText } = render(<QuestionScreen question={mockQuestion} />);
    expect(getByText('What is the largest dinosaur?')).toBeTruthy();
  });

  it('renders the dinosaur illustration', () => {
    const { getByTestId } = render(<QuestionScreen question={mockQuestion} />);
    expect(getByTestId('dinosaur-illustration')).toBeTruthy();
  });

  it('renders exactly 3 answer option buttons', () => {
    const { getAllByRole } = render(<QuestionScreen question={mockQuestion} />);
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders the correct answer option texts', () => {
    const { getByText } = render(<QuestionScreen question={mockQuestion} />);
    expect(getByText('T-Rex')).toBeTruthy();
    expect(getByText('Brachiosaurus')).toBeTruthy();
    expect(getByText('Velociraptor')).toBeTruthy();
  });

  it('calls onAnswerSelected with the option when an option button is pressed', () => {
    const onAnswerSelected = jest.fn();
    const { getByText } = render(
      <QuestionScreen question={mockQuestion} onAnswerSelected={onAnswerSelected} />
    );
    fireEvent.press(getByText('Brachiosaurus'));
    expect(onAnswerSelected).toHaveBeenCalledTimes(1);
    expect(onAnswerSelected).toHaveBeenCalledWith('Brachiosaurus');
  });

  it('renders each option as a button', () => {
    const { getByText } = render(<QuestionScreen question={mockQuestion} />);
    mockQuestion.options.forEach((option) => {
      const button = getByText(option);
      expect(button).toBeTruthy();
    });
  });

  it('does not crash when onAnswerSelected is not provided', () => {
    const { getByText } = render(<QuestionScreen question={mockQuestion} />);
    expect(() => fireEvent.press(getByText('T-Rex'))).not.toThrow();
  });
});
