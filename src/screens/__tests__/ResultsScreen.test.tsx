import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsScreen } from '../ResultsScreen';
import * as gameCompletedLogger from '../../logging';

describe('ResultsScreen', () => {
  const logGameCompletedSpy = vi.spyOn(gameCompletedLogger, 'logGameCompleted');

  beforeEach(() => {
    logGameCompletedSpy.mockReset();
    logGameCompletedSpy.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the results screen with the final score', () => {
    render(<ResultsScreen score={320} durationMs={60000} appVersion="1.0.0" />);
    expect(screen.getByText(/320/)).toBeInTheDocument();
  });

  it('emits the game_completed event exactly once on mount', async () => {
    render(<ResultsScreen score={320} durationMs={60000} appVersion="1.0.0" />);

    await waitFor(() => {
      expect(logGameCompletedSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('passes the correct score to the logger', async () => {
    render(<ResultsScreen score={320} durationMs={60000} appVersion="1.0.0" />);

    await waitFor(() => {
      expect(logGameCompletedSpy).toHaveBeenCalledWith(320, 60000, '1.0.0');
    });
  });

  it('does not emit the event again on re-render', async () => {
    const { rerender } = render(
      <ResultsScreen score={320} durationMs={60000} appVersion="1.0.0" />
    );

    rerender(<ResultsScreen score={320} durationMs={60000} appVersion="1.0.0" />);
    rerender(<ResultsScreen score={320} durationMs={60000} appVersion="1.0.0" />);

    await waitFor(() => {
      expect(logGameCompletedSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('does not block rendering if logging fails', async () => {
    logGameCompletedSpy.mockRejectedValueOnce(new Error('fail'));
    render(<ResultsScreen score={320} durationMs={60000} appVersion="1.0.0" />);

    expect(screen.getByText(/320/)).toBeInTheDocument();
  });

  it('emits the event when navigating to the results screen via the play again flow', async () => {
    const { getByTestId } = render(
      <ResultsScreen score={320} durationMs={60000} appVersion="1.0.0" />
    );

    await userEvent.click(getByTestId('play-again-button'));

    // After replaying and returning to results, the event should fire again
    await waitFor(() => {
      expect(logGameCompletedSpy).toHaveBeenCalled();
    });
  });
});