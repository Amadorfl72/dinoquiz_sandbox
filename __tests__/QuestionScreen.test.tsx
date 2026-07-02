import React from 'react';
import { render } from '@testing-library/react-native';
import QuestionScreen from '../src/screens/QuestionScreen';

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
});
