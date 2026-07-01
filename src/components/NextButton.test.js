import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import NextButton from './NextButton';

describe('NextButton', () => {
  it('should call onClick after debounce', () => {
    const onClick = jest.fn();
    const { getByText } = render(<NextButton onClick={onClick} />);
    const button = getByText('Next');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    setTimeout(() => {
      expect(onClick).toHaveBeenCalled();
    }, 1000);
  });

  it('should disable button during debounce', () => {
    const onClick = jest.fn();
    const { getByText } = render(<NextButton onClick={onClick} />);
    const button = getByText('Next');
    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    setTimeout(() => {
      expect(button.disabled).toBe(false);
    }, 1000);
  });
});