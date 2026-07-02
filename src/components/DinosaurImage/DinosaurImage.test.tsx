import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DinosaurImage from './DinosaurImage';

describe('DinosaurImage', () => {
  const validSrc = 'https://example.com/dinosaur.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normal rendering', () => {
    it('renders the image with the provided src', () => {
      render(<DinosaurImage src={validSrc} alt="T-Rex" />);
      const image = screen.getByRole('img', { name: /t-rex/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', validSrc);
    });

    it('renders the image with the provided alt text', () => {
      render(<DinosaurImage src={validSrc} alt="Stegosaurus" />);
      expect(screen.getByRole('img', { name: /stegosaurus/i })).toBeInTheDocument();
    });

    it('does not show the placeholder when the image loads successfully', () => {
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();
      expect(screen.getByTestId('dinosaur-image')).toBeInTheDocument();
    });
  });

  describe('onError fallback behavior', () => {
    it('displays the placeholder image when the original image fails to load', () => {
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      const image = screen.getByRole('img', { name: /dinosaur/i });

      fireEvent.error(image);

      const fallback = screen.getByTestId('dinosaur-placeholder');
      expect(fallback).toBeInTheDocument();
      expect(fallback.getAttribute('src')).toContain('placeholder');
    });

    it('replaces the broken image src with the placeholder src on error', () => {
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      const image = screen.getByRole('img', { name: /dinosaur/i }) as HTMLImageElement;

      fireEvent.error(image);

      expect(image.src).toContain('placeholder');
    });

    it('does not trigger an infinite loop if the placeholder also fails', () => {
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      const image = screen.getByRole('img', { name: /dinosaur/i }) as HTMLImageElement;

      fireEvent.error(image);
      fireEvent.error(image);
      fireEvent.error(image);

      expect(image.src).toContain('placeholder');
    });

    it('keeps the placeholder visible after the first error', () => {
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      const image = screen.getByRole('img', { name: /dinosaur/i });

      fireEvent.error(image);

      const updatedImage = screen.getByTestId('dinosaur-placeholder');
      expect(updatedImage).toBeInTheDocument();
    });
  });

  describe('text legibility on placeholder', () => {
    it('renders overlay text with a caption-overlay class when placeholder is shown', () => {
      render(
        <DinosaurImage src={validSrc} alt="Dinosaur" caption="Meet the T-Rex" />
      );
      const image = screen.getByRole('img', { name: /dinosaur/i });
      fireEvent.error(image);

      const caption = screen.getByText(/meet the t-rex/i);
      expect(caption).toBeInTheDocument();

      const captionContainer = screen.getByTestId('caption-overlay');
      expect(captionContainer).toBeInTheDocument();
      expect(captionContainer).toHaveClass('caption-overlay');
    });

    it('applies a caption-overlay class behind text for legibility', () => {
      render(
        <DinosaurImage src={validSrc} alt="Dinosaur" caption="Dino Facts" />
      );
      const image = screen.getByRole('img', { name: /dinosaur/i });
      fireEvent.error(image);

      const overlay = screen.getByTestId('caption-overlay');
      expect(overlay).toHaveClass('caption-overlay');
    });

    it('ensures caption text is visible when placeholder is displayed', () => {
      render(
        <DinosaurImage src={validSrc} alt="Dinosaur" caption="Hello Dino" />
      );
      const image = screen.getByRole('img', { name: /dinosaur/i });
      fireEvent.error(image);

      const caption = screen.getByText(/hello dino/i);
      expect(caption).toBeVisible();
    });

    it('does not render a caption overlay when no caption is provided', () => {
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      expect(screen.queryByTestId('caption-overlay')).not.toBeInTheDocument();
    });
  });
});
