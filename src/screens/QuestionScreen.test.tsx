import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestionScreen } from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockQuestion = {
    statement: 'What is the largest dinosaur?',
    illustration: 'dino.png',
    options: ['T-Rex', 'Brachiosaurus', 'Triceratops'],
  };

  it('renders the question statement', () => {
    const { getByText } = render(<QuestionScreen question={mockQuestion} />);
    expect(getByText(mockQuestion.statement)).toBeTruthy();
  });

  it('renders the dinosaur illustration', () => {
    const { getByTestId } = render(<QuestionScreen question={mockQuestion} />);
    expect(getByTestId('dinosaur-illustration')).toBeTruthy();
  });

  it('renders exactly 3 answer option buttons', () => {
    const { getAllByTestId } = render(<QuestionScreen question={mockQuestion} />);
    const buttons = getAllByTestId('answer-option-button');
    expect(buttons).toHaveLength(3);
  });

  it('renders the correct answer option texts', () => {
    const { getByText } = render(<QuestionScreen question={mockQuestion} />);
    mockQuestion.options.forEach(option => {
      expect(getByText(option)).toBeTruthy();
    });
  });
});
