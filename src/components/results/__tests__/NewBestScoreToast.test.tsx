import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NewBestScoreToast } from '../NewBestScoreToast';

jest.useFakeTimers();

describe('NewBestScoreToast (TRIOFSND-45)', () => {
  const EXPECTED_TEXT = '¡Nueva mejor puntuación!';

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('visibility', () => {
    it('renders the feedback text when visible is true', () => {
      render(<NewBestScoreToast visible={true} onDismiss={jest.fn()} />);
      expect(screen.getByText(EXPECTED_TEXT)).toBeVisible();
    });

    it('does not render the feedback text when visible is false', () => {
      render(<NewBestScoreToast visible={false} onDismiss={jest.fn()} />);
      expect(screen.queryByText(EXPECTED_TEXT)).not.toBeInTheDocument();
    });

    it('uses role=status so it is announced as a polite, non-blocking status', () => {
      render(<NewBestScoreToast visible={true} onDismiss={jest.fn()} />);
      const toast = screen.getByRole('status');
      expect(toast).toHaveTextContent(EXPECTED_TEXT);
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('auto-dismiss', () => {
    it('calls onDismiss after a few seconds (default 3s)', () => {
      const onDismiss = jest.fn();
      render(<NewBestScoreToast visible={true} onDismiss={onDismiss} />);

      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(2999);
      });
      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('respects a custom duration prop', () => {
      const onDismiss = jest.fn();
      render(<NewBestScoreToast visible={true} onDismiss={onDismiss} duration={5000} />);

      act(() => {
        jest.advanceTimersByTime(4999);
      });
      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not call onDismiss if visible becomes false before the timer fires', () => {
      const onDismiss = jest.fn();
      const { rerender } = render(<NewBestScoreToast visible={true} onDismiss={onDismiss} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      rerender(<NewBestScoreToast visible={false} onDismiss={onDismiss} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('non-blocking behavior', () => {
    it('does not trap focus and allows other elements to be interacted with', () => {
      render(
        <div>
          <NewBestScoreToast visible={true} onDismiss={jest.fn()} />
          <button>Continuar</button>
        </div>
      );

      const continueButton = screen.getByRole('button', { name: /continuar/i });
      expect(continueButton).not.toBeDisabled();
      userEvent.click(continueButton);
      // No assertion needed beyond no throw; but verify it remains enabled
      expect(continueButton).toBeEnabled();
    });

    it('is not rendered as a modal dialog (role should not be dialog/alertdialog)', () => {
      render(<NewBestScoreToast visible={true} onDismiss={jest.fn()} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('animation / transition', () => {
    it('applies an enter transition class when becoming visible', () => {
      const { container } = render(<NewBestScoreToast visible={true} onDismiss={jest.fn()} />);
      const toast = container.firstChild as HTMLElement;
      expect(toast.className).toMatch(/enter|in|show|visible|active/i);
    });
  });
});
