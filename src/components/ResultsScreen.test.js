import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ResultsScreen from './ResultsScreen';

let mockNavigation;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

describe('TRIOFSND-39: Implementar reinicio de partida al pulsar "Volver a jugar"', () => {
  beforeEach(() => {
    mockNavigation = { reset: jest.fn() };
  });

  it('renders the score and the "Volver a jugar" button', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 7 } }} />);
    expect(getByText('¡Resultados!')).toBeTruthy();
    expect(getByText('Puntuación: 7/10')).toBeTruthy();
    expect(getByText('Volver a jugar')).toBeTruthy();
  });

  it('resets the navigation to GameScreen when "Volver a jugar" is pressed', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 5 } }} />);
    
    fireEvent.press(getByText('Volver a jugar'));
    
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'GameScreen' }],
    });
  });
});
