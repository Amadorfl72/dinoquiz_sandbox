import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';

describe('HomeScreen', () => {
  it('renders the DinoQuiz title', () => {
    const { getByText } = render(<HomeScreen onStartGame={jest.fn()} />);
    expect(getByText('DinoQuiz')).toBeTruthy();
  });

  it('renders the mascot illustration with an accessibility label', () => {
    const { getByTestId, getByLabelText } = render(<HomeScreen onStartGame={jest.fn()} />);
    expect(getByTestId('dino-mascot')).toBeTruthy();
    expect(getByLabelText('Dino, la mascota de DinoQuiz')).toBeTruthy();
  });

  it('has a button with height >= 64dp', () => {
    const { getByRole } = render(<HomeScreen onStartGame={jest.fn()} />);
    const button = getByRole('button');

    const styleArray = Array.isArray(button.props.style) ? button.props.style : [button.props.style];
    const inlineStyle = styleArray.find(
      (s) => s && typeof s === 'object' && s.minHeight !== undefined
    );

    expect(inlineStyle).toBeDefined();
    expect(inlineStyle.minHeight).toBeGreaterThanOrEqual(64);
  });

  it('has ARIA labels and correct role', () => {
    const { getByTestId } = render(<HomeScreen onStartGame={jest.fn()} />);
    const button = getByTestId('start-game-button');

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('¡Jugar!');
  });

  it('calls onStartGame when the play button is pressed', () => {
    const onStartGame = jest.fn();
    const { getByTestId } = render(<HomeScreen onStartGame={onStartGame} />);
    fireEvent.press(getByTestId('start-game-button'));
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });
});
