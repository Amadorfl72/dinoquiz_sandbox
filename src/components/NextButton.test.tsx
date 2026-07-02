import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextButton from './NextButton';

jest.useFakeTimers();

describe('NextButton - TRIOFSND-29', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders the Next button', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('disables the button immediately after click to prevent accidental skipping', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    
    expect(button).toBeDisabled();
  });

  it('shows a loading state immediately after click', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('re-enables the button after the debounce period', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    expect(button).toBeDisabled();
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(button).toBeEnabled();
  });

  it('does not call onNext multiple times if clicked rapidly', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onNext={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(mockOnNext).toHaveBeenCalledTimes(1);
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });
});
