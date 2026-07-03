import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import NewBestScoreFeedback from './NewBestScoreFeedback';

describe('NewBestScoreFeedback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the feedback when isNewBestScore is true', () => {
    render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });

  it('does not render the feedback when isNewBestScore is false', () => {
    render(<NewBestScoreFeedback isNewBestScore={false} />);
    expect(screen.queryByText('¡Nueva mejor puntuación!')).toBeNull();
  });

  it('has a testID on the feedback container', () => {
    render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(screen.getByTestId('new-best-score-feedback')).toBeTruthy();
  });

  it('disappears after a few seconds', () => {
    render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('¡Nueva mejor puntuación!')).toBeNull();
  });

  it('remains visible before the timeout elapses', () => {
    render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2999);
    });

    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });

  it('is non-blocking and does not trap focus', () => {
    render(<NewBestScoreFeedback isNewBestScore={true} />);

    const feedback = screen.getByText('¡Nueva mejor puntuación!');
    expect(feedback.props.accessibilityRole).not.toBe('alert');
    expect(feedback.props.accessibilityRole).not.toBe('dialog');
  });

  it('does not render when isNewBestScore transitions from true to false on re-render', () => {
    const { rerender } = render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeTruthy();

    rerender(<NewBestScoreFeedback isNewBestScore={false} />);
    expect(screen.queryByText('¡Nueva mejor puntuación!')).toBeNull();
  });

  it('clears the timeout on unmount', () => {
    const { unmount } = render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeTruthy();

    unmount();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // No error thrown after advancing timers post-unmount
    expect(screen.queryByText('¡Nueva mejor puntuación!')).toBeNull();
  });
});
