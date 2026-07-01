import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextButton from './NextButton';

describe('NextButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call onClick after debounce', () => {
    const onClick = jest.fn();
    const { getByText } = render(<NextButton onClick={onClick} />);
    const button = getByText('Next');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onClick).toHaveBeenCalled();
  });

  it('should disable button during debounce', () => {
    const onClick = jest.fn();
    const { getByText } = render(<NextButton onClick={onClick} />);
    const button = getByText('Next');
    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(button.disabled).toBe(false);
  });

  it('should show loading state during debounce', () => {
    const onClick = jest.fn();
    const { getByTestId } = render(<NextButton onClick={onClick} />);
    const button = getByTestId('next-button');
    fireEvent.click(button);
    expect(getByTestId('next-button-loading')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(() => getByTestId('next-button-loading')).toThrow();
  });
});