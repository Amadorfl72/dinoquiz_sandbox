import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DinosaurImage from './DinosaurImage';

// Helper function to calculate luminance for contrast ratio
function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

describe('DinosaurImage', () => {
  const validSrc = 'https://example.com/dinosaur.jpg';
  const placeholderSrc = '/placeholder-dinosaur.png';

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
      expect(fallback).toHaveAttribute('src', placeholderSrc);
    });

    it('replaces the broken image src with the placeholder src on error', () => {
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      const image = screen.getByRole('img', { name: /dinosaur/i }) as HTMLImageElement;

      fireEvent.error(image);

      expect(image.src).toContain('placeholder-dinosaur');
    });

    it('does not trigger an infinite loop if the placeholder also fails', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      const image = screen.getByRole('img', { name: /dinosaur/i }) as HTMLImageElement;

      fireEvent.error(image);
      fireEvent.error(image);
      fireEvent.error(image);

      expect(image.src).toContain('placeholder-dinosaur');
      consoleErrorSpy.mockRestore();
    });

    it('keeps the onError handler after the first error', () => {
      render(<DinosaurImage src={validSrc} alt="Dinosaur" />);
      const image = screen.getByRole('img', { name: /dinosaur/i }) as HTMLImageElement;

      fireEvent.error(image);

      const updatedImage = screen.getByRole('img', { name: /dinosaur/i }) as HTMLImageElement;
      expect(updatedImage.onerror).not.toBeNull();
    });
  });

  describe('text legibility on placeholder', () => {
    it('renders overlay text with a legible background when placeholder is shown', () => {
      render(
        <DinosaurImage src={validSrc} alt="Dinosaur" caption="Meet the T-Rex" />
      );
      const image = screen.getByRole('img', { name: /dinosaur/i });
      fireEvent.error(image);

      const caption = screen.getByText(/meet the t-rex/i);
      expect(caption).toBeInTheDocument();

      const captionContainer = screen.getByTestId('caption-overlay');
      expect(captionContainer).toBeInTheDocument();

      const styles = window.getComputedStyle(captionContainer);
      const bgColor = styles.backgroundColor;
      const color = styles.color;

      // Ensure there is a background color set for contrast
      expect(bgColor).not.toBe('');
      expect(bgColor).not.toBe('transparent');
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');

      // Ensure text color is set
      expect(color).not.toBe('');
    });

    it('applies a semi-opaque or solid dark background behind text for legibility', () => {
      render(
        <DinosaurImage src={validSrc} alt="Dinosaur" caption="Dino Facts" />
      );
      const image = screen.getByRole('img', { name: /dinosaur/i });
      fireEvent.error(image);

      const overlay = screen.getByTestId('caption-overlay');
      const styles = window.getComputedStyle(overlay);

      // Parse rgba opacity if present
      const bgMatch = styles.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (bgMatch) {
        const alpha = bgMatch[4] !== undefined ? parseFloat(bgMatch[4]) : 1;
        expect(alpha).toBeGreaterThan(0.4);
      }
    });

    it('ensures caption text has sufficient contrast (light text on dark bg or vice versa)', () => {
      render(
        <DinosaurImage src={validSrc} alt="Dinosaur" caption="Hello Dino" />
      );
      const image = screen.getByRole('img', { name: /dinosaur/i });
      fireEvent.error(image);

      const overlay = screen.getByTestId('caption-overlay');
      const caption = screen.getByText(/hello dino/i);

      const overlayStyles = window.getComputedStyle(overlay);
      const textStyles = window.getComputedStyle(caption);

      const bgRgb = overlayStyles.backgroundColor.match(/\d+/g);
      const textRgb = textStyles.color.match(/\d+/g);

      if (bgRgb && textRgb) {
        const bgLum = luminance(parseInt(bgRgb[0]), parseInt(bgRgb[1]), parseInt(bgRgb[2]));
        const textLum = luminance(parseInt(textRgb[0]), parseInt(textRgb[1]), parseInt(textRgb[2]));
        const contrastRatio = (Math.max(bgLum, textLum) + 0.05) / (Math.min(bgLum, textLum) + 0.05);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});
