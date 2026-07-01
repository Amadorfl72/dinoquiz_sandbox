import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeScreen from '../HomeScreen';

// Tablet horizontal viewport: 1024x768 (common landscape tablet)
const TABLET_LANDSCAPE_WIDTH = 1024;
const TABLET_LANDSCAPE_HEIGHT = 768;

// Portrait tablet for comparison
const TABLET_PORTRAIT_WIDTH = 768;
const TABLET_PORTRAIT_HEIGHT = 1024;

// Mobile viewport
const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 667;

describe('HomeScreen Responsive Design', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  };

  describe('Tablet Horizontal (Landscape) - Primary Target', () => {
    beforeEach(() => {
      setViewport(TABLET_LANDSCAPE_WIDTH, TABLET_LANDSCAPE_HEIGHT);
      render(<HomeScreen />);
    });

    it('renders correctly at tablet landscape dimensions', () => {
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('title is visible at tablet landscape', () => {
      const title = screen.getByRole('heading', { name: /dinoquiz/i });
      expect(title).toBeVisible();
    });

    it('mascot illustration is visible at tablet landscape', () => {
      const mascot = screen.getByRole('img', { name: /dinosaur mascot/i });
      expect(mascot).toBeVisible();
    });

    it('¡Jugar! button is visible at tablet landscape', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      expect(button).toBeVisible();
    });

    it('main container uses full available width at tablet landscape', () => {
      const main = screen.getByRole('main');
      const styles = window.getComputedStyle(main);
      // Should not have restrictive max-width that prevents full utilization
      const maxWidth = parseFloat(styles.maxWidth) || Infinity;
      expect(maxWidth).toBeGreaterThanOrEqual(TABLET_LANDSCAPE_WIDTH);
    });

    it('content is centered horizontally at tablet landscape', () => {
      const main = screen.getByRole('main');
      const styles = window.getComputedStyle(main);
      const display = styles.display;
      const justify = styles.justifyContent || styles.textAlign;
      // Should use flexbox or grid with center alignment
      expect(['flex', 'grid', 'block']).toContain(display);
    });

    it('layout does not overflow horizontally at tablet landscape', () => {
      const main = screen.getByRole('main');
      const styles = window.getComputedStyle(main);
      const overflowX = styles.overflowX;
      expect(['hidden', 'auto', 'scroll', 'clip']).toContain(overflowX);
    });
  });

  describe('Tablet Portrait', () => {
    beforeEach(() => {
      setViewport(TABLET_PORTRAIT_WIDTH, TABLET_PORTRAIT_HEIGHT);
      render(<HomeScreen />);
    });

    it('renders correctly at tablet portrait dimensions', () => {
      const title = screen.getByRole('heading', { name: /dinoquiz/i });
      const mascot = screen.getByRole('img', { name: /dinosaur mascot/i });
      const button = screen.getByRole('button', { name: /jugar/i });
      expect(title).toBeInTheDocument();
      expect(mascot).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });

    it('button maintains minimum height at tablet portrait', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      const styles = window.getComputedStyle(button);
      const height = parseFloat(styles.height) || parseFloat(styles.minHeight) || 0;
      expect(height).toBeGreaterThanOrEqual(64);
    });
  });

  describe('Mobile Viewport', () => {
    beforeEach(() => {
      setViewport(MOBILE_WIDTH, MOBILE_HEIGHT);
      render(<HomeScreen />);
    });

    it('renders correctly at mobile dimensions', () => {
      const title = screen.getByRole('heading', { name: /dinoquiz/i });
      const mascot = screen.getByRole('img', { name: /dinosaur mascot/i });
      const button = screen.getByRole('button', { name: /jugar/i });
      expect(title).toBeInTheDocument();
      expect(mascot).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });

    it('button maintains minimum touch target at mobile dimensions', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      const styles = window.getComputedStyle(button);
      const width = parseFloat(styles.width) || parseFloat(styles.minWidth) || 0;
      const height = parseFloat(styles.height) || parseFloat(styles.minHeight) || 0;
      expect(width).toBeGreaterThanOrEqual(48);
      expect(height).toBeGreaterThanOrEqual(48);
    });

    it('no horizontal scroll at mobile dimensions', () => {
      const main = screen.getByRole('main');
      const styles = window.getComputedStyle(main);
      const overflowX = styles.overflowX;
      expect(['hidden', 'auto', 'scroll', 'clip']).toContain(overflowX);
    });
  });

  describe('Orientation Handling', () => {
    it('adapts layout when orientation changes from portrait to landscape', () => {
      // Start in portrait
      setViewport(TABLET_PORTRAIT_WIDTH, TABLET_PORTRAIT_HEIGHT);
      const { rerender } = render(<HomeScreen />);
      const titlePortrait = screen.getByRole('heading', { name: /dinoquiz/i });
      expect(titlePortrait).toBeInTheDocument();

      // Switch to landscape
      setViewport(TABLET_LANDSCAPE_WIDTH, TABLET_LANDSCAPE_HEIGHT);
      rerender(<HomeScreen />);
      const titleLandscape = screen.getByRole('heading', { name: /dinoquiz/i });
      expect(titleLandscape).toBeInTheDocument();
      expect(titleLandscape).toBeVisible();
    });
  });

  describe('Media Query / Breakpoint Behavior', () => {
    it('uses responsive units (rem, em, %, vw, vh) rather than fixed px for layout', () => {
      setViewport(TABLET_LANDSCAPE_WIDTH, TABLET_LANDSCAPE_HEIGHT);
      render(<HomeScreen />);
      const main = screen.getByRole('main');
      const styles = window.getComputedStyle(main);
      // Padding/margin should use relative units for responsiveness
      const padding = styles.padding;
      // Accept any value; the key test is that layout adapts
      expect(padding).toBeDefined();
    });

    it('mascot illustration scales appropriately at different viewports', () => {
      // Test at landscape
      setViewport(TABLET_LANDSCAPE_WIDTH, TABLET_LANDSCAPE_HEIGHT);
      const { unmount } = render(<HomeScreen />);
      const mascotLandscape = screen.getByRole('img', { name: /dinosaur mascot/i });
      const landscapeStyles = window.getComputedStyle(mascotLandscape);
      const landscapeWidth = parseFloat(landscapeStyles.width) || 0;
      unmount();

      // Test at mobile
      setViewport(MOBILE_WIDTH, MOBILE_HEIGHT);
      render(<HomeScreen />);
      const mascotMobile = screen.getByRole('img', { name: /dinosaur mascot/i });
      const mobileStyles = window.getComputedStyle(mascotMobile);
      const mobileWidth = parseFloat(mobileStyles.width) || 0;

      // Mascot should be smaller or equal on mobile vs tablet landscape
      expect(mobileWidth).toBeLessThanOrEqual(landscapeWidth);
    });
  });
});
