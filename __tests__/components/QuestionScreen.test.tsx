import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import QuestionScreen from '../QuestionScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock game store
const mockUseGameStore = jest.fn();
jest.mock('../../store/gameStore', () => ({
  useGameStore: () => mockUseGameStore(),
}));

describe('TRIOFSND-19: Implement Incorrect Answer Feedback', () => {
  const baseState = {
    score: 100,
    currentQuestion: {
      id: 'q1',
      text: 'What is 2+2?',
      options: [
        { id: 'opt1', text: '3', isCorrect: false },
        { id: 'opt2', text: '4', isCorrect: true },
        { id: 'opt3', text: '5', isCorrect: false },
      ],
      funFact: '4 is the only number that has the same number of letters as its meaning.',
    },
    setScore: jest.fn(),
    goToFunFact: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGameStore.mockReturnValue(baseState);
  });

  it('highlights the correct option and shows a gentle non-punitive message on incorrect tap', () => {
    const { getByText, getByTestId } = render(<QuestionScreen />);

    // Tap incorrect option
    fireEvent.press(getByText('3'));

    // Check correct option is highlighted
    const correctOption = getByTestId('option-opt2');
    expect(correctOption.props.className).toContain('correct');

    // Check non-punitive message is displayed
    expect(getByText(/¡Casi!|Sigamos aprendiendo/i)).toBeTruthy();
  });

  it('transitions to the fun fact screen without subtracting score', async () => {
    const { getByText } = render(<QuestionScreen />);

    // Tap incorrect option
    fireEvent.press(getByText('5'));

    // Verify transition to fun fact screen
    await waitFor(() => {
      expect(baseState.goToFunFact).toHaveBeenCalledWith(baseState.currentQuestion.funFact);
    });

    // Verify score was not subtracted
    expect(baseState.setScore).not.toHaveBeenCalled();
  });
});