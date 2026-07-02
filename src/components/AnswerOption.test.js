import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import AnswerOption from './AnswerOption';

jest.useFakeTimers();

describe('AnswerOption', () => {
  it('calls onSelect only once when clicked multiple times quickly', () => {
    const onSelect = jest.fn();
    const option = { text: 'Test Option', isCorrect: true };
    
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
    fireEvent.click(button);
    fireEvent.click(button);
    
    jest.runAllTimers();
    
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});