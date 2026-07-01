import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('TRIOFSND-27: Implement image fallback placeholder', () => {
  const defaultProps = {
    src: 'dinosaur.png',
    alt: 'Dinosaur image',
  };

  it('renders the dinosaur image when src is provided', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByRole('img', { name: /dinosaur image/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'dinosaur.png');
  });

  it('displays a placeholder when the image fails to load', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByRole('img', { name: /dinosaur image/i });
    
    fireEvent.error(image);
    
    const placeholder = screen.getByText(/placeholder/i);
    expect(placeholder).toBeInTheDocument();
    expect(image).not.toBeVisible();
  });

  it('ensures the placeholder text remains legible', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByRole('img', { name: /dinosaur image/i });
    
    fireEvent.error(image);
    
    const placeholder = screen.getByText(/placeholder/i);
    expect(placeholder).toHaveClass('legible-text');
  });

  it('does not display placeholder when image loads successfully', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByRole('img', { name: /dinosaur image/i });
    
    fireEvent.load(image);
    
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
  });
});