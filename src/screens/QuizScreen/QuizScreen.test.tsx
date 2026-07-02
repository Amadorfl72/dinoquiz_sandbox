import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import QuizScreen from './QuizScreen';

// Mocking dependencies
jest.mock('../../utils/SoundManager', () => ({
  playSound: jest.fn(),
}));
jest.mock('../../navigation/NavigationRef', () => ({
  navigate: jest.fn(),
}));
jest.mock('../../hooks/useAnimation', () => ({
  useAnimation: jest.fn(),
}));

const SoundManager = require('../../utils/SoundManager');
const NavigationRef = require('../../navigation/NavigationRef');
const { useAnimation } = require('../../hooks/useAnimation');

describe('TRIOFSND-18: Implement Correct Answer Feedback', () => {
  let mockTriggerAnimation;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerAnimation = jest.fn();
    useAnimation.mockReturnValue({ triggerAnimation: mockTriggerAnimation });
  });

  it('plays a happy sound effect when the correct option is tapped', () => {
    const { getByTestId } = render(<QuizScreen />);
    const correctOption = getByTestId('option-correct');

    fireEvent.press(correctOption);

    expect(SoundManager.playSound).toHaveBeenCalledWith('happy_sound');
  });

  it('shows a positive animation when the correct option is tapped', () => {
    const { getByTestId } = render(<QuizScreen />);
    const correctOption = getByTestId('option-correct');

    fireEvent.press(correctOption);

    expect(mockTriggerAnimation).toHaveBeenCalledWith('positive_animation');
  });

  it('transitions to the fun fact screen when the correct option is tapped', async () => {
    const { getByTestId } = render(<QuizScreen />);
    const correctOption = getByTestId('option-correct');

    fireEvent.press(correctOption);

    await waitFor(() => {
      expect(NavigationRef.navigate).toHaveBeenCalledWith('FunFactScreen');
    });
  });
});
