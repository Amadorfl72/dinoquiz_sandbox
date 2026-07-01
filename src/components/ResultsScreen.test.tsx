import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsScreen } from './ResultsScreen';
import * as scoreStorage from '../services/scoreStorage';

describe('ResultsScreen (TRIOFSND-46)', () => {
  const getBestScoreSpy = jest.spyOn(scoreStorage, 'getBestScore');
  const saveBestScoreSpy = jest.spyOn(scoreStorage, 'saveBestScore');

  beforeEach(() => {
    getBestScoreSpy.mockReset();
    saveBestScoreSpy.mockReset();
    saveBestScoreSpy.mockResolvedValue(undefined);
  });

  it('renders the current score', async () => {
    getBestScoreSpy.mockResolvedValue(120);
    render(<ResultsScreen currentScore={85} />);
    expect(screen.getByTestId('current-score')).toHaveTextContent('85');
  });

  it('fetches the persisted best score on game completion', async () => {
    getBestScoreSpy.mockResolvedValue(120);
    render(<ResultsScreen currentScore={85} />);
    await waitFor(() => expect(getBestScoreSpy).toHaveBeenCalledTimes(1));
  });

  it('renders the persisted best score alongside the current score', async () => {
    getBestScoreSpy.mockResolvedValue(120);
    render(<ResultsScreen currentScore={85} />);
    await waitFor(() => {
      expect(screen.getByTestId('best-score')).toHaveTextContent('120');
    });
    expect(screen.getByTestId('current-score')).toHaveTextContent('85');
  });

  it('renders a placeholder when no best score has been persisted yet', async () => {
    getBestScoreSpy.mockResolvedValue(null);
    render(<ResultsScreen currentScore={50} />);
    await waitFor(() => {
      expect(screen.getByTestId('best-score')).toHaveTextContent('—');
    });
  });

  it('persists and renders the new best score when the current score beats the record', async () => {
    getBestScoreSpy.mockResolvedValue(40);
    render(<ResultsScreen currentScore={75} />);
    await waitFor(() => expect(saveBestScoreSpy).toHaveBeenCalledWith(75));
    await waitFor(() => {
      expect(screen.getByTestId('best-score')).toHaveTextContent('75');
    });
  });

  it('does not overwrite the best score when the current score does not beat the record', async () => {
    getBestScoreSpy.mockResolvedValue(100);
    render(<ResultsScreen currentScore={30} />);
    await waitFor(() => expect(getBestScoreSpy).toHaveBeenCalled());
    expect(saveBestScoreSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('best-score')).toHaveTextContent('100');
    });
  });

  it('renders gracefully when fetching the best score fails', async () => {
    getBestScoreSpy.mockRejectedValue(new Error('storage unavailable'));
    render(<ResultsScreen currentScore={60} />);
    await waitFor(() => {
      expect(screen.getByTestId('best-score')).toHaveTextContent('—');
    });
    expect(screen.getByTestId('current-score')).toHaveTextContent('60');
    expect(screen.queryByTestId('best-score-error')).toBeNull();
  });

  it('shows an accessible label describing the best score', async () => {
    getBestScoreSpy.mockResolvedValue(120);
    render(<ResultsScreen currentScore={85} />);
    await waitFor(() => {
      expect(screen.getByTestId('best-score')).toHaveAccessibleName(/best score/i);
    });
  });

  it('re-fetches the best score when the game completion event is triggered again', async () => {
    getBestScoreSpy.mockResolvedValue(120);
    const { rerender } = render(<ResultsScreen currentScore={85} gameId="game-1" />);
    await waitFor(() => expect(getBestScoreSpy).toHaveBeenCalledTimes(1));

    getBestScoreSpy.mockResolvedValue(130);
    rerender(<ResultsScreen currentScore={85} gameId="game-2" />);
    await waitFor(() => expect(getBestScoreSpy).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.getByTestId('best-score')).toHaveTextContent('130');
    });
  });
});
