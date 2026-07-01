import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameOverScreen from './GameOverScreen';
import * as bestScoreService from '../services/bestScoreService';

jest.mock('../services/bestScoreService');

describe('GameOverScreen - best score message', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('shows new best score message when the score beats the previous best', () => {
    bestScoreService.getBestScore.mockReturnValue(80);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(true);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    render(<GameOverScreen score={100} />);

    expect(screen.getByText(/new best score/i)).toBeInTheDocument();
    expect(bestScoreService.saveBestScore).toHaveBeenCalledWith(100);
  });

  it('does NOT show new best score message when the score is lower than the best', () => {
    bestScoreService.getBestScore.mockReturnValue(100);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(false);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    render(<GameOverScreen score={50} />);

    expect(screen.queryByText(/new best score/i)).not.toBeInTheDocument();
    expect(bestScoreService.saveBestScore).not.toHaveBeenCalled();
  });

  it('does NOT show new best score message and does NOT update when the score is a tie', () => {
    bestScoreService.getBestScore.mockReturnValue(100);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(false);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    render(<GameOverScreen score={100} />);

    expect(screen.queryByText(/new best score/i)).not.toBeInTheDocument();
    expect(bestScoreService.saveBestScore).not.toHaveBeenCalled();
  });

  it('shows new best score message when there was no previous best', () => {
    bestScoreService.getBestScore.mockReturnValue(null);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(true);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    render(<GameOverScreen score={30} />);

    expect(screen.getByText(/new best score/i)).toBeInTheDocument();
    expect(bestScoreService.saveBestScore).toHaveBeenCalledWith(30);
  });

  it('does not show the message when saveBestScore throws an error', () => {
    bestScoreService.getBestScore.mockReturnValue(50);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(true);
    bestScoreService.saveBestScore.mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    render(<GameOverScreen score={100} />);

    expect(screen.queryByText(/new best score/i)).not.toBeInTheDocument();
    expect(screen.getByText(/unable to save/i)).toBeInTheDocument();
  });

  it('hides the new best score message on replay', async () => {
    bestScoreService.getBestScore.mockReturnValue(50);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(true);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    const { rerender } = render(<GameOverScreen score={100} />);
    expect(screen.getByText(/new best score/i)).toBeInTheDocument();

    bestScoreService.shouldUpdateBestScore.mockReturnValue(false);
    rerender(<GameOverScreen score={50} />);

    expect(screen.queryByText(/new best score/i)).not.toBeInTheDocument();
  });
});
