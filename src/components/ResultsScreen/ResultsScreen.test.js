import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ResultsScreen from './ResultsScreen';

jest.mock('../NewBestScoreFeedback', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('ResultsScreen', () => {
  const NewBestScoreFeedback = require('../NewBestScoreFeedback').default;

  beforeEach(() => {
    NewBestScoreFeedback.mockClear();
  });

  it('should show new best score feedback when score is higher than previous best', () => {
    render(
      <ResultsScreen route={{ params: { score: 5, previousBestScore: 4 } }} />
    );

    expect(NewBestScoreFeedback).toHaveBeenCalledWith(
      { isNewBestScore: true },
      {}
    );
  });

  it('should not show new best score feedback when score is not higher than previous best', () => {
    render(
      <ResultsScreen route={{ params: { score: 3, previousBestScore: 5 } }} />
    );

    expect(NewBestScoreFeedback).not.toHaveBeenCalled();
  });

  it('should not show new best score feedback when score equals previous best', () => {
    render(
      <ResultsScreen route={{ params: { score: 5, previousBestScore: 5 } }} />
    );

    expect(NewBestScoreFeedback).not.toHaveBeenCalled();
  });

  it('should not show new best score feedback when score is zero and previous best is zero', () => {
    render(
      <ResultsScreen route={{ params: { score: 0, previousBestScore: 0 } }} />
    );

    expect(NewBestScoreFeedback).not.toHaveBeenCalled();
  });

  it('should display the score text', () => {
    render(
      <ResultsScreen route={{ params: { score: 7, previousBestScore: 5 } }} />
    );

    expect(screen.getByText('Tu puntuación: 7/10')).toBeTruthy();
  });

  it('should display the score text even when no new best score', () => {
    render(
      <ResultsScreen route={{ params: { score: 2, previousBestScore: 5 } }} />
    );

    expect(screen.getByText('Tu puntuación: 2/10')).toBeTruthy();
  });
});
