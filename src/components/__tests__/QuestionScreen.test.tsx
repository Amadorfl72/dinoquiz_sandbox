import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuestionScreen } from '../QuestionScreen';

describe('TRIOFSND-19: Implement Incorrect Answer Feedback', () => {
  const mockQuestion = {
    id: 'q1',
    text: 'What is the capital of France?',
    options: [
      { id: 'o1', text: 'London' },
      { id: 'o2', text: 'Paris' },
      { id: 'o3', text: 'Berlin' },
      { id: 'o4', text: 'Madrid' }
    ],
    correctOptionId: 'o2',
    funFact: 'Paris is known as the City of Light.'
  };

  const mockNavigate = jest.fn();
  const mockUpdateScore = jest.fn();

  const defaultProps = {
    question: mockQuestion,
    navigateToFunFact: mockNavigate,
    updateScore: mockUpdateScore,
    currentScore: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should visually highlight the correct option when an incorrect option is tapped', async () => {
    const { getByTestId } = render(<QuestionScreen {...defaultProps} />);
    
    const incorrectOption = getByTestId('option-o1');
    fireEvent.press(incorrectOption);
    
    const correctOption = getByTestId('option-o2');
    // Assuming the component applies a 'highlighted' style or testID suffix
    expect(correctOption.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#4CAF50' }) // Green highlight for correct
      ])
    );
  });

  it('should show a gentle non-punitive message when an incorrect option is tapped', async () => {
    const { getByTestId, getByText } = render(<QuestionScreen {...defaultProps} />);
    
    const incorrectOption = getByTestId('option-o1');
    fireEvent.press(incorrectOption);
    
    // Check for a gentle, non-punitive message
    const message = getByText(/Good try!|Almost!|Not quite, but keep going!/i);
    expect(message).toBeTruthy();
  });

  it('should transition to the fun fact screen without subtracting score', async () => {
    const { getByTestId } = render(<QuestionScreen {...defaultProps} />);
    
    const incorrectOption = getByTestId('option-o1');
    fireEvent.press(incorrectOption);
    
    // Verify score is not subtracted
    expect(mockUpdateScore).not.toHaveBeenCalledWith(expect.any(Number), false);
    expect(mockUpdateScore).not.toHaveBeenCalled();
    
    // Verify navigation to fun fact screen occurs
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('FunFact', { questionId: 'q1' });
    });
  });
});
