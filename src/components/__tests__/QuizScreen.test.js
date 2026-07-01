import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuizScreen } from '../QuizScreen';
import { useScore } from '../../hooks/useScore';

jest.mock('../../hooks/useScore');

describe('TRIOFSND-19: Implement Incorrect Answer Feedback', () => {
  const mockSubtractScore = jest.fn();
  const mockNavigate = jest.fn();

  const mockQuestion = {
    id: '1',
    question: 'What is the capital of France?',
    options: ['London', 'Paris', 'Berlin', 'Madrid'],
    correctOption: 'Paris',
    funFact: 'Paris is known as the City of Light.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useScore.mockReturnValue({
      score: 100,
      subtractScore: mockSubtractScore,
      addScore: jest.fn(),
    });
  });

  it('should visually highlight the correct option when an incorrect option is tapped', async () => {
    const { getByText } = render(
      <QuizScreen question={mockQuestion} navigation={{ navigate: mockNavigate }} />
    );
    
    const incorrectOption = getByText('London');
    fireEvent.press(incorrectOption);

    const correctOption = getByText('Paris');
    await waitFor(() => {
      expect(correctOption.props.testID).toBe('correct-option-highlighted');
    });
  });

  it('should show a gentle non-punitive message when an incorrect option is tapped', () => {
    const { getByText } = render(
      <QuizScreen question={mockQuestion} navigation={{ navigate: mockNavigate }} />
    );
    
    const incorrectOption = getByText('London');
    fireEvent.press(incorrectOption);

    expect(getByText(/Good try!|Almost there!|Nice effort!/i)).toBeTruthy();
  });

  it('should transition to the fun fact screen', async () => {
    const { getByText } = render(
      <QuizScreen question={mockQuestion} navigation={{ navigate: mockNavigate }} />
    );
    
    const incorrectOption = getByText('London');
    fireEvent.press(incorrectOption);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('FunFact', { funFact: mockQuestion.funFact });
    });
  });

  it('should not subtract score when an incorrect option is tapped', () => {
    const { getByText } = render(
      <QuizScreen question={mockQuestion} navigation={{ navigate: mockNavigate }} />
    );
    
    const incorrectOption = getByText('London');
    fireEvent.press(incorrectOption);

    expect(mockSubtractScore).not.toHaveBeenCalled();
  });
});