import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DinoImage from './DinoImage/DinoImage';

describe('TRIOFSND-21: Implement Image Fallback', () => {
  it('renders the dinosaur image under normal circumstances', () => {
    render(<DinoImage src="/assets/dino.png" alt="Dinosaur" />);
    const image = screen.getByAltText('Dinosaur');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/assets/dino.png');
  });

  it('shows a placeholder if the dinosaur image fails to load', () => {
    render(<DinoImage src="/assets/broken-dino.png" alt="Dinosaur" />);
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

  it('renders the placeholder with a descriptive alt text when the image fails', () => {
    render(<DinoImage src="/assets/broken-dino.png" alt="Dinosaur" />);
    const image = screen.getByAltText('Dinosaur');

    fireEvent.error(image);

    const placeholder = screen.getByTestId('dino-placeholder');
    expect(placeholder).toHaveAttribute('alt', 'Placeholder for Dinosaur');
  });

  it('allows the game to continue without blocking when the image fails', () => {
    render(<DinoImage src="/assets/broken-dino.png" alt="Dinosaur" />);

    const image = screen.getByAltText('Dinosaur');
    fireEvent.error(image);

    // Ensure the placeholder is rendered so the game UI is not broken
    expect(screen.getByTestId('dino-placeholder')).toBeInTheDocument();
    expect(screen.getByTestId('dino-placeholder')).toBeVisible();

    // Ensure no blocking error is thrown and the container still renders
    expect(screen.getByAltText('Placeholder for Dinosaur')).toBeInTheDocument();
  });

  it('does not show the placeholder before the image fails to load', () => {
    render(<DinoImage src="/assets/dino.png" alt="Dinosaur" />);
    expect(screen.queryByTestId('dino-placeholder')).not.toBeInTheDocument();
    expect(screen.getByAltText('Dinosaur')).toBeInTheDocument();
  });
});
