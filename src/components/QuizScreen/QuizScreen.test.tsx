import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuizScreen } from './QuizScreen';
import { useScore } from '../../context/ScoreContext';
import { navigate } from '../../navigation/NavigationService';

jest.mock('../../navigation/NavigationService', () => ({
  navigate: jest.fn(),
}));

jest.mock('../../context/ScoreContext', () => ({
  useScore: jest.fn(),
}));

describe('TRIOFSND-19: Implement Incorrect Answer Feedback', () => {
  const mockQuestion = {
    id: '1',
    question: 'What is the capital of France?',
    options: ['London', 'Paris', 'Berlin', 'Madrid'],
    correctOption: 'Paris',
    funFact: 'Paris is known as the City of Light.',
  };

  const mockSubtractScore = jest.fn();
  const mockAddScore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useScore as jest.Mock).mockReturnValue({
      score: 100,
      subtractScore: mockSubtractScore,
      addScore: mockAddScore,
    });
  });

  it('highlights the correct option when an incorrect option is tapped', async () => {
    const { getByText, getByTestId } = render(<QuizScreen question={mockQuestion} />);

    const incorrectOption = getByText('London');
    fireEvent.press(incorrectOption);

    const correctOption = getByTestId('option-Paris');
    await waitFor(() => {
      expect(correctOption.props.style.backgroundColor).toBe('#4CAF50'); // Assuming green for correct highlight
    });
  });

  it('shows a gentle non-punitive message when an incorrect option is tapped', async () => {
    const { getByText } = render(<QuizScreen question={mockQuestion} />);

    const incorrectOption = getByText('London');
    fireEvent.press(incorrectOption);

    await waitFor(() => {
      expect(getByText("That's okay! Let's learn something new.")).toBeTruthy();
    });
  });

  it('transitions to the fun fact screen when an incorrect option is tapped', async () => {
    const { getByText } = render(<QuizScreen question={mockQuestion} />);

    const incorrectOption = getByText('Berlin');
    fireEvent.press(incorrectOption);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('FunFactScreen', {
        funFact: mockQuestion.funFact,
      });
    });
  });

  it('does not subtract score when an incorrect option is tapped', async () => {
    const { getByText } = render(<QuizScreen question={mockQuestion} />);

    const incorrectOption = getByText('Madrid');
    fireEvent.press(incorrectOption);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });

    expect(mockSubtractScore).not.toHaveBeenCalled();
  });
});