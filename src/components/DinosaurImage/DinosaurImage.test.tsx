import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('TRIOFSND-21: Implement Image Fallback', () => {
  it('renders the dinosaur image when the source is valid', () => {
    render(<DinosaurImage src="dino.png" alt="Dinosaur" />);
    const image = screen.getByTestId('dino-image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'dino.png');
    expect(screen.queryByTestId('dino-placeholder')).not.toBeInTheDocument();
  });

  it('renders a placeholder when the image fails to load', () => {
    render(<DinosaurImage src="invalid-dino.png" alt="Dinosaur" />);
    const image = screen.getByTestId('dino-image');
    
    // Simulate image load failure
    fireEvent.error(image);
    
    const placeholder = screen.getByTestId('dino-placeholder');
    expect(placeholder).toBeInTheDocument();
    expect(screen.queryByTestId('dino-image')).not.toBeInTheDocument();
  });

  it('allows the game to continue by calling onFallback without blocking', () => {
    const onFallback = jest.fn();
    render(<DinosaurImage src="invalid-dino.png" alt="Dinosaur" onFallback={onFallback} />);
    
    const image = screen.getByTestId('dino-image');
    fireEvent.error(image);
    
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('dino-placeholder')).toBeInTheDocument();
  });
});