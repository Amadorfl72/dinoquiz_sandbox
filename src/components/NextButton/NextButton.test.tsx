import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextButton from './NextButton';

describe('NextButton - TRIOFSND-29: Add debounce to Next button', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Next button', () => {
    render(<NextButton onClick={jest.fn()} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('calls onClick once on a single click', () => {
    const mockOnClick = jest.fn();
    render(<NextButton onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('prevents accidental skipping by disabling or debouncing rapid clicks', () => {
    const mockOnClick = jest.fn();
    render(<NextButton onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /next/i });

    // Simulate rapid accidental clicks (e.g., a child tapping multiple times)
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // The handler should only be invoked once, preventing skipping the fun fact
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    
    // The button should enter a disabled or loading state immediately
    expect(button).toBeDisabled();
  });

  it('re-enables the button after the debounce/loading period', async () => {
    const mockOnClick = jest.fn();
    render(<NextButton onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /next/i });

    fireEvent.click(button);
    expect(button).toBeDisabled();

    // Advance timers past the debounce/loading period (assuming ~500ms)
    jest.advanceTimersByTime(500);

    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });
});