import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ResultsScreen from './ResultsScreen';

const mockNavigation = {
  replace: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

describe('ResultsScreen', () => {
  it('renders correctly with score 5', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 5 } }} />);
    
    expect(getByText('Resultados')).toBeTruthy();
    expect(getByText('5/10')).toBeTruthy();
    expect(getByText('⭐⭐')).toBeTruthy();
    expect(getByText('¡Bien hecho! Estás mejorando.')).toBeTruthy();
    expect(getByText('Volver a jugar')).toBeTruthy();
  });

  it('navigates to Quiz screen when play again button is pressed', () => {
    const { getByText } = render(<ResultsScreen route={{ params: { score: 8 } }} />);
    
    fireEvent.press(getByText('Volver a jugar'));
    expect(mockNavigation.replace).toHaveBeenCalledWith('Quiz');
  });

  it('has play again button with minimum height of 48dp', () => {
    const { getByTestId } = render(<ResultsScreen route={{ params: { score: 3 } }} />);
    
    const button = getByTestId('play-again-button');
    expect(button.props.style.minHeight).toBe(48);
  });
});