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

  it('renders the dinosaur image with accessibility', () => {
    const { getByTestId } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onSelect={mockOnSelect}
      />
    );
    const image = getByTestId('dinosaur-image');
    expect(image).toBeTruthy();
    expect(image.props.accessibilityRole).toBe('image');
  });

  it('renders exactly 3 answer options', () => {
    const { getAllByTestId } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onSelect={mockOnSelect}
      />
    );
    const buttons = getAllByTestId(/answer-option-button/);
    expect(buttons).toHaveLength(3);
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

  it('has accessible option buttons with proper roles and labels', () => {
    const { getAllByRole, getAllByLabelText } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onSelect={mockOnSelect}
      />
    );
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(3);
    
    mockOptions.forEach((option, index) => {
      expect(getAllByLabelText(`Answer option ${index + 1}: ${option}`)).toBeTruthy();
    });
  });

  it('has minimum touchable dimensions for accessibility', () => {
    const { getAllByTestId } = render(
      <QuestionScreen
        question={mockQuestion}
        options={mockOptions}
        dinosaurImage={mockDinosaurImage}
        onSelect={mockOnSelect}
      />
    );
    const buttons = getAllByTestId(/answer-option-button/);
    buttons.forEach(button => {
      expect(button.props.style.minHeight).toBe(48);
      expect(button.props.style.minWidth).toBe('80%');
    });
  });
});