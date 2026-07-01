import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestionScreen } from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockStatement = 'What is the largest dinosaur?';
  const mockOptions = ['Tyrannosaurus', 'Brachiosaurus', 'Velociraptor'];

  it('should render the question statement', () => {
    const { getByText } = render(
      <QuestionScreen statement={mockStatement} options={mockOptions} />
    );
    
    expect(getByText(mockStatement)).toBeTruthy();
  });

  it('should render the dinosaur illustration', () => {
    const { getByTestId } = render(
      <QuestionScreen statement={mockStatement} options={mockOptions} />
    );
    
    expect(getByTestId('dinosaur-illustration')).toBeTruthy();
  });

  it('should render exactly 3 answer option buttons', () => {
    const { getAllByTestId } = render(
      <QuestionScreen statement={mockStatement} options={mockOptions} />
    );
    
    const buttons = getAllByTestId('answer-option-button');
    expect(buttons).toHaveLength(3);
  });

  it('should render the correct text for each answer option button', () => {
    const { getByText } = render(
      <QuestionScreen statement={mockStatement} options={mockOptions} />
    );
    
    mockOptions.forEach(option => {
      expect(getByText(option)).toBeTruthy();
    });
  });
});