import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import QuestionScreen from './QuestionScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock sound player
const mockPlayHappySound = jest.fn();
jest.mock('../../utils/soundPlayer', () => ({
  playHappySound: mockPlayHappySound,
}));

// Mock animation component to track if it's shown
jest.mock('../../components/PositiveAnimation', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockPositiveAnimation() {
    return React.createElement(Text, { testID: 'positive-animation' }, 'Positive Animation');
  };
});

describe('QuestionScreen - TRIOFSND-18: Correct Answer Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the correct option', () => {
    const { getByTestId } = render(<QuestionScreen />);
    expect(getByTestId('option-correct')).toBeTruthy();
  });

  it('plays a happy sound effect on tapping the correct option', () => {
    const { getByTestId } = render(<QuestionScreen />);
    fireEvent.press(getByTestId('option-correct'));
    expect(mockPlayHappySound).toHaveBeenCalledTimes(1);
  });

  it('shows a positive animation on tapping the correct option', () => {
    const { getByTestId } = render(<QuestionScreen />);
    fireEvent.press(getByTestId('option-correct'));
    expect(getByTestId('positive-animation')).toBeTruthy();
  });

  it('transitions to the fun fact screen on tapping the correct option', () => {
    const { getByTestId } = render(<QuestionScreen />);
    fireEvent.press(getByTestId('option-correct'));
    
    // Advance timers if there is a delay before navigation
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('FunFact');
  });
});
