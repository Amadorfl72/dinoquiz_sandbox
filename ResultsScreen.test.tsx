import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ResultsScreen } from '../ResultsScreen';

describe('ResultsScreen', () => {
  const mockOnPlayAgain = jest.fn();

  const getExpectedMessage = (score: number) => {
    if (score <= 3) return '¡No te rindas, sigue practicando!';
    if (score <= 6) return '¡Buen trabajo, vas mejorando!';
    if (score <= 8) return '¡Muy bien hecho!';
    return '¡Excelente, eres un crack!';
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the score correctly', () => {
    const { getByText } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    expect(getByText('Has acertado 5/10')).toBeTruthy();
  });

  it('renders the correct motivating message for score range 0-3', () => {
    const { getByText } = render(<ResultsScreen score={2} onPlayAgain={mockOnPlayAgain} />);
    expect(getByText(getExpectedMessage(2))).toBeTruthy();
  });

  it('renders the correct motivating message for score range 4-6', () => {
    const { getByText } = render(<ResultsScreen score={6} onPlayAgain={mockOnPlayAgain} />);
    expect(getByText(getExpectedMessage(6))).toBeTruthy();
  });

  it('renders the correct motivating message for score range 7-8', () => {
    const { getByText } = render(<ResultsScreen score={8} onPlayAgain={mockOnPlayAgain} />);
    expect(getByText(getExpectedMessage(8))).toBeTruthy();
  });

  it('renders the correct motivating message for score range 9-10', () => {
    const { getByText } = render(<ResultsScreen score={10} onPlayAgain={mockOnPlayAgain} />);
    expect(getByText(getExpectedMessage(10))).toBeTruthy();
  });

  it('renders the "Volver a jugar" button', () => {
    const { getByText } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    expect(getByText('Volver a jugar')).toBeTruthy();
  });

  it('renders the button with a height >= 48', () => {
    const { getByTestId } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = getByTestId('play-again-button');
    const style = Array.isArray(button.props.style) ? Object.assign({}, ...button.props.style) : button.props.style;
    expect(style.height).toBeGreaterThanOrEqual(48);
  });

  it('calls onPlayAgain when the button is pressed', () => {
    const { getByTestId } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = getByTestId('play-again-button');
    fireEvent.press(button);
    expect(mockOnPlayAgain).toHaveBeenCalledTimes(1);
  });
});