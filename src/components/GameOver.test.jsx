import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameOver } from './GameOver';
import { checkAndUpdateBestScore } from '../utils/scoreUtils';

jest.mock('../utils/scoreUtils', () => ({
  checkAndUpdateBestScore: jest.fn()
}));

describe('TRIOFSND-40: GameOver component message display', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows new best score message when checkAndUpdateBestScore returns true', () => {
    checkAndUpdateBestScore.mockReturnValue(true);
    render(<GameOver score={150} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('hides new best score message when checkAndUpdateBestScore returns false', () => {
    checkAndUpdateBestScore.mockReturnValue(false);
    render(<GameOver score={50} />);
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });
});