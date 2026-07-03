import React from 'react';
import { render, screen } from '@testing-library/react';
import Dinosaur from './Dinosaur';

describe('Dinosaur Component', () => {
  const defaultProps = {
    imageUrl: 'https://example.com/dino.png',
    altText: 'T-Rex dinosaur'
  };

  it('renders dinosaur image by default', () => {
    render(<Dinosaur {...defaultProps} />);
    const image = screen.getByAltText(defaultProps.altText);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', defaultProps.imageUrl);
  });

  it('displays placeholder when image fails to load', () => {
    render(<Dinosaur {...defaultProps} />);
    const image = screen.getByAltText(defaultProps.altText);
    
    // Simulate image error
    fireEvent.error(image);
    
    expect(image).toHaveClass('placeholder');
    expect(image).toHaveAttribute('src', expect.stringContaining('dinosaur-placeholder.png'));
  });

  it('ensures text remains legible when placeholder is displayed', () => {
    render(
      <div>
        <Dinosaur {...defaultProps} />
        <p className="dinosaur-description">This is a dinosaur description</p>
      </div>
    );
    
    const image = screen.getByAltText(defaultProps.altText);
    fireEvent.error(image);
    
    const description = screen.getByText('This is a dinosaur description');
    expect(description).toBeVisible();
    expect(description).toHaveStyle('color: #333'); // Ensure good contrast
  });
});