import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DinosaurImage from '../DinosaurImage/DinosaurImage';

describe('TRIOFSND-27: Implement image fallback placeholder', () => {
  it('renders the dinosaur image by default', () => {
    render(<DinosaurImage src="dinosaur.jpg" alt="dinosaur" />);
    const image = screen.getByAltText(/dinosaur/i);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'dinosaur.jpg');
    expect(image).toHaveAttribute('data-testid', 'dinosaur-image');
  });

  it('displays a placeholder when the image fails to load', () => {
    render(<DinosaurImage src="dinosaur.jpg" alt="dinosaur" />);
    const image = screen.getByAltText(/dinosaur/i);

    // Simulate image load error
    fireEvent.error(image);

    const placeholderImage = screen.getByAltText(/dinosaur/i);
    expect(placeholderImage.getAttribute('src')).toContain('placeholder');
    expect(placeholderImage).toHaveAttribute('data-testid', 'dinosaur-placeholder');
  });

  it('does not loop infinitely if the placeholder also fails to load', () => {
    render(<DinosaurImage src="dinosaur.jpg" alt="dinosaur" />);
    const image = screen.getByAltText(/dinosaur/i);

    fireEvent.error(image);
    fireEvent.error(image);
    fireEvent.error(image);

    expect(image.getAttribute('src')).toContain('placeholder');
  });

  it('ensures text remains legible when the placeholder is displayed', () => {
    render(<DinosaurImage src="dinosaur.jpg" alt="dinosaur" caption="dinosaur fact" />);
    const image = screen.getByAltText(/dinosaur/i);
    const textElement = screen.getByText(/dinosaur fact/i);

    // Simulate image load error
    fireEvent.error(image);

    // Check that text is still visible
    expect(textElement).toBeVisible();

    // Check that the text or its container has a class or style ensuring legibility
    const container = screen.getByTestId('caption-overlay');
    expect(container).toHaveClass('caption-overlay');
  });

  it('does not render a caption overlay when no caption is provided', () => {
    render(<DinosaurImage src="dinosaur.jpg" alt="dinosaur" />);
    expect(screen.queryByTestId('caption-overlay')).not.toBeInTheDocument();
  });
});
