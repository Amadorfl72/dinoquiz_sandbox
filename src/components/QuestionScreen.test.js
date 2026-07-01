import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuestionScreen from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockQuestion = 'What dinosaur is known for having three horns?';
  const mockOptions = ['T-Rex', 'Triceratops', 'Velociraptor'];
  const mockDinosaurImage = require('../../assets/images/triceratops.png');
  const mockOnSelect = jest.fn();

  it('renders the question text', () => {
    const { getByText } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onSelect={mockOnSelect}
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
        onSelect={mockOnSelect}
      />
    );
    expect(getByTestId('dinosaur-image')).toBeTruthy();
  });

  it('renders all answer options', () => {
    const { getByText } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onSelect={mockOnSelect}
      />
    );
    mockOptions.forEach(option => {
      expect(getByText(option)).toBeTruthy();
    });
  });

  it('calls onSelect when an option is pressed', () => {
    const { getByText } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onSelect={mockOnSelect}
      />
    );
    fireEvent.press(getByText(mockOptions[0]));
    expect(mockOnSelect).toHaveBeenCalledWith(mockOptions[0]);
  });
});