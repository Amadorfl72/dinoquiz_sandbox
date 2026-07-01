import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ResultsScreen } from '../ResultsScreen';

jest.useFakeTimers();

describe('ResultsScreen — new best score feedback (TRIOFSND-45)', () => {
  const FEEDBACK_TEXT = '¡Nueva mejor puntuación!';

  function renderScreen(overrides: Partial<ResultsScreenProps> = {}) {
    const defaultProps: ResultsScreenProps = {
      score: 1200,
      previousBest: 1000,
      isNewBestScore: false,
      onPlayAgain: jest.fn(),
      onExit: jest.fn(),
      ...overrides,
    };
    return render(<ResultsScreen {...defaultProps} />);
  }

  describe('when a new best score is achieved', () => {
    it('displays the ¡Nueva mejor puntuación! feedback', () => {
      renderScreen({ isNewBestScore: true });
      expect(screen.getByText(FEEDBACK_TEXT)).toBeVisible();
    });

    it('shows the feedback only once (not duplicated)', () => {
      renderScreen({ isNewBestScore: true });
      expect(screen.getAllByText(FEEDBACK_TEXT)).toHaveLength(1);
    });

    it('removes the feedback after a few seconds', async () => {
      renderScreen({ isNewBestScore: true });
      expect(screen.getByText(FEEDBACK_TEXT)).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText(FEEDBACK_TEXT)).not.toBeInTheDocument();
      });
    });

    it('keeps the rest of the results screen usable while the feedback is shown', () => {
      const onPlayAgain = jest.fn();
      renderScreen({ isNewBestScore: true, onPlayAgain });

      // Feedback is present
      expect(screen.getByText(FEEDBACK_TEXT)).toBeInTheDocument();

      // User can still interact with primary actions
      const playAgain = screen.getByRole('button', { name: /jugar de nuevo|play again/i });
      userEvent.click(playAgain);
      expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a new best score is NOT achieved', () => {
    it('does not display the ¡Nueva mejor puntuación! feedback', () => {
      renderScreen({ isNewBestScore: false, score: 500, previousBest: 1000 });
      expect(screen.queryByText(FEEDBACK_TEXT)).not.toBeInTheDocument();
    });

    it('still renders the score and actions normally', () => {
      renderScreen({ isNewBestScore: false, score: 500, previousBest: 1000 });
      expect(screen.getByText(/500/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /jugar de nuevo|play again/i })).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('does not show feedback when score equals previous best (not strictly greater)', () => {
      renderScreen({ isNewBestScore: false, score: 1000, previousBest: 1000 });
      expect(screen.queryByText(FEEDBACK_TEXT)).not.toBeInTheDocument();
    });

    it('does not show feedback on the very first game if isNewBestScore flag is false', () => {
      renderScreen({ isNewBestScore: false, score: 100, previousBest: 0 });
      expect(screen.queryByText(FEEDBACK_TEXT)).not.toBeInTheDocument();
    });

    it('shows feedback on the very first game if isNewBestScore flag is true', () => {
      renderScreen({ isNewBestScore: true, score: 100, previousBest: 0 });
      expect(screen.getByText(FEEDBACK_TEXT)).toBeVisible();
    });
  });
});
