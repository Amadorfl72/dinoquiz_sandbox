import React from 'react';
import { render, screen } from '@testing-library/react';
import ScoreFeedback from './ScoreFeedback';
import * as bestScoreStorage from '../utils/bestScoreStorage';

describe('Score Feedback UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('shows Nueva mejor puntuacion feedback when current score beats persisted one', () => {
    jest.spyOn(bestScoreStorage, 'getBestScore').mockReturnValue(100);
    render(<ScoreFeedback currentScore={150} />);
    
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('does not show feedback when current score does not beat persisted one', () => {
    jest.spyOn(bestScoreStorage, 'getBestScore').mockReturnValue(200);
    render(<ScoreFeedback currentScore={150} />);
    
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('does not block UI when localStorage fails during update', () => {
    jest.spyOn(bestScoreStorage, 'getBestScore').mockReturnValue(100);
    jest.spyOn(bestScoreStorage, 'saveBestScore').mockImplementation(() => {
      throw new Error('LocalStorage disabled');
    });
    
    expect(() => render(<ScoreFeedback currentScore={150} />)).not.toThrow();
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });
});