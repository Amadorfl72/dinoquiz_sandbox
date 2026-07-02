import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import OptionButton from './OptionButton';

describe('TRIOFSND-20: Implement Double Tap Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should register the first response when tapped once', () => {
    const handleSelect = jest.fn();
    render(<OptionButton optionId="A" onSelect={handleSelect} debounceTime={500} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith('A');
  });

  it('should not register multiple answers if tapped twice quickly', () => {
    const handleSelect = jest.fn();
    render(<OptionButton optionId="A" onSelect={handleSelect} debounceTime={500} />);

    const button = screen.getByRole('button');

    fireEvent.click(button);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.click(button);

    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('should register a new answer if tapped after the debounce time', () => {
    const handleSelect = jest.fn();
    render(<OptionButton optionId="A" onSelect={handleSelect} debounceTime={500} />);

    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(handleSelect).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    fireEvent.click(button);
    expect(handleSelect).toHaveBeenCalledTimes(2);
  });

  it('should only register the first response if tapped multiple times quickly', () => {
    const handleSelect = jest.fn();
    render(<OptionButton optionId="A" onSelect={handleSelect} debounceTime={500} />);

    const button = screen.getByRole('button');

    fireEvent.click(button);
    act(() => { jest.advanceTimersByTime(50); });
    fireEvent.click(button);
    act(() => { jest.advanceTimersByTime(50); });
    fireEvent.click(button);
    act(() => { jest.advanceTimersByTime(50); });
    fireEvent.click(button);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenLastCalledWith('A');
  });

  it('should register responses for different options independently', () => {
    const handleSelect = jest.fn();
    const { rerender } = render(
      <OptionButton optionId="A" onSelect={handleSelect} debounceTime={500} />
    );

    const buttonA = screen.getByRole('button');
    fireEvent.click(buttonA);
    expect(handleSelect).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender(
      <OptionButton optionId="B" onSelect={handleSelect} debounceTime={500} />
    );

    const buttonB = screen.getByRole('button');
    fireEvent.click(buttonB);
    expect(handleSelect).toHaveBeenCalledTimes(2);
    expect(handleSelect).toHaveBeenLastCalledWith('B');
  });
});
