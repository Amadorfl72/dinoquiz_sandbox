import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import QuizScreen from '../src/screens/QuizScreen';
import { SoundPlayer } from '../src/utils/SoundPlayer';
import { useNavigation } from '@react-navigation/native';

jest.mock('../src/utils/SoundPlayer', () => ({
  SoundPlayer: {
    play: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('TRIOFSND-18: Implement Correct Answer Feedback', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue({ navigate: mockNavigate });
  });

  it('should play a happy sound effect on tapping the correct option', () => {
    const { getByTestId } = render(<QuizScreen />);
    const correctOption = getByTestId('option-correct');

    fireEvent.press(correctOption);

    expect(SoundPlayer.play).toHaveBeenCalledWith('happy_sound.mp3');
  });

  it('should show a positive animation on tapping the correct option', async () => {
    const { getByTestId, queryByTestId } = render(<QuizScreen />);
    const correctOption = getByTestId('option-correct');

    expect(queryByTestId('positive-animation')).toBeNull();

    fireEvent.press(correctOption);

    await waitFor(() => {
      expect(getByTestId('positive-animation')).toBeTruthy();
    });
  });

  it('should transition to the fun fact screen on tapping the correct option', async () => {
    const { getByTestId } = render(<QuizScreen />);
    const correctOption = getByTestId('option-correct');

    fireEvent.press(correctOption);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('FunFact');
    });
  });
});