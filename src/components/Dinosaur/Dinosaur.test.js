import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dinosaur from './Dinosaur';

describe('TRIOFSND-27: Implement image fallback placeholder', () => {
  it('renders the dinosaur image by default', () => {
    render(<Dinosaur />);
    const image = screen.getByAltText(/dinosaur/i);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'dinosaur.jpg');
  });

  it('displays a placeholder when the image fails to load', () => {
    render(<Dinosaur />);
    const image = screen.getByAltText(/dinosaur/i);
    
    // Simulate image load error
    fireEvent.error(image);
    
    const placeholderImage = screen.getByAltText(/dinosaur/i);
    expect(placeholderImage).toHaveAttribute('src', 'placeholder.jpg');
  });

  it('ensures text remains legible when the placeholder is displayed', () => {
    render(<Dinosaur />);
    const image = screen.getByAltText(/dinosaur/i);
    const textElement = screen.getByText(/dinosaur fact/i);
    
    // Simulate image load error
    fireEvent.error(image);
    
    // Check that text is still visible
    expect(textElement).toBeVisible();
    
    // Check that the text or its container has a class or style ensuring legibility
    const container = textElement.closest('.image-container');
    expect(container).toHaveClass('legible-text-overlay');
  });
});
