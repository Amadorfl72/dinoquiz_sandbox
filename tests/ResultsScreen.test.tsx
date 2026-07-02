import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from '../src/components/ResultsScreen';
import { handleScoreUpdate } from '../src/services/scoreService';
import { getBestScore } from '../src/utils/safeWrapper';

jest.mock('../src/services/scoreService');
jest.mock('../src/utils/safeWrapper');

describe('TRIOFSND-44: ResultsScreen best score comparison', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display new best score message and call handleScoreUpdate when score exceeds best', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(5);
    (handleScoreUpdate as jest.Mock).mockResolvedValue(undefined);

    render(<ResultsScreen score={8} />);

    expect(screen.getByText('Your Score: 8/10')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('New Best Score! 🎉')).toBeInTheDocument();
    });
    expect(handleScoreUpdate).toHaveBeenCalledTimes(1);
    expect(handleScoreUpdate).toHaveBeenCalledWith(8);
  });

  it('should not display new best score message when score is equal to best', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(7);
    (handleScoreUpdate as jest.Mock).mockResolvedValue(undefined);

    render(<ResultsScreen score={7} />);

    expect(screen.getByText('Your Score: 7/10')).toBeInTheDocument();
    await waitFor(() => {
      expect(handleScoreUpdate).not.toHaveBeenCalled();
    });
    expect(screen.queryByText('New Best Score! 🎉')).not.toBeInTheDocument();
  });

  it('should not display new best score message when score is lower than best', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(9);
    (handleScoreUpdate as jest.Mock).mockResolvedValue(undefined);

    render(<ResultsScreen score={3} />);

    expect(screen.getByText('Your Score: 3/10')).toBeInTheDocument();
    await waitFor(() => {
      expect(handleScoreUpdate).not.toHaveBeenCalled();
    });
    expect(screen.queryByText('New Best Score! 🎉')).not.toBeInTheDocument();
  });

  it('should display new best score message when there is no previous best (0)', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(0);
    (handleScoreUpdate as jest.Mock).mockResolvedValue(undefined);

    render(<ResultsScreen score={1} />);

    await waitFor(() => {
      expect(screen.getByText('New Best Score! 🎉')).toBeInTheDocument();
    });
    expect(handleScoreUpdate).toHaveBeenCalledWith(1);
  });

  it('should not display new best score message when getBestScore rejects', async () => {
    (getBestScore as jest.Mock).mockRejectedValue(new Error('Storage error'));
    (handleScoreUpdate as jest.Mock).mockResolvedValue(undefined);

    render(<ResultsScreen score={8} />);

    expect(screen.getByText('Your Score: 8/10')).toBeInTheDocument();
    await waitFor(() => {
      expect(handleScoreUpdate).not.toHaveBeenCalled();
    });
    expect(screen.queryByText('New Best Score! 🎉')).not.toBeInTheDocument();
  });

  it('should re-run comparison when score prop changes', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(5);
    (handleScoreUpdate as jest.Mock).mockResolvedValue(undefined);

    const { rerender } = render(<ResultsScreen score={6} />);

    await waitFor(() => {
      expect(handleScoreUpdate).toHaveBeenCalledWith(6);
    });

    (getBestScore as jest.Mock).mockResolvedValue(10);
    rerender(<ResultsScreen score={12} />);

    await waitFor(() => {
      expect(handleScoreUpdate).toHaveBeenCalledWith(12);
    });
    expect(handleScoreUpdate).toHaveBeenCalledTimes(2);
  });
});
