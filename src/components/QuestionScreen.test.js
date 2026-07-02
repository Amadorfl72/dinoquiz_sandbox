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

  it('renders exactly three large touchable buttons', () => {
    const { getAllByRole } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onOptionSelect={mockOnOptionSelect}
      />
    );
    const buttons = getAllByRole('button');
    expect(buttons.length).toBe(3);
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

  it('does not render any timer or countdown elements', () => {
    const { queryByText } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onOptionSelect={mockOnOptionSelect}
      />
    );
    expect(queryByText(/timer/i)).toBeNull();
    expect(queryByText(/countdown/i)).toBeNull();
  });
});