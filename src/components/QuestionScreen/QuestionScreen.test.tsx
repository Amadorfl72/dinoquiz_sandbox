import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuestionScreen } from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockProps = {
    statement: 'Which dinosaur is known for its three horns?',
    illustrationAlt: 'Triceratops illustration',
    options: ['Triceratops', 'Stegosaurus', 'Velociraptor'],
    onSelectAnswer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the question statement', () => {
    render(<QuestionScreen {...mockProps} />);
    expect(screen.getByText(mockProps.statement)).toBeInTheDocument();
  });

  it('renders the dinosaur illustration', () => {
    render(<QuestionScreen {...mockProps} />);
    const illustration = screen.getByAltText(mockProps.illustrationAlt);
    expect(illustration).toBeInTheDocument();
  });

  it('renders exactly 3 answer option buttons', () => {
    render(<QuestionScreen {...mockProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders the correct text for each answer option button', () => {
    render(<QuestionScreen {...mockProps} />);
    mockProps.options.forEach(option => {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    });
  });
});
