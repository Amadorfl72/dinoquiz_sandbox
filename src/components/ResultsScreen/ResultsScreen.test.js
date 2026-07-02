import React from 'react';
import { render } from '@testing-library/react-native';
import ResultsScreen from './ResultsScreen';

jest.mock('../NewBestScoreFeedback', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('ResultsScreen', () => {
  it('should show new best score feedback when score is higher than previous best', () => {
    const NewBestScoreFeedback = require('../NewBestScoreFeedback').default;
    
    render(
      <ResultsScreen route={{ params: { score: 5, previousBestScore: 4 } }} />
    );
    
    expect(NewBestScoreFeedback).toHaveBeenCalledWith(
      { isNewBestScore: true },
      {}
    );
  });

  it('should not show new best score feedback when score is not higher than previous best', () => {
    const NewBestScoreFeedback = require('../NewBestScoreFeedback').default;
    
    render(
      <ResultsScreen route={{ params: { score: 3, previousBestScore: 5 } }} />
    );
    
    expect(NewBestScoreFeedback).not.toHaveBeenCalled();
  });
});