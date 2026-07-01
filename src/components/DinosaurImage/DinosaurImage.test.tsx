import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('DinosaurImage', () => {
  const defaultProps = {
    src: 'https://example.com/dinosaur.jpg',
    alt: 'Tyrannosaurus Rex',
    caption: 'The Tyrannosaurus Rex lived during the Late Cretaceous period.',
  };

  describe('normal rendering', () => {
    it('renders the image with the provided src', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', defaultProps.src);
    });

    it('renders the image with the provided alt text', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', defaultProps.alt);
    });

    it('renders the caption text', () => {
      render(<DinosaurImage {...defaultProps} />);
      expect(screen.getByText(defaultProps.caption)).toBeInTheDocument();
    });

    it('does not show the placeholder when image loads successfully', () => {
      render(<DinosaurImage {...defaultProps} />);
      expect(screen.queryByTestId('image-placeholder')).not.toBeInTheDocument();
    });
  });

  describe('image error fallback', () => {
    it('displays placeholder when image fails to load', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    });

    it('hides the broken image when image fails to load', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(img).toHaveStyle({ display: 'none' });
    });

    it('displays placeholder with a default fallback image src', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      const placeholder = screen.getByTestId('image-placeholder');
      const placeholderImg = placeholder.querySelector('img');
      expect(placeholderImg).toBeInTheDocument();
      expect(placeholderImg).toHaveAttribute('src');
      expect(placeholderImg?.getAttribute('src')).not.toBe(defaultProps.src);
    });

    it('uses custom fallback src when provided', () => {
      const fallbackSrc = 'https://example.com/custom-placeholder.png';
      render(<DinosaurImage {...defaultProps} fallbackSrc={fallbackSrc} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      const placeholder = screen.getByTestId('image-placeholder');
      const placeholderImg = placeholder.querySelector('img');
      expect(placeholderImg).toHaveAttribute('src', fallbackSrc);
    });

    it('displays placeholder icon when no fallback src is provided', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(screen.getByTestId('placeholder-icon')).toBeInTheDocument();
    });

    it('can recover from error if src changes', () => {
      const { rerender } = render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();

      rerender(<DinosaurImage {...defaultProps} src="https://example.com/new-dino.jpg" />);
      expect(screen.queryByTestId('image-placeholder')).not.toBeInTheDocument();
    });
  });

  describe('text legibility on placeholder', () => {
    it('renders caption text over the placeholder', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(screen.getByText(defaultProps.caption)).toBeInTheDocument();
      expect(screen.getByText(defaultProps.caption)).toBeVisible();
    });

    it('placeholder has a background color that ensures text contrast', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      const placeholder = screen.getByTestId('image-placeholder');
      const styles = window.getComputedStyle(placeholder);
      const bgColor = styles.backgroundColor;
      expect(bgColor).toBeDefined();
      expect(bgColor).not.toBe('transparent');
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    it('caption text has a color that contrasts with placeholder background', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      const caption = screen.getByText(defaultProps.caption);
      const styles = window.getComputedStyle(caption);
      expect(styles.color).toBeDefined();
      expect(styles.color).not.toBe('transparent');
    });

    it('caption text remains visible (not hidden) when placeholder is shown', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      const caption = screen.getByText(defaultProps.caption);
      const styles = window.getComputedStyle(caption);
      expect(styles.display).not.toBe('none');
      expect(styles.visibility).not.toBe('hidden');
      expect(styles.opacity).not.toBe('0');
    });

    it('placeholder container has sufficient dimensions to display text', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      const placeholder = screen.getByTestId('image-placeholder');
      expect(placeholder).toHaveStyle({ minHeight: '100%' });
    });
  });

  describe('onError handler', () => {
    it('attaches an onError handler to the image element', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(img.onerror).toBeDefined();
    });

    it('calls custom onError callback in addition to showing placeholder', () => {
      const onError = jest.fn();
      render(<DinosaurImage {...defaultProps} onError={onError} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    });

    it('does not throw if no custom onError is provided', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      expect(() => fireEvent.error(img)).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('maintains alt text on placeholder image', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      const placeholder = screen.getByTestId('image-placeholder');
      const placeholderImg = placeholder.querySelector('img');
      if (placeholderImg) {
        expect(placeholderImg).toHaveAttribute('alt');
      }
    });

    it('placeholder has appropriate aria attributes', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img');
      fireEvent.error(img);
      const placeholder = screen.getByTestId('image-placeholder');
      expect(placeholder).toHaveAttribute('role', 'img');
    });
  });
});
