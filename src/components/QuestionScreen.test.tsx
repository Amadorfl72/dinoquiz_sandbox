import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import QuestionScreen from './QuestionScreen';
import { playSound } from '../utils/soundUtils';
import { useNavigation } from '@react-navigation/native';

jest.mock('../utils/soundUtils');
jest.mock('@react-navigation/native');
jest.mock('./PositiveAnimation', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: any) => <View testID="positive-animation" {...props} />;
});

describe('QuestionScreen - TRIOFSND-18: Correct Answer Feedback', () => {
  const mockNavigate = jest.fn();
  const mockPlaySound = playSound as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
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
    expect(mockPlaySound).toHaveBeenCalledWith('happy_sound');
  });

  it('shows a positive animation on tapping the correct option', () => {
    const { getByTestId, queryByTestId } = render(<QuestionScreen />);
    expect(queryByTestId('positive-animation')).toBeNull();
    fireEvent.press(getByTestId('option-correct'));
    expect(getByTestId('positive-animation')).toBeTruthy();
  });

  it('transitions to the fun fact screen after the animation on tapping the correct option', () => {
    const { getByTestId } = render(<QuestionScreen />);
    fireEvent.press(getByTestId('option-correct'));
    
    // Assuming the transition happens after a short delay for the animation
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('FunFact');
  });
});