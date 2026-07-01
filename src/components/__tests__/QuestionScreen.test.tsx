import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuestionScreen from '../QuestionScreen';

describe('QuestionScreen', () => {
  const mockProps = {
    statement: 'What does a Triceratops eat?',
    options: ['Plants', 'Meat', 'Both'],
    illustration: 'triceratops.png'
  };

  beforeEach(() => {
    render(<QuestionScreen {...mockProps} />);
  });

  it('displays the question statement', () => {
    expect(screen.getByText(mockProps.statement)).toBeInTheDocument();
  });

  it('displays the dinosaur illustration', () => {
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', mockProps.illustration);
    expect(image).toHaveAttribute('alt', 'Dinosaur illustration');
  });

  it('renders exactly 3 answer option buttons', () => {
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('displays the correct text for each option button', () => {
    mockProps.options.forEach(option => {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    });
  });
});
