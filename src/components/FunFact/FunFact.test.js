import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FunFactDisplay from './FunFactDisplay';

describe('TRIOFSND-29: Add debounce to Next button', () => {
  let onNext;
  const DEBOUNCE_TIME = 500;

  beforeEach(() => {
    jest.useFakeTimers();
    onNext = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should disable the Next button immediately after click to prevent accidental skipping', () => {
    render(<FunFactDisplay onNext={onNext} />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(nextButton);
    
    expect(nextButton).toBeDisabled();
  });

  it('should only trigger onNext once even if clicked multiple times rapidly', () => {
    render(<FunFactDisplay onNext={onNext} />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(nextButton);
    // Attempt to click again while disabled
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('should re-enable the Next button after the debounce period', () => {
    render(<FunFactDisplay onNext={onNext} />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(nextButton);
    expect(nextButton).toBeDisabled();
    
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_TIME);
    });
    
    expect(nextButton).not.toBeDisabled();
  });
});