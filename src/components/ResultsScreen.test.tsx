import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ResultsScreen from './ResultsScreen';

describe('ResultsScreen', () => {
  const mockOnPlayAgain = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the score correctly', () => {
    const { getByText } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    expect(getByText('Has acertado 5/10')).toBeTruthy();
  });

  it('displays a motivating message for score range 0-3', () => {
    const { getByTestId } = render(<ResultsScreen score={2} onPlayAgain={mockOnPlayAgain} />);
    const message = getByTestId('motivating-message');
    expect(message.props.children).toBeTruthy();
  });

  it('displays a different motivating message for score range 4-6', () => {
    const { getByTestId: getByTestIdLow } = render(<ResultsScreen score={2} onPlayAgain={mockOnPlayAgain} />);
    const messageLow = getByTestIdLow('motivating-message').props.children;

    const { getByTestId } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const messageMid = getByTestId('motivating-message').props.children;

    expect(messageMid).toBeTruthy();
    expect(messageMid).not.toEqual(messageLow);
  });

  it('displays a different motivating message for score range 7-8', () => {
    const { getByTestId: getByTestIdMid } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const messageMid = getByTestIdMid('motivating-message').props.children;

    const { getByTestId } = render(<ResultsScreen score={8} onPlayAgain={mockOnPlayAgain} />);
    const messageHigh = getByTestId('motivating-message').props.children;

    expect(messageHigh).toBeTruthy();
    expect(messageHigh).not.toEqual(messageMid);
  });

  it('displays a different motivating message for score range 9-10', () => {
    const { getByTestId: getByTestIdHigh } = render(<ResultsScreen score={8} onPlayAgain={mockOnPlayAgain} />);
    const messageHigh = getByTestIdHigh('motivating-message').props.children;

    const { getByTestId } = render(<ResultsScreen score={10} onPlayAgain={mockOnPlayAgain} />);
    const messageMax = getByTestId('motivating-message').props.children;

    expect(messageMax).toBeTruthy();
    expect(messageMax).not.toEqual(messageHigh);
  });

  it('renders the Volver a jugar button with height >= 48', () => {
    const { getByTestId } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = getByTestId('play-again-button');
    
    const style = button.props.style;
    let height = 0;
    if (Array.isArray(style)) {
      height = style.reduce((acc: number, s: any) => (s && s.minHeight ? s.minHeight : acc), 0);
    } else if (style && style.minHeight) {
      height = style.minHeight;
    }
    
    expect(height).toBeGreaterThanOrEqual(48);
  });

  it('calls onPlayAgain when the Volver a jugar button is pressed', () => {
    const { getByTestId } = render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
    const button = getByTestId('play-again-button');
    fireEvent.press(button);
    expect(mockOnPlayAgain).toHaveBeenCalledTimes(1);
  });
});