import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StartScreen } from './StartScreen';

describe('StartScreen', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<StartScreen onStartGame={() => {}} />);
    expect(getByTestId('StartScreen')).toBeTruthy();
  });

  it('displays the DinoQuiz title', () => {
    const { getByText } = render(<StartScreen onStartGame={() => {}} />);
    expect(getByText('DinoQuiz')).toBeTruthy();
  });

  it('displays the dinosaur illustration with correct accessibility label', () => {
    const { getByLabelText } = render(<StartScreen onStartGame={() => {}} />);
    expect(getByLabelText('Dinosaur mascot illustration')).toBeTruthy();
  });

  it('displays the dinosaur illustration with correct testID', () => {
    const { getByTestId } = render(<StartScreen onStartGame={() => {}} />);
    expect(getByTestId('dinosaur-image')).toBeTruthy();
  });

  it('displays the play button with ¡Jugar! text', () => {
    const { getByText } = render(<StartScreen onStartGame={() => {}} />);
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('displays the play button with correct testID', () => {
    const { getByTestId } = render(<StartScreen onStartGame={() => {}} />);
    expect(getByTestId('play-button')).toBeTruthy();
  });

  it('play button has minHeight of at least 64', () => {
    const { getByTestId } = render(<StartScreen onStartGame={() => {}} />);
    const playButton = getByTestId('play-button');
    expect(playButton.props.style.minHeight).toBeGreaterThanOrEqual(64);
  });

  it('triggers onStartGame callback when play button is pressed', () => {
    const mockOnStartGame = jest.fn();
    const { getByTestId } = render(<StartScreen onStartGame={mockOnStartGame} />);
    fireEvent.press(getByTestId('play-button'));
    expect(mockOnStartGame).toHaveBeenCalled();
  });
});
