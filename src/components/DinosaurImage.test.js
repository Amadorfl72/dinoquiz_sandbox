import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DinosaurImage from './DinosaurImage';

describe('TRIOFSND-21: Implement Image Fallback', () => {
  const validSrc = 'dino.png';
  const placeholderSrc = 'placeholder.png';

  it('renders the dinosaur image with the provided src by default', () => {
    render(<DinosaurImage src={validSrc} placeholder={placeholderSrc} />);
    const image = screen.getByRole('img', { name: /dinosaur/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', validSrc);
  });

  it('shows the placeholder image when the dinosaur image fails to load', () => {
    render(<DinosaurImage src={validSrc} placeholder={placeholderSrc} />);
    const image = screen.getByRole('img', { name: /dinosaur/i });
    
    fireEvent.error(image);
    
    expect(image).toHaveAttribute('src', placeholderSrc);
  });

  it('allows the game to continue without blocking when image fails to load', () => {
    const mockOnError = jest.fn();
    render(<DinosaurImage src={validSrc} placeholder={placeholderSrc} onError={mockOnError} />);
    const image = screen.getByRole('img', { name: /dinosaur/i });
    
    expect(() => fireEvent.error(image)).not.toThrow();
    expect(mockOnError).toHaveBeenCalledTimes(1);
    expect(image).toHaveAttribute('src', placeholderSrc);
  });
});
