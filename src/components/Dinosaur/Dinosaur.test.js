import React from 'react';
import { render } from '@testing-library/react';
import Dinosaur from './Dinosaur';

describe('Dinosaur Component', () => {
  it('renders dinosaur image by default', () => {
    const { getByAltText } = render(
      <Dinosaur 
        imageUrl="https://example.com/dino.png" 
        altText="T-Rex" 
      />
    );
    
    const image = getByAltText('T-Rex');
    expect(image).toBeInTheDocument();
    expect(image.src).toBe('https://example.com/dino.png');
  });

  it('displays placeholder when image fails to load', () => {
    const { getByAltText } = render(
      <Dinosaur 
        imageUrl="invalid-url" 
        altText="T-Rex" 
      />
    );
    
    const image = getByAltText('T-Rex');
    expect(image.src).toContain('dinosaur-placeholder.png');
    expect(image).toHaveClass('placeholder');
  });

  it('ensures text remains legible when placeholder is displayed', () => {
    const { container } = render(
      <Dinosaur 
        imageUrl="invalid-url" 
        altText="T-Rex" 
      />
    );
    
    const containerElement = container.querySelector('.dinosaur-container');
    expect(window.getComputedStyle(containerElement).color).toBe('rgb(0, 0, 0)');
    expect(window.getComputedStyle(containerElement).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
});