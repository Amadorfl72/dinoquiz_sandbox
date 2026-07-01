import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextButton from '../components/NextButton';

jest.useFakeTimers();

describe('NextButton - TRIOFSND-29: Debounce on Next button', () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders the Next button', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('is disabled when fun fact is not yet visible', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={false} />);
    const button = screen.getByRole('button', { name: /next/i });
    expect(button).toBeDisabled();
  });

  it('is enabled when fun fact is visible', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} />);
    const button = screen.getByRole('button', { name: /next/i });
    expect(button).not.toBeDisabled();
  });

  it('enters a loading/disabled state immediately after being clicked', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);

    expect(button).toBeDisabled();
  });

  it('prevents the onNext handler from being called more than once on rapid double-click', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('shows a loading indicator while debouncing', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('re-enables the button after the debounce period completes', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(button).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(button).not.toBeDisabled();
  });

  it('removes the loading indicator after the debounce period completes', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
  });

  it('allows onNext to be called again after the debounce period has elapsed', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} debounceMs={500} />);
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

  it('does not call onNext when clicked while fun fact is not visible', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={false} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);

    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('does not call onNext when clicked while in loading state', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);

    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('respects a custom debounce duration', () => {
    render(<NextButton onNext={mockOnNext} funFactVisible={true} debounceMs={1000} />);
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

  it('cleans up the debounce timer on unmount', () => {
    const { unmount } = render(<NextButton onNext={mockOnNext} funFactVisible={true} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);

    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
