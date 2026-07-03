import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StartScreen from './StartScreen';

// Fix TRIOFSND-5: mock the dinosaur image asset so tests do not fail with
// "Cannot find module '../assets/dinosaur.png'."
jest.mock('../assets/dinosaur.png', () => 'dinosaur.png');

describe('StartScreen', () => {
  const defaultProps = {
    onStartGame: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the DinoQuiz title', () => {
    const { getByText } = render(<StartScreen {...defaultProps} />);
    expect(getByText('DinoQuiz')).toBeTruthy();
  });

  it('displays the dinosaur illustration with correct accessibility label', () => {
    const { getByLabelText } = render(<StartScreen {...defaultProps} />);
    const image = getByLabelText('Dinosaur illustration');
    expect(image).toBeTruthy();
  });

  it('displays the dinosaur illustration with correct testID', () => {
    const { getByTestId } = render(<StartScreen {...defaultProps} />);
    const image = getByTestId('dinosaur-image');
    expect(image).toBeTruthy();
  });

  it('displays the play button with ¡Jugar! text', () => {
    const { getByText } = render(<StartScreen {...defaultProps} />);
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('displays the play button with correct testID', () => {
    const { getByTestId } = render(<StartScreen {...defaultProps} />);
    expect(getByTestId('play-button')).toBeTruthy();
  });

  it('play button has minHeight of at least 64', () => {
    const { getByTestId } = render(<StartScreen {...defaultProps} />);
    const button = getByTestId('play-button');
    const style = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style || {};
    expect(style.minHeight).toBeGreaterThanOrEqual(64);
  });

  it('triggers onStartGame callback when play button is pressed', () => {
    const { getByTestId } = render(<StartScreen {...defaultProps} />);
    fireEvent.press(getByTestId('play-button'));
    expect(defaultProps.onStartGame).toHaveBeenCalledTimes(1);
  });

  it('renders within 3 seconds', () => {
    const start = Date.now();
    render(<StartScreen {...defaultProps} />);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  it('renders all key elements within 3 seconds', () => {
    const start = Date.now();
    const { getByText, getByTestId } = render(<StartScreen {...defaultProps} />);
    expect(getByText('DinoQuiz')).toBeTruthy();
    expect(getByTestId('dinosaur-image')).toBeTruthy();
    expect(getByTestId('play-button')).toBeTruthy();
    expect(getByText('¡Jugar!')).toBeTruthy();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  it('has a container with testID StartScreen', () => {
    const { getByTestId } = render(<StartScreen {...defaultProps} />);
    expect(getByTestId('StartScreen')).toBeTruthy();
  });
});
