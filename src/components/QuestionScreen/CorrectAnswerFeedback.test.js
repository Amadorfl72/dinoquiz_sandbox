import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuestionScreen from './QuestionScreen';

// Mock the sound player
jest.mock('../../utils/soundPlayer', () => ({
  playHappySound: jest.fn(),
}));

// Mock the navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock the positive animation component to easily check if it's rendered
jest.mock('../animations/PositiveAnimation', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => React.createElement(Text, { testID: 'positive-animation' }, 'Positive Animation');
});

const soundPlayer = require('../../utils/soundPlayer');

describe('TRIOFSND-18: Implement Correct Answer Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOptions = [
    { id: '1', text: 'Wrong Option 1', isCorrect: false },
    { id: '2', text: 'Correct Option', isCorrect: true },
    { id: '3', text: 'Wrong Option 2', isCorrect: false },
  ];

  it('plays a happy sound effect when the correct option is tapped', () => {
    const { getByText } = render(<QuestionScreen options={mockOptions} />);
    
    const correctOption = getByText('Correct Option');
    fireEvent.press(correctOption);

    expect(soundPlayer.playHappySound).toHaveBeenCalledTimes(1);
  });

  it('shows a positive animation when the correct option is tapped', () => {
    const { getByText, queryByTestId } = render(<QuestionScreen options={mockOptions} />);
    
    // Animation should not be visible initially
    expect(queryByTestId('positive-animation')).toBeNull();
    
    const correctOption = getByText('Correct Option');
    fireEvent.press(correctOption);

    // Animation should be visible after tapping correct option
    expect(queryByTestId('positive-animation')).not.toBeNull();
  });

  it('transitions to the fun fact screen when the correct option is tapped', () => {
    const { getByText } = render(<QuestionScreen options={mockOptions} />);
    
    const correctOption = getByText('Correct Option');
    fireEvent.press(correctOption);

    // Wait for animation/sound to process and trigger navigation
    // Assuming navigation happens immediately or after a slight delay handled by the component
    expect(mockNavigate).toHaveBeenCalledWith('FunFact');
  });

  it('does not trigger correct answer feedback when a wrong option is tapped', () => {
    const { getByText, queryByTestId } = render(<QuestionScreen options={mockOptions} />);
    
    const wrongOption = getByText('Wrong Option 1');
    fireEvent.press(wrongOption);

    expect(soundPlayer.playHappySound).not.toHaveBeenCalled();
    expect(queryByTestId('positive-animation')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalledWith('FunFact');
  });
});