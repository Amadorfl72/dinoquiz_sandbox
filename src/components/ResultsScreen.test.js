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

  it('renders the results title', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 7 } }} />);
    expect(getByText('¡Resultados!')).toBeTruthy();
  });

  it('renders the score with the correct value', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 7 } }} />);
    expect(getByText('Puntuación: 7/10')).toBeTruthy();
  });

  it('renders the "Volver a jugar" button', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 7 } }} />);
    expect(getByText('Volver a jugar')).toBeTruthy();
  });

  it('renders the score and the "Volver a jugar" button', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 7 } }} />);
    expect(getByText('¡Resultados!')).toBeTruthy();
    expect(getByText('Puntuación: 7/10')).toBeTruthy();
    expect(getByText('Volver a jugar')).toBeTruthy();
  });

  it('renders correctly with a score of 0', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 0 } }} />);
    expect(getByText('Puntuación: 0/10')).toBeTruthy();
    expect(getByText('Volver a jugar')).toBeTruthy();
  });

  it('renders correctly with a perfect score of 10', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 10 } }} />);
    expect(getByText('Puntuación: 10/10')).toBeTruthy();
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

  it('calls navigation.reset exactly once when "Volver a jugar" is pressed', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 5 } }} />);
    
    fireEvent.press(getByText('Volver a jugar'));
    
    expect(mockNavigation.reset).toHaveBeenCalledTimes(1);
  });

  it('resets navigation with index 0', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 3 } }} />);
    
    fireEvent.press(getByText('Volver a jugar'));
    
    expect(mockNavigation.reset).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0 })
    );
  });

  it('resets navigation with a single route to GameScreen', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 8 } }} />);
    
    fireEvent.press(getByText('Volver a jugar'));
    
    const resetCall = mockNavigation.reset.mock.calls[0][0];
    expect(resetCall.routes).toHaveLength(1);
    expect(resetCall.routes[0].name).toBe('GameScreen');
  });

  it('does not call navigation.reset before the button is pressed', () => {
    render(<ResultsScreen route={{ params: { score: 5 } }} />);
    
    expect(mockNavigation.reset).not.toHaveBeenCalled();
  });

  it('has an accessibility label of "Volver a jugar" on the button', () => {
    const { getByLabelText } = render(<ResultsScreen route={{ params: { score: 5 } }} />);
    expect(getByLabelText('Volver a jugar')).toBeTruthy();
  });

  it('handles multiple presses by calling reset each time', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 5 } }} />);
    
    fireEvent.press(getByText('Volver a jugar'));
    fireEvent.press(getByText('Volver a jugar'));
    
    expect(mockNavigation.reset).toHaveBeenCalledTimes(2);
  });
});
