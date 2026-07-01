import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('DinosaurImage', () => {
  const defaultProps = {
    src: '/images/dinosaur.png',
    alt: 'A friendly dinosaur',
    caption: 'Meet Rex the Dinosaur',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normal rendering', () => {
    it('renders the dinosaur image with correct src and alt attributes', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/images/dinosaur.png');
      expect(img).toHaveAttribute('alt', 'A friendly dinosaur');
    });

    it('renders the caption text alongside the image', () => {
      render(<DinosaurImage {...defaultProps} />);
      expect(screen.getByText('Meet Rex the Dinosaur')).toBeInTheDocument();
    });

    it('does not render the placeholder when the image loads successfully', () => {
      render(<DinosaurImage {...defaultProps} />);
      expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();
    });
  });

  describe('image error fallback', () => {
    it('renders a placeholder when the image fails to load', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const placeholder = screen.getByTestId('dinosaur-placeholder');
      expect(placeholder).toBeInTheDocument();
    });

    it('hides the broken image element after an error occurs', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      expect(img).toHaveStyle({ display: 'none' });
    });

    it('renders a default placeholder image when the source fails', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const placeholderImg = screen.getByTestId('placeholder-image');
      expect(placeholderImg).toBeInTheDocument();
      expect(placeholderImg).toHaveAttribute('src', expect.stringContaining('placeholder'));
    });

    it('uses a custom fallback placeholder when provided', () => {
      render(
        <DinosaurImage
          {...defaultProps}
          fallbackSrc="/images/custom-placeholder.png"
        />
      );
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const placeholderImg = screen.getByTestId('placeholder-image');
      expect(placeholderImg).toHaveAttribute('src', '/images/custom-placeholder.png');
    });

    it('preserves the alt text on the placeholder image', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const placeholderImg = screen.getByTestId('placeholder-image');
      expect(placeholderImg).toHaveAttribute('alt', 'A friendly dinosaur');
    });

    it('does not render the placeholder before an error occurs', () => {
      render(<DinosaurImage {...defaultProps} />);
      expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();
    });

    it('renders the placeholder only once even if multiple errors fire', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);
      fireEvent.error(img);

      const placeholders = screen.getAllByTestId('dinosaur-placeholder');
      expect(placeholders).toHaveLength(1);
    });
  });

  describe('text legibility after fallback', () => {
    it('keeps the caption visible after the image fails to load', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      expect(screen.getByText('Meet Rex the Dinosaur')).toBeVisible();
    });

    it('applies a background color to the placeholder for text contrast', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const placeholder = screen.getByTestId('dinosaur-placeholder');
      const computedStyle = window.getComputedStyle(placeholder);
      expect(computedStyle.backgroundColor).not.toBe('');
      expect(computedStyle.backgroundColor).not.toBe('transparent');
    });

    it('ensures caption text has a contrasting color against the placeholder background', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const caption = screen.getByText('Meet Rex the Dinosaur');
      const placeholder = screen.getByTestId('dinosaur-placeholder');

      const captionStyle = window.getComputedStyle(caption);
      const placeholderStyle = window.getComputedStyle(placeholder);

      expect(captionStyle.color).not.toBe(placeholderStyle.backgroundColor);
    });

    it('renders overlay text with sufficient opacity for legibility after fallback', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const caption = screen.getByText('Meet Rex the Dinosaur');
      const computedStyle = window.getComputedStyle(caption);
      const opacity = parseFloat(computedStyle.opacity);
      expect(opacity).toBeGreaterThanOrEqual(0.8);
    });

    it('maintains caption text size and weight after fallback', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      const captionBefore = screen.getByText('Meet Rex the Dinosaur');
      const styleBefore = window.getComputedStyle(captionBefore);

      fireEvent.error(img);

      const captionAfter = screen.getByText('Meet Rex the Dinosaur');
      const styleAfter = window.getComputedStyle(captionAfter);

      expect(styleAfter.fontSize).toBe(styleBefore.fontSize);
      expect(styleAfter.fontWeight).toBe(styleBefore.fontWeight);
    });
  });

  describe('onError handler behavior', () => {
    it('attaches an onError handler to the image element', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });
      expect(img.onerror).not.toBeNull();
    });

    it('calls a custom onError callback in addition to showing the placeholder', () => {
      const onError = jest.fn();
      render(<DinosaurImage {...defaultProps} onError={onError} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dinosaur-placeholder')).toBeInTheDocument();
    });

    it('prevents the default broken image icon from showing', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      const errorEvent = new Event('error', { bubbles: false });
      const preventDefault = jest.spyOn(errorEvent, 'preventDefault');

      fireEvent(img, errorEvent);

      // The image should be hidden so the broken icon is not visible
      expect(img).toHaveStyle({ display: 'none' });
    });
  });

  describe('accessibility', () => {
    it('maintains role=img on the placeholder for screen readers', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const placeholderImg = screen.getByTestId('placeholder-image');
      expect(placeholderImg.tagName.toLowerCase()).toBe('img');
    });

    it('keeps the container accessible after fallback', () => {
      render(<DinosaurImage {...defaultProps} />);
      const img = screen.getByRole('img', { name: /a friendly dinosaur/i });

      fireEvent.error(img);

      const placeholder = screen.getByTestId('dinosaur-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(screen.getByText('Meet Rex the Dinosaur')).toBeInTheDocument();
    });
  });
});
