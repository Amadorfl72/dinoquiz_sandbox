import React from 'react';
import { render, screen } from '@testing-library/react';
import Dinosaur from './Dinosaur';

describe('Dinosaur component', () => {
  it('renders the dinosaur image by default', () => {
    render(<Dinosaur src="dinosaur.png" alt="T-Rex" className="dino-image" />);
    expect(screen.getByAltText('T-Rex')).toBeInTheDocument();
  });

  it('displays a placeholder when the image fails to load', () => {
    render(<Dinosaur src="invalid.png" alt="T-Rex" className="dino-image" />);
    const img = screen.getByAltText('T-Rex');
    img.dispatchEvent(new Event('error'));
    expect(img).toHaveAttribute('src', expect.stringContaining('dinosaur-placeholder.png'));
    expect(img).toHaveClass('dino-image placeholder');
  });

  it('ensures text remains legible when the placeholder is displayed', () => {
    render(<Dinosaur src="invalid.png" alt="T-Rex" className="dino-image" />);
    const img = screen.getByAltText('T-Rex');
    img.dispatchEvent(new Event('error'));
    expect(img).toHaveStyle('background-color: #f0f0f0');
    expect(img).toHaveStyle('color: #333');
  });
});