import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DinosaurImage } from './DinosaurImage';

describe('DinosaurImage Accessibility - Placeholder Fallback (TRIOFSND-27)', () => {
  const defaultProps = {
    src: 'https://example.com/dino.jpg',
    alt: 'A dinosaur in its natural habitat',
  };

  it('maintains alt text accessibility when placeholder is shown', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByAltText('A dinosaur in its natural habitat');
    fireEvent.error(image);

    const placeholder = screen.getByTestId('dinosaur-placeholder');
    const placeholderImg = placeholder.querySelector('img');

    if (placeholderImg) {
      expect(placeholderImg).toHaveAttribute('alt');
      expect(placeholderImg?.getAttribute('alt')).not.toBe('');
    } else {
      // If no img, there should be an aria-label or role for screen readers
      const hasAriaLabel = placeholder.getAttribute('aria-label');
      const hasRole = placeholder.getAttribute('role');
      expect(hasAriaLabel || hasRole).toBeTruthy();
    }
  });

  it('placeholder has appropriate ARIA attributes for screen readers', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByAltText('A dinosaur in its natural habitat');
    fireEvent.error(image);

    const placeholder = screen.getByTestId('dinosaur-placeholder');
    // Should have role img or contain an element with role img
    const hasImgRole =
      placeholder.getAttribute('role') === 'img' ||
      placeholder.querySelector('[role="img"]');
    expect(hasImgRole || placeholder.querySelector('img')).toBeTruthy();
  });

  it('ensures text contrast is maintained in placeholder for legibility', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByAltText('A dinosaur in its natural habitat');
    fireEvent.error(image);

    const placeholder = screen.getByTestId('dinosaur-placeholder');
    const styles = window.getComputedStyle(placeholder);

    // Background should be set for contrast
    expect(styles.backgroundColor).toBeDefined();
    expect(styles.backgroundColor).not.toBe('transparent');
    expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('does not leave empty alt attributes on placeholder image', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByAltText('A dinosaur in its natural habitat');
    fireEvent.error(image);

    const placeholder = screen.getByTestId('dinosaur-placeholder');
    const placeholderImg = placeholder.querySelector('img');

    if (placeholderImg) {
      const alt = placeholderImg.getAttribute('alt');
      expect(alt).not.toBeNull();
      expect(alt).not.toBe('');
    }
  });
});
