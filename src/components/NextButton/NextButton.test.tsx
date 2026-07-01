import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextButton } from './NextButton';

jest.useFakeTimers();

describe('NextButton - TRIOFSND-29: Debounce on Next button', () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders the Next button with accessible label', () => {
    render(<NextButton onNext={mockOnNext} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('calls onNext exactly once on a single click', () => {
    render(<NextButton onNext={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('enters a loading/disabled state immediately after click to prevent accidental skipping', () => {
    render(<NextButton onNext={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    fireEvent.click(button);
    expect(button).toBeDisabled();
  });

  it('prevents multiple onNext calls from rapid sequential clicks within debounce window', () => {
    render(<NextButton onNext={mockOnNext} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('prevents multiple onNext calls from rapid double-click events', () => {
    render(<NextButton onNext={mockOnNext} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.doubleClick(button);

    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('re-enables the button after the debounce period elapses', () => {
    render(<NextButton onNext={mockOnNext} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(button).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(button).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(button).not.toBeDisabled();
  });

  it('allows a second click after the debounce period has fully elapsed', () => {
    render(<NextButton onNext={mockOnNext} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(2);
  });

  it('shows a loading indicator while debouncing so the child sees feedback', () => {
    render(<NextButton onNext={mockOnNext} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(screen.getByTestId('next-button-loading')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId('next-button-loading')).not.toBeInTheDocument();
  });

  it('does not call onNext when clicked while disabled during debounce', () => {
    render(<NextButton onNext={mockOnNext} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(250);
    });

    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('respects custom debounce duration prop', () => {
    render(<NextButton onNext={mockOnNext} debounceMs={1000} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(button).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(button).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(button).not.toBeDisabled();
  });

  it('does not break when onNext throws an error during debounced click', () => {
    const throwingHandler = jest.fn(() => {
      throw new Error('boom');
    });
    render(<NextButton onNext={throwingHandler} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    expect(() => fireEvent.click(button)).toThrow('boom');
    expect(throwingHandler).toHaveBeenCalledTimes(1);
  });

  it('does not call onNext when component is unmounted during debounce', () => {
    const { unmount } = render(<NextButton onNext={mockOnNext} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    unmount();
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('respects debounceMs prop when clicked multiple times in quick succession', () => {
    render(<NextButton onNext={mockOnNext} debounceMs={300} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    // Click again immediately
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);

    // Advance time but not enough to finish debounce
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(button).toBeDisabled();
    expect(mockOnNext).toHaveBeenCalledTimes(1);

    // Advance remaining time
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(button).not.toBeDisabled();

    // Now we can click again
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(2);
  });
});