import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';

describe('HomeScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('DinoQuiz')).toBeTruthy();
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('has a play button with minimum height of 64dp', () => {
    const { getByTestId } = render(<HomeScreen />);
    const playButton = getByTestId('play-button');
    expect(playButton.props.style.minHeight).toBe(64);
  });
});