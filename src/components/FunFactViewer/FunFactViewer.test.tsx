import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FunFactViewer } from './FunFactViewer';

describe('TRIOFSND-29: Add debounce to Next button', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Next button', () => {
    render(<FunFactViewer />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('advances to the next fun fact when clicked once', () => {
    render(<FunFactViewer />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    const initialFact = screen.getByTestId('fun-fact-text').textContent;
    
    fireEvent.click(nextButton);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    const newFact = screen.getByTestId('fun-fact-text').textContent;
    expect(newFact).not.toBe(initialFact);
  });

  it('disables the Next button immediately after click to prevent accidental skipping', () => {
    render(<FunFactViewer />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(nextButton);
    
    expect(nextButton).toBeDisabled();
  });

  it('prevents rapid successive clicks from advancing multiple times', () => {
    render(<FunFactViewer />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    const initialFact = screen.getByTestId('fun-fact-text').textContent;
    
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    expect(nextButton).toBeDisabled();
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(nextButton).toBeEnabled();
    const currentFact = screen.getByTestId('fun-fact-text').textContent;
    expect(currentFact).not.toBe(initialFact);
  });

  it('re-enables the Next button after the debounce period', () => {
    render(<FunFactViewer />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(nextButton);
    expect(nextButton).toBeDisabled();
    
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(nextButton).toBeDisabled();
    
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(nextButton).toBeEnabled();
  });

  it('displays a loading state on the Next button during debounce', () => {
    render(<FunFactViewer />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    fireEvent.click(nextButton);
    
    expect(screen.getByTestId('next-button-loading')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.queryByTestId('next-button-loading')).not.toBeInTheDocument();
  });
});