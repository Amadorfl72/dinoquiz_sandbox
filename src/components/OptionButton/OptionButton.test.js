import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { OptionButton } from './OptionButton';

describe('TRIOFSND-20: OptionButton Double Tap Debounce', () => {
  let onPressMock;
  const defaultProps = {
    label: 'Option A',
    onPress: jest.fn(),
    debounceTime: 300,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    onPressMock = jest.fn();
    defaultProps.onPress = onPressMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should register the first response when tapped once', () => {
    const { getByTestId } = render(
      <OptionButton {...defaultProps} testID="option-button" />
    );

    fireEvent.press(getByTestId('option-button'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should not register multiple answers if tapped twice quickly', () => {
    const { getByTestId } = render(
      <OptionButton {...defaultProps} testID="option-button" />
    );

    fireEvent.press(getByTestId('option-button'));
    fireEvent.press(getByTestId('option-button'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should register a new answer if tapped after the debounce time', () => {
    const { getByTestId } = render(
      <OptionButton {...defaultProps} testID="option-button" />
    );

    fireEvent.press(getByTestId('option-button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(defaultProps.debounceTime + 1);
    });

    fireEvent.press(getByTestId('option-button'));
    expect(onPressMock).toHaveBeenCalledTimes(2);
  });

  it('should only register the first response if tapped multiple times quickly', () => {
    const { getByTestId } = render(
      <OptionButton {...defaultProps} testID="option-button" />
    );

    fireEvent.press(getByTestId('option-button'));
    fireEvent.press(getByTestId('option-button'));
    fireEvent.press(getByTestId('option-button'));
    fireEvent.press(getByTestId('option-button'));
    fireEvent.press(getByTestId('option-button'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should register responses for different options independently', () => {
    const onPressA = jest.fn();
    const onPressB = jest.fn();

    const { getByTestId } = render(
      <>
        <OptionButton label="Option A" onPress={onPressA} debounceTime={300} testID="option-a" />
        <OptionButton label="Option B" onPress={onPressB} debounceTime={300} testID="option-b" />
      </>
    );

    fireEvent.press(getByTestId('option-a'));
    fireEvent.press(getByTestId('option-b'));

    expect(onPressA).toHaveBeenCalledTimes(1);
    expect(onPressB).toHaveBeenCalledTimes(1);

    // Tapping option A again quickly should be debounced independently
    fireEvent.press(getByTestId('option-a'));
    expect(onPressA).toHaveBeenCalledTimes(1);
    expect(onPressB).toHaveBeenCalledTimes(1);

    // Tapping option B again quickly should be debounced independently
    fireEvent.press(getByTestId('option-b'));
    expect(onPressA).toHaveBeenCalledTimes(1);
    expect(onPressB).toHaveBeenCalledTimes(1);
  });
});
