import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinoImage } from './DinoImage';

describe('TRIOFSND-21: Implement Image Fallback', () => {
  const placeholderText = 'Dinosaur image unavailable';

  it('renders the dinosaur image when the source loads successfully', () => {
    render(<DinoImage src="/dino.png" alt="dinosaur" />);
    const img = screen.getByAltText('dinosaur');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/dino.png');
  });

  it('shows a placeholder when the image fails to load', () => {
    render(<DinoImage src="/broken.png" alt="dinosaur" />);
    const img = screen.getByAltText('dinosaur');
    fireEvent.error(img);
    expect(screen.getByText(placeholderText)).toBeInTheDocument();
  });

  it('hides the broken image element after an error occurs', () => {
    render(<DinoImage src="/broken.png" alt="dinosaur" />);
    const img = screen.getByAltText('dinosaur');
    fireEvent.error(img);
    expect(img).not.toBeVisible();
  });

  it('does not block the game when the placeholder is displayed', () => {
    render(<DinoImage src="/broken.png" alt="dinosaur" />);
    fireEvent.error(screen.getByAltText('dinosaur'));
    const placeholder = screen.getByText(placeholderText);
    expect(placeholder).not.toHaveAttribute('aria-busy', 'true');
    expect(placeholder).not.toHaveClass('blocking');
  });

  it('recovers when a valid src is provided after an error', () => {
    const { rerender } = render(<DinoImage src="/broken.png" alt="dinosaur" />);
    fireEvent.error(screen.getByAltText('dinosaur'));
    expect(screen.getByText(placeholderText)).toBeInTheDocument();

    rerender(<DinoImage src="/dino.png" alt="dinosaur" />);
    expect(screen.queryByText(placeholderText)).not.toBeInTheDocument();
    expect(screen.getByAltText('dinosaur')).toBeInTheDocument();
  });
});
