import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuizScreen from '../QuizScreen';

describe('TRIOFSND-19: Implement Incorrect Answer Feedback', () => {
  const mockProps = {
    question: {
      text: 'What is 2+2?',
      options: [
        { id: '1', text: '3' },
        { id: '2', text: '4' },
        { id: '3', text: '5' }
      ],
      correctOptionId: '2',
      funFact: '4 is an even number.'
    },
    currentScore: 50,
    onNavigateToNext: jest.fn()
  };

  it('highlights correct option, shows gentle message, transitions to fun fact, and does not subtract score on incorrect tap', () => {
    const { getByText, getByTestId } = render(<QuizScreen {...mockProps} />);

    // Tap incorrect option
    fireEvent.press(getByText('3'));

    // Highlight correct option
    const correctOption = getByTestId('option-2');
    expect(correctOption.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ backgroundColor: 'green' })]));

    // Gentle non-punitive message
    expect(getByText('Good try! The correct answer is highlighted.')).toBeTruthy();

    // Transition to fun fact screen
    expect(getByText('Fun Fact:')).toBeTruthy();
    expect(getByText('4 is an even number.')).toBeTruthy();

    // Score not subtracted
    expect(getByText('Score: 50')).toBeTruthy();
  });
});