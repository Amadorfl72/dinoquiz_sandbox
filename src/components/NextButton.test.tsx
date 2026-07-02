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
    render(<NextButton onClick={mockOnNext} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('disables the button immediately after click to prevent accidental skipping', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    
    expect(button).toBeDisabled();
  });

  it('shows a loading state immediately after click', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('re-enables the button after the debounce period', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    expect(button).toBeDisabled();
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(button).toBeEnabled();
  });

  it('restores the Next label after the debounce period', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(screen.getByRole('button', { name: /next/i })).toHaveTextContent('Next');
  });

  it('does not call onClick multiple times if clicked rapidly', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(mockOnNext).toHaveBeenCalledTimes(1);
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks while in loading state', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
    
    // Click during loading should be ignored
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('allows a new click after the debounce period resets', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(button).toBeEnabled();
    
    fireEvent.click(button);
    expect(mockOnNext).toHaveBeenCalledTimes(2);
  });

  it('calls onClick exactly once on a single click', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(button);
    
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('has the correct aria-label for accessibility', () => {
    const mockOnNext = jest.fn();
    render(<NextButton onClick={mockOnNext} />);
    const button = screen.getByRole('button', { name: /next question/i });
    
    expect(button).toHaveAttribute('aria-label', 'Next question');
  });
});
