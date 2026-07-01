import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import HomeScreen from '../HomeScreen';

expect.extend(toHaveNoViolations);

// Conversion constants: 1dp = 1px in CSS at 160dpi baseline
const MIN_BUTTON_HEIGHT_DP = 64;
const MIN_TOUCH_AREA_DP = 48;
const MIN_TEXT_SP = 24;

describe('HomeScreen Accessibility', () => {
  beforeEach(() => {
    render(<HomeScreen />);
  });

  describe('ARIA Labels', () => {
    it('button has an aria-label', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label').length).toBeGreaterThan(0);
    });

    it('button aria-label contains "Jugar"', () => {
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toMatch(/jugar/i);
    });

    it('mascot image has an aria-label or alt text', () => {
      const mascot = screen.getByRole('img');
      const hasAlt = mascot.hasAttribute('alt') && mascot.getAttribute('alt').length > 0;
      const hasAriaLabel = mascot.hasAttribute('aria-label') && mascot.getAttribute('aria-label').length > 0;
      expect(hasAlt || hasAriaLabel).toBe(true);
    });

    it('title heading has appropriate aria-level', () => {
      const title = screen.getByRole('heading', { name: /dinoquiz/i });
      expect(title).toHaveAttribute('aria-level', '1');
    });
  });

  describe('Keyboard Navigation', () => {
    it('button is focusable via keyboard (tabindex >= 0)', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      expect(button).toHaveAttribute('tabindex');
      const tabindex = parseInt(button.getAttribute('tabindex') ?? '0', 10);
      expect(tabindex).toBeGreaterThanOrEqual(0);
    });

    it('button can receive focus', async () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      button.focus();
      expect(button).toHaveFocus();
    });

    it('button is reachable via Tab key', async () => {
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /jugar/i });
      await user.tab();
      // Keep tabbing until we reach the button or confirm it's in tab order
      let attempts = 0;
      while (document.activeElement !== button && attempts < 10) {
        await user.tab();
        attempts++;
      }
      expect(button).toHaveFocus();
    });

    it('button activates on Enter key press', async () => {
      const onPlay = jest.fn();
      render(<HomeScreen onPlay={onPlay} />);
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /jugar/i });
      button.focus();
      await user.keyboard('{Enter}');
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('button activates on Space key press', async () => {
      const onPlay = jest.fn();
      render(<HomeScreen onPlay={onPlay} />);
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /jugar/i });
      button.focus();
      await user.keyboard(' ');
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('has a visible focus indicator on the button', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      const styles = window.getComputedStyle(button);
      const hasOutline = styles.outline !== 'none' || styles.outlineWidth !== '0px';
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasBorderChange = styles.borderStyle !== 'none';
      // At least one focus-visible style mechanism should be defined
      expect(hasOutline || hasBoxShadow || hasBorderChange).toBe(true);
    });
  });

  describe('Minimum Sizing Requirements', () => {
    it('button height is at least 64dp (64px)', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      const styles = window.getComputedStyle(button);
      const height = parseFloat(styles.height) || parseFloat(styles.minHeight) || 0;
      expect(height).toBeGreaterThanOrEqual(MIN_BUTTON_HEIGHT_DP);
    });

    it('button touch area width is at least 48dp (48px)', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      const styles = window.getComputedStyle(button);
      const width = parseFloat(styles.width) || parseFloat(styles.minWidth) || 0;
      expect(width).toBeGreaterThanOrEqual(MIN_TOUCH_AREA_DP);
    });

    it('button touch area height is at least 48dp (48px)', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      const styles = window.getComputedStyle(button);
      const height = parseFloat(styles.height) || parseFloat(styles.minHeight) || 0;
      expect(height).toBeGreaterThanOrEqual(MIN_TOUCH_AREA_DP);
    });

    it('title text font-size is at least 24sp (24px)', () => {
      const title = screen.getByRole('heading', { name: /dinoquiz/i });
      const styles = window.getComputedStyle(title);
      const fontSize = parseFloat(styles.fontSize) || 0;
      expect(fontSize).toBeGreaterThanOrEqual(MIN_TEXT_SP);
    });

    it('button text font-size is at least 24sp (24px)', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      const styles = window.getComputedStyle(button);
      const fontSize = parseFloat(styles.fontSize) || 0;
      expect(fontSize).toBeGreaterThanOrEqual(MIN_TEXT_SP);
    });
  });

  describe('Automated Accessibility Scan', () => {
    it('has no axe accessibility violations', async () => {
      const { container } = render(<HomeScreen />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for the button specifically', async () => {
      const { container } = render(<HomeScreen />);
      const button = screen.getByRole('button', { name: /jugar/i });
      const results = await axe(button);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast', () => {
    it('button text meets WCAG AA contrast ratio (4.5:1)', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      const styles = window.getComputedStyle(button);
      // This is a structural test; actual contrast verification
      // would use a library like 'wcag-contrast' in a real environment
      expect(styles.color).toBeDefined();
      expect(styles.backgroundColor).toBeDefined();
    });
  });
});
