import React from 'react';
import { render } from '@testing-library/react-native';
import ResultsScreen from './ResultsScreen';

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  setRef: jest.fn(),
}));

describe('ResultsScreen', () => {
  it('should show new best score toast when score is higher than previous best', () => {
    const { rerender } = render(
      <ResultsScreen route={{ params: { score: 5, previousBestScore: 4 } }} />
    );
    
    expect(Toast.show).toHaveBeenCalledWith({
      type: 'success',
      text1: '¡Nueva mejor puntuación!',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 50,
    });
  });

  it('should not show new best score toast when score is not higher than previous best', () => {
    render(
      <ResultsScreen route={{ params: { score: 3, previousBestScore: 5 } }} />
    );
    
    expect(Toast.show).not.toHaveBeenCalled();
  });
});