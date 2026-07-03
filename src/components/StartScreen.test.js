import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StartScreen from './StartScreen';

// Mock the dinosaur image asset
jest.mock('../assets/dinosaur.png', () => 'dinosaur.png');

describe('StartScreen', () => {
  const mockOnStartGame = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the DinoQuiz title', () => {
    const { getByText } = render(<StartScreen onStartGame={mockOnStartGame} />);
    expect(getByText('DinoQuiz')).toBeTruthy();
  });

  it('displays the dinosaur illustration with correct accessibility label', () => {
    const { getByTestId } = render(<StartScreen onStartGame={mockOnStartGame} />);
    const image = getByTestId('dinosaur-illustration');
    expect(image).toBeTruthy();
    expect(image.props.accessibilityLabel).toBe('Dinosaurio mascota');
  });

  it('displays the dinosaur illustration with correct testID', () => {
    const { getByTestId } = render(<StartScreen onStartGame={mockOnStartGame} />);
    expect(getByTestId('dinosaur-illustration')).toBeTruthy();
  });

  it('displays the play button with ¡Jugar! text', () => {
    const { getByText } = render(<StartScreen onStartGame={mockOnStartGame} />);
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('displays the play button with correct testID', () => {
    const { getByTestId } = render(<StartScreen onStartGame={mockOnStartGame} />);
    expect(getByTestId('play-button')).toBeTruthy();
  });

  it('play button has minHeight of at least 64', () => {
    const { getByTestId } = render(<StartScreen onStartGame={mockOnStartGame} />);
    const button = getByTestId('play-button');
    const style = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style || {};
    expect(style.minHeight).toBeGreaterThanOrEqual(64);
  });

  it('triggers onStartGame callback when play button is pressed', () => {
    const { getByTestId } = render(<StartScreen onStartGame={mockOnStartGame} />);
    fireEvent.press(getByTestId('play-button'));
    expect(mockOnStartGame).toHaveBeenCalledTimes(1);
  });

  it('renders within 3 seconds', () => {
    const start = Date.now();
    render(<StartScreen onStartGame={mockOnStartGame} />);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  it('renders all key elements within 3 seconds', () => {
    const start = Date.now();
    const { getByText, getByTestId } = render(<StartScreen onStartGame={mockOnStartGame} />);
    
    expect(getByText('DinoQuiz')).toBeTruthy();
    expect(getByTestId('dinosaur-illustration')).toBeTruthy();
    expect(getByText('¡Jugar!')).toBeTruthy();
    expect(getByTestId('play-button')).toBeTruthy();
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  it('has a container with testID StartScreen', () => {
    const { getByTestId } = render(<StartScreen onStartGame={mockOnStartGame} />);
    expect(getByTestId('StartScreen')).toBeTruthy();
  });
});