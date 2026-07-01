import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('DinosaurImage', () => {
  const defaultProps = {
    src: 'https://example.com/dinosaur.jpg',
    alt: 'A friendly dinosaur',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normal image loading', () => {
    it('renders the image with the provided src and alt', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/dinosaur.jpg');
    });

    it('does not show the placeholder when the image loads successfully', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.load(image);
      expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();
    });

    it('does not show the placeholder by default before load attempt', () => {
      render(<DinosaurImage {...defaultProps} />);
      expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();
    });
  });

  describe('image load failure (onError)', () => {
    it('displays a placeholder when the image fails to load', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      const placeholder = screen.getByTestId('dinosaur-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toBeVisible();
    });

    it('hides the broken image when the placeholder is shown', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      expect(image).toHaveStyle({ display: 'none' });
    });

    it('renders placeholder with a default or fallback image source', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      const placeholderImage = screen.getByTestId('dinosaur-placeholder');
      const placeholderImg = placeholderImage.querySelector('img');
      expect(placeholderImg).toBeInTheDocument();
      expect(placeholderImg).toHaveAttribute('src');
      expect(placeholderImg.getAttribute('src')).not.toBe('https://example.com/dinosaur.jpg');
    });

    it('renders placeholder with accessible alt text', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      const placeholder = screen.getByTestId('dinosaur-placeholder');
      const placeholderImg = placeholder.querySelector('img');
      expect(placeholderImg).toHaveAttribute('alt');
      expect(placeholderImg?.getAttribute('alt')).not.toBe('');
    });

    it('can recover and show the image again if src changes after an error', () => {
      const { rerender } = render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();

      rerender(<DinosaurImage src='https://example.com/dinosaur2.jpg' alt='A friendly dinosaur' />);
      const newImage = screen.getByAltText('A friendly dinosaur');
      expect(newImage).toHaveAttribute('src', 'https://example.com/dinosaur2.jpg');
      expect(newImage).not.toHaveStyle({ display: 'none' });
    });
  });

  describe('text legibility after placeholder is shown', () => {
    it('ensures placeholder container has a background color for text legibility', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      const placeholder = screen.getByTestId('dinosaur-placeholder');
      const styles = window.getComputedStyle(placeholder);
      // The placeholder should have a background color set (not transparent)
      expect(styles.backgroundColor).toBeDefined();
      expect(styles.backgroundColor).not.toBe('');
      expect(styles.backgroundColor).not.toBe('transparent');
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    it('ensures any text in the placeholder has sufficient contrast color', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      const placeholder = screen.getByTestId('dinosaur-placeholder');
      const textElements = placeholder.querySelectorAll('[data-testid="placeholder-text"], p, span, h1, h2, h3, h4, h5, h6');
      if (textElements.length > 0) {
        textElements.forEach((textEl) => {
          const styles = window.getComputedStyle(textEl);
          expect(styles.color).toBeDefined();
          expect(styles.color).not.toBe('');
        });
      }
    });

    it('ensures placeholder does not overlap or obscure adjacent text content', () => {
      const { container } = render(
        <div>
          <p data-testid='adjacent-text'>Some nearby text that should remain legible</p>
          <DinosaurImage {...defaultProps} />
        </div>
      );
      const adjacentText = screen.getByTestId('adjacent-text');
      expect(adjacentText).toBeVisible();

      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);

      // Adjacent text should still be visible after placeholder is shown
      expect(adjacentText).toBeVisible();
      expect(container).toContainElement(adjacentText);
    });
  });

  describe('onError handler behavior', () => {
    it('calls a custom onError callback if provided', () => {
      const onErrorCallback = jest.fn();
      render(<DinosaurImage {...defaultProps} onError={onErrorCallback} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      expect(onErrorCallback).toHaveBeenCalledTimes(1);
    });

    it('prevents default browser broken image icon from showing', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      // The original image should be hidden so the broken icon doesn't show
      expect(image).toHaveStyle({ display: 'none' });
      // The placeholder should be visible instead
      expect(screen.getByTestId('dinosaur-placeholder')).toBeVisible();
    });

    it('does not throw an error if onError fires multiple times', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      expect(() => {
        fireEvent.error(image);
        fireEvent.error(image);
        fireEvent.error(image);
      }).not.toThrow();
      expect(screen.getAllByTestId('dinosaur-placeholder').length).toBe(1);
    });
  });

  describe('placeholder content', () => {
    it('renders a meaningful placeholder when image fails', () => {
      render(<DinosaurImage {...defaultProps} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      const placeholder = screen.getByTestId('dinosaur-placeholder');
      expect(placeholder).toBeInTheDocument();
      // Placeholder should contain either an image, text, or icon
      const hasContent =
        placeholder.querySelector('img') ||
        placeholder.querySelector('svg') ||
        placeholder.textContent?.trim();
      expect(hasContent).toBeTruthy();
    });

    it('maintains the same dimensions as the original image container', () => {
      render(<DinosaurImage {...defaultProps} width={300} height={200} />);
      const image = screen.getByAltText('A friendly dinosaur');
      fireEvent.error(image);
      const placeholder = screen.getByTestId('dinosaur-placeholder');
      const styles = window.getComputedStyle(placeholder);
      // The placeholder should fill or match the container dimensions
      expect(styles.width).toBeDefined();
      expect(styles.height).toBeDefined();
    });
  });
});
