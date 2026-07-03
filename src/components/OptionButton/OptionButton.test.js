import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import OptionButton from './OptionButton';

describe('TRIOFSND-20: Double Tap Debounce', () => {
  const DEBOUNCE_TIME = 300;
  let onPressMock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    onPressMock = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderButton = (props = {}) => {
    return render(
      <OptionButton
        label="Option A"
        onPress={onPressMock}
        debounceTime={DEBOUNCE_TIME}
        {...props}
      />
    );
  };

  it('should register the first response when tapped once', () => {
    const { getByText } = renderButton();

    fireEvent.press(getByText('Option A'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should not register multiple answers if tapped twice quickly', () => {
    const { getByText } = renderButton();

    fireEvent.press(getByText('Option A'));
    fireEvent.press(getByText('Option A'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should register a new answer if tapped after the debounce time', () => {
    const { getByText } = renderButton();

    fireEvent.press(getByText('Option A'));
    expect(onPressMock).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_TIME + 1);
    });

    fireEvent.press(getByText('Option A'));
    expect(onPressMock).toHaveBeenCalledTimes(2);
  });

  it('should only register the first response if tapped multiple times quickly', () => {
    const { getByText } = renderButton();

    fireEvent.press(getByText('Option A'));
    fireEvent.press(getByText('Option A'));
    fireEvent.press(getByText('Option A'));
    fireEvent.press(getByText('Option A'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should register responses for different options independently', () => {
    const onPressA = jest.fn();
    const onPressB = jest.fn();

    const { getByText } = render(
      <>
        <OptionButton
          label="Option A"
          onPress={onPressA}
          debounceTime={DEBOUNCE_TIME}
        />
        <OptionButton
          label="Option B"
          onPress={onPressB}
          debounceTime={DEBOUNCE_TIME}
        />
      </>
    );

    fireEvent.press(getByText('Option A'));
    fireEvent.press(getByText('Option B'));

    expect(onPressA).toHaveBeenCalledTimes(1);
    expect(onPressB).toHaveBeenCalledTimes(1);
  });
});
