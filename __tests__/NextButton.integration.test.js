import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FunFactScreen from '../components/FunFactScreen';

jest.useFakeTimers();

describe('FunFactScreen - TRIOFSND-29: Integration', () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('disables the Next button until the fun fact reveal animation completes', () => {
    render(<FunFactScreen onNext={mockOnNext} revealDuration={1000} />);
    const button = screen.getByRole('button', { name: /next/i });

    expect(button).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(button).not.toBeDisabled();
  });

  it('prevents skipping before the fun fact is visible and then debounces after enabling', () => {
    render(<FunFactScreen onNext={mockOnNext} revealDuration={1000} debounceMs={500} />);
    const button = screen.getByRole('button', { name: /next/i });

    // Attempt to click before reveal completes
    fireEvent.click(button);
    expect(mockOnNext).not.toHaveBeenCalled();

    // Reveal completes
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(button).not.toBeDisabled();

    // Click and verify debounce kicks in
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    // Rapid second click should be ignored
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);

    // After debounce, button re-enables
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(button).not.toBeDisabled();
  });

  it('shows the fun fact content before the Next button becomes enabled', () => {
    render(<FunFactScreen onNext={mockOnNext} revealDuration={1000} />);
    const button = screen.getByRole('button', { name: /next/i });

    expect(button).toBeDisabled();
    expect(screen.getByTestId('fun-fact-content')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(button).not.toBeDisabled();
  });
});
