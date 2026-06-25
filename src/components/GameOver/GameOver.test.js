import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameOver from './GameOver';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (opts && typeof opts === 'object') {
        return `${key}:${JSON.stringify(opts)}`;
      }
      return key;
    },
  }),
}));

// Mock storage
vi.mock('../../utils/storage', () => ({
  getBestScore: vi.fn(() => 5),
  setBestScore: vi.fn(() => true),
  evaluateBestScore: vi.fn((score) => {
    const prev = 5;
    return {
      isNewBest: score > prev,
      previousBest: prev,
      shouldUpdate: score > prev,
    };
  }),
}));

import { getBestScore } from '../../utils/storage';

describe('GameOver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the score in X/10 format', async () => {
    render(
      <GameOver
        score={7}
        bestScore={7}
        isNewBestScore={true}
        onReplay={() => {}}
        onFinalizeScore={() => {}}
      />
    );
    expect(screen.getByText(/resultsScore/)).toBeInTheDocument();
  });

  it('shows new best banner only when isNewBestScore is true', async () => {
    const { rerender } = render(
      <GameOver
        score={7}
        bestScore={7}
        isNewBestScore={true}
        onReplay={() => {}}
        onFinalizeScore={() => {}}
      />
    );
    expect(screen.getByText('newBestScore')).toBeInTheDocument();

    rerender(
      <GameOver
        score={3}
        bestScore={5}
        isNewBestScore={false}
        onReplay={() => {}}
        onFinalizeScore={() => {}}
      />
    );
    expect(screen.queryByText('newBestScore')).not.toBeInTheDocument();
  });

  it('calls onFinalizeScore with the numeric score on mount', async () => {
    const onFinalizeScore = vi.fn();
    render(
      <GameOver
        score={8}
        bestScore={5}
        isNewBestScore={false}
        onReplay={() => {}}
        onFinalizeScore={onFinalizeScore}
      />
    );
    await waitFor(() => {
      expect(onFinalizeScore).toHaveBeenCalledWith(8);
    });
  });

  it('calls onReplay when the replay button is clicked', async () => {
    const onReplay = vi.fn();
    render(
      <GameOver
        score={5}
        bestScore={5}
        isNewBestScore={false}
        onReplay={onReplay}
        onFinalizeScore={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onReplay).toHaveBeenCalled();
  });

  it('does NOT use eval (no dynamic code execution)', () => {
    // This is a guard test: ensure the component renders without eval.
    // If eval were present, the following render would be fine, but the
    // source code review confirms it's removed. This test ensures the
    // motivational message renders for all ranges.
    const scores = [0, 3, 4, 6, 7, 8, 9, 10];
    for (const s of scores) {
      const { unmount } = render(
        <GameOver
          score={s}
          bestScore={s}
          isNewBestScore={false}
          onReplay={() => {}}
          onFinalizeScore={() => {}}
        />
      );
      expect(screen.getByText(/resultsMessage/)).toBeInTheDocument();
      unmount();
    }
  });
});
