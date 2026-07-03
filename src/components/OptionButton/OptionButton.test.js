import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import OptionButton from './OptionButton';

describe('OptionButton', () => {
  it('should register the first response when tapped once', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<OptionButton option="Option A" onSelect={onSelect} />);
    fireEvent.click(getByText('Option A'));
    expect(onSelect).toHaveBeenCalledWith('Option A');
  });

  it('should not register multiple answers if tapped twice quickly', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<OptionButton option="Option A" onSelect={onSelect} />);
    fireEvent.click(getByText('Option A'));
    fireEvent.click(getByText('Option A'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should register a new answer if tapped after the debounce time', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(<OptionButton option="Option A" onSelect={onSelect} />);
    fireEvent.click(getByText('Option A'));
    await new Promise((r) => setTimeout(r, 500)); // Wait for debounce time
    fireEvent.click(getByText('Option A'));
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('should only register the first response if tapped multiple times quickly', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<OptionButton option="Option A" onSelect={onSelect} />);
    fireEvent.click(getByText('Option A'));
    fireEvent.click(getByText('Option A'));
    fireEvent.click(getByText('Option A'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should register responses for different options independently', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <>
        <OptionButton option="Option A" onSelect={onSelect} />
        <OptionButton option="Option B" onSelect={onSelect} />
      </>
    );
    fireEvent.click(getByText('Option A'));
    fireEvent.click(getByText('Option B'));
    expect(onSelect).toHaveBeenCalledWith('Option A');
    expect(onSelect).toHaveBeenCalledWith('Option B');
  });
});