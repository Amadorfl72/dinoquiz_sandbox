import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuestionScreen from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockQuestion = 'What dinosaur is known for having three horns?';
  const mockOptions = ['T-Rex', 'Triceratops', 'Velociraptor'];
  const mockDinosaurImage = require('../assets/triceratops.png');
  const mockOnOptionSelect = jest.fn();

  it('renders the question text', () => {
    const { getByText } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onOptionSelect={mockOnOptionSelect}
      />
    );
    expect(getByText(mockQuestion)).toBeTruthy();
  });

  it('renders the dinosaur image', () => {
    const { getByTestId } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onOptionSelect={mockOnOptionSelect}
      />
    );
    expect(getByTestId('dinosaur-image')).toBeTruthy();
  });

  it('renders all options as buttons', () => {
    const { getByText } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onOptionSelect={mockOnOptionSelect}
      />
    );
    mockOptions.forEach(option => {
      expect(getByText(option)).toBeTruthy();
    });
  });

  it('calls onOptionSelect when an option is pressed', () => {
    const { getByText } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onOptionSelect={mockOnOptionSelect}
      />
    );
    fireEvent.press(getByText(mockOptions[0]));
    expect(mockOnOptionSelect).toHaveBeenCalledWith(mockOptions[0]);
  });
});