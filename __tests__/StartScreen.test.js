import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StartScreen from '../src/components/StartScreen';

describe('StartScreen', () => {
  it('displays the DinoQuiz title', () => {
    const { getByText } = render(<StartScreen onStartGame={jest.fn()} />);
    expect(getByText('DinoQuiz')).toBeTruthy();
  });

  it('displays the dinosaur illustration with correct accessibility label', () => {
    const { getByLabelText } = render(<StartScreen onStartGame={jest.fn()} />);
    expect(getByLabelText('Dinosaurio')).toBeTruthy();
  });

  it('displays the dinosaur illustration with correct testID', () => {
    const { getByTestId } = render(<StartScreen onStartGame={jest.fn()} />);
    expect(getByTestId('DinosaurIllustration')).toBeTruthy();
  });

  it('displays the play button with ¡Jugar! text', () => {
    const { getByText } = render(<StartScreen onStartGame={jest.fn()} />);
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('displays the play button with correct testID', () => {
    const { getByTestId } = render(<StartScreen onStartGame={jest.fn()} />);
    expect(getByTestId('PlayButton')).toBeTruthy();
  });

  it('play button has minHeight of at least 64', () => {
    const { getByTestId } = render(<StartScreen onStartGame={jest.fn()} />);
    const playButton = getByTestId('PlayButton');
    const style = Array.isArray(playButton.props.style)
      ? Object.assign({}, ...playButton.props.style.filter(Boolean))
      : playButton.props.style;
    expect(style.minHeight).toBeGreaterThanOrEqual(64);
  });

  it('triggers onStartGame callback when play button is pressed', () => {
    const mockOnStartGame = jest.fn();
    const { getByText } = render(<StartScreen onStartGame={mockOnStartGame} />);
    fireEvent.press(getByText('¡Jugar!'));
    expect(mockOnStartGame).toHaveBeenCalledTimes(1);
  });

  it('renders within 3 seconds', () => {
    const startTime = Date.now();
    render(<StartScreen onStartGame={jest.fn()} />);
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(3000);
  });

  it('renders all key elements within 3 seconds', () => {
    const startTime = Date.now();
    const { getByText, getByTestId } = render(<StartScreen onStartGame={jest.fn()} />);
    getByText('DinoQuiz');
    getByTestId('DinosaurIllustration');
    getByText('¡Jugar!');
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(3000);
  });

  it('has a container with testID StartScreen', () => {
    const { getByTestId } = render(<StartScreen onStartGame={jest.fn()} />);
    expect(getByTestId('StartScreen')).toBeTruthy();
  });
});
