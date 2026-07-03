import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import AnswerOption from './AnswerOption';

describe('AnswerOption', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onSelect only once when clicked multiple times quickly', () => {
    const onSelect = jest.fn();
    const option = { id: '1', text: 'Test Option', isCorrect: true };

    function Wrapper() {
      const [selected, setSelected] = React.useState(false);
      return (
        <AnswerOption
          option={option}
          onSelect={(opt) => {
            onSelect(opt);
            setSelected(true);
          }}
          isSelected={selected}
          isCorrect={true}
        />
      );
    }

    const { getByText } = render(<Wrapper />);

    const button = getByText('Test Option');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    act(() => {
      jest.runAllTimers();
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with the option on first click', () => {
    const onSelect = jest.fn();
    const option = { id: '1', text: 'Test Option', isCorrect: true };

    const { getByText } = render(
      <AnswerOption
        option={option}
        onSelect={onSelect}
        isSelected={false}
        isCorrect={true}
      />
    );

    const button = getByText('Test Option');
    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(option);
  });

  it('does not call onSelect when already selected', () => {
    const onSelect = jest.fn();
    const option = { id: '1', text: 'Test Option', isCorrect: true };

    const { getByText } = render(
      <AnswerOption
        option={option}
        onSelect={onSelect}
        isSelected={true}
        isCorrect={true}
      />
    );

    const button = getByText('Test Option');
    fireEvent.click(button);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('debounces rapid clicks on the same option after first selection', () => {
    const onSelect = jest.fn();
    const option = { id: '1', text: 'Test Option', isCorrect: true };

    const { getByText } = render(
      <AnswerOption
        option={option}
        onSelect={onSelect}
        isSelected={false}
        isCorrect={true}
      />
    );

    const button = getByText('Test Option');

    // First click triggers immediate onSelect
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Second click on the same option calls onSelect immediately and starts debounce
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(2);

    // Third rapid click is ignored due to debouncing
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(2);

    act(() => {
      jest.runAllTimers();
    });

    // No additional calls after timer resolves
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('prevents debounced call when isSelected becomes true after first click', () => {
    const onSelect = jest.fn();
    const option = { id: '1', text: 'Test Option', isCorrect: true };

    function Wrapper() {
      const [selected, setSelected] = React.useState(false);
      return (
        <AnswerOption
          option={option}
          onSelect={(opt) => {
            onSelect(opt);
            setSelected(true);
          }}
          isSelected={selected}
          isCorrect={true}
        />
      );
    }

    const { getByText } = render(<Wrapper />);

    const button = getByText('Test Option');

    // First click: immediate onSelect, sets selected=true
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Second click: isSelected is now true, so it returns early
    fireEvent.click(button);

    act(() => {
      jest.runAllTimers();
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('allows another click after debounce window expires', () => {
    const onSelect = jest.fn();
    const option = { id: '1', text: 'Test Option', isCorrect: true };

    const { getByText } = render(
      <AnswerOption
        option={option}
        onSelect={onSelect}
        isSelected={false}
        isCorrect={true}
      />
    );

    const button = getByText('Test Option');

    // First click
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Second click (same option, triggers debounce)
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(2);

    // Third click during debounce window is ignored
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(2);

    // Advance timers past debounce window
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Fourth click after debounce window expires
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(3);
  });
});
