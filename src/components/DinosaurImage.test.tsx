import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('TRIOFSND-21: Implement Image Fallback', () => {
  it('renders the dinosaur image under normal circumstances', () => {
    render(<DinosaurImage src="/assets/dino.png" alt="Dinosaur" />);
    const image = screen.getByAltText('Dinosaur');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/assets/dino.png');
  });

  it('shows a placeholder if the dinosaur image fails to load', () => {
    render(<DinosaurImage src="/assets/broken-dino.png" alt="Dinosaur" />);
    const image = screen.getByAltText('Dinosaur');
    
    // Simulate image load failure
    fireEvent.error(image);

    // Placeholder should be visible
    const placeholder = screen.getByTestId('dino-placeholder');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeVisible();
    
    // Original broken image should not be rendered anymore
    expect(screen.queryByAltText('Dinosaur')).not.toBeInTheDocument();
  });

  it('allows the game to continue without blocking when the image fails', () => {
    const mockOnErrorCallback = jest.fn();
    render(<DinosaurImage src="/assets/broken-dino.png" alt="Dinosaur" onError={mockOnErrorCallback} />);
    
    const image = screen.getByAltText('Dinosaur');
    fireEvent.error(image);

    // Ensure the error was handled gracefully
    expect(mockOnErrorCallback).toHaveBeenCalled();
    
    // Ensure the placeholder is rendered so the game UI is not broken
    expect(screen.getByTestId('dino-placeholder')).toBeInTheDocument();
  });
});