import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextButton } from './NextButton';

describe('NextButton - TRIOFSND-29', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Next button', () => {
    render(<NextButton onNext={jest.fn()} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('calls onNext when clicked once', () => {
    const onNext = jest.fn();
    render(<NextButton onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('prevents accidental skipping by debouncing rapid clicks', () => {
    const onNext = jest.fn();
    render(<NextButton onNext={onNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    // Simulate rapid accidental clicks
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    // Should only be called once due to debounce/loading state
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables the button or shows loading state after click to prevent skipping', () => {
    const onNext = jest.fn();
    render(<NextButton onNext={onNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    
    // Button should be disabled to prevent further clicks
    expect(button).toBeDisabled();
  });
});
