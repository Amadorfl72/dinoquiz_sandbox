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

    // First click triggers immediate onSelect via the else branch
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Subsequent rapid clicks on the same option go through debounced handleSelect
    fireEvent.click(button);
    fireEvent.click(button);

    // No additional calls before the debounce timer fires
    expect(onSelect).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runAllTimers();
    });

    // After debounce resolves, one additional call occurs (isSelected is still false in this static render)
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

    // Second click: same option id, goes through debounced handleSelect
    // but isSelected is now true, so the debounced call should be skipped
    fireEvent.click(button);

    act(() => {
      jest.runAllTimers();
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
