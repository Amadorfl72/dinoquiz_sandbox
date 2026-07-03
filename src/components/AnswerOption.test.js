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

  it('calls onSelect only once when clicked multiple times quickly and isSelected becomes true', () => {
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

  it('registers first click immediately and debounces subsequent rapid clicks on the same option', () => {
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

    // First click: lastSelectedOptionId is null, so onSelect is called immediately
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Second click: same option id, isDebouncing is false, so onSelect is called and debounce starts
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(2);

    // Third rapid click: isDebouncing is true, so it is ignored
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(2);

    act(() => {
      jest.runAllTimers();
    });

    // No additional calls after timer resolves
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('allows another click after the debounce window expires', () => {
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

    // Advance timers past debounce window (300ms)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Fourth click after debounce window expires
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('prevents additional calls when isSelected becomes true after first click', () => {
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

  it('allows immediate selection of different options', () => {
    const onSelect = jest.fn();
    const option1 = { id: '1', text: 'Option 1', isCorrect: true };
    const option2 = { id: '2', text: 'Option 2', isCorrect: false };

    const { getByText } = render(
      <>
        <AnswerOption
          option={option1}
          onSelect={onSelect}
          isSelected={false}
          isCorrect={true}
        />
        <AnswerOption
          option={option2}
          onSelect={onSelect}
          isSelected={false}
          isCorrect={false}
        />
      </>
    );

    const button1 = getByText('Option 1');
    const button2 = getByText('Option 2');

    // Click first option
    fireEvent.click(button1);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(option1);

    // Click second option immediately (different component instance, no debounce)
    fireEvent.click(button2);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(option2);
  });

  it('renders correct styling when selected and isCorrect is true', () => {
    const option = { id: '1', text: 'Test Option', isCorrect: true };

    const { getByText } = render(
      <AnswerOption
        option={option}
        onSelect={jest.fn()}
        isSelected={true}
        isCorrect={true}
      />
    );

    const button = getByText('Test Option');
    expect(button.className).toContain('correct');
    expect(button).toBeDisabled();
  });

  it('renders incorrect styling when selected and isCorrect is false', () => {
    const option = { id: '1', text: 'Test Option', isCorrect: false };

    const { getByText } = render(
      <AnswerOption
        option={option}
        onSelect={jest.fn()}
        isSelected={true}
        isCorrect={false}
      />
    );

    const button = getByText('Test Option');
    expect(button.className).toContain('incorrect');
    expect(button).toBeDisabled();
  });

  it('does not apply correct/incorrect styling when not selected', () => {
    const option = { id: '1', text: 'Test Option', isCorrect: true };

    const { getByText } = render(
      <AnswerOption
        option={option}
        onSelect={jest.fn()}
        isSelected={false}
        isCorrect={true}
      />
    );

    const button = getByText('Test Option');
    expect(button.className).not.toContain('correct');
    expect(button.className).not.toContain('incorrect');
    expect(button).not.toBeDisabled();
  });
});
