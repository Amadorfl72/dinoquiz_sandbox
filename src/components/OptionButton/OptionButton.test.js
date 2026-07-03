import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OptionButton from './OptionButton';

describe('OptionButton', () => {
  const mockOnPress = jest.fn();
  const option = 'Option A';
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should register the first response when tapped once', () => {
    const { getByText } = render(
      <OptionButton 
        option={option} 
        onPress={mockOnPress} 
        isCorrect={true} 
      />
    );
    
    fireEvent.press(getByText(option));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should not register multiple answers if tapped twice quickly', () => {
    const { getByText } = render(
      <OptionButton 
        option={option} 
        onPress={mockOnPress} 
        isCorrect={true} 
      />
    );
    
    fireEvent.press(getByText(option));
    fireEvent.press(getByText(option));
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should register a new answer if tapped after the debounce time', () => {
    const { getByText } = render(
      <OptionButton 
        option={option} 
        onPress={mockOnPress} 
        isCorrect={true} 
      />
    );
    
    fireEvent.press(getByText(option));
    jest.advanceTimersByTime(600);
    fireEvent.press(getByText(option));
    
    expect(mockOnPress).toHaveBeenCalledTimes(2);
  });

  it('should only register the first response if tapped multiple times quickly', () => {
    const { getByText } = render(
      <OptionButton 
        option={option} 
        onPress={mockOnPress} 
        isCorrect={true} 
      />
    );
    
    fireEvent.press(getByText(option));
    fireEvent.press(getByText(option));
    fireEvent.press(getByText(option));
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should register responses for different options independently', () => {
    const mockOnPressB = jest.fn();
    const optionB = 'Option B';
    
    const { getByText } = render(
      <>
        <OptionButton 
          option={option} 
          onPress={mockOnPress} 
          isCorrect={true} 
        />
        <OptionButton 
          option={optionB} 
          onPress={mockOnPressB} 
          isCorrect={false} 
        />
      </>
    );
    
    fireEvent.press(getByText(option));
    fireEvent.press(getByText(optionB));
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPressB).toHaveBeenCalledTimes(1);
  });
});