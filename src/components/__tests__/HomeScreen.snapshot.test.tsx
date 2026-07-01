import React from 'react';
import { render } from '@testing-library/react';
import HomeScreen from '../HomeScreen';

describe('HomeScreen Snapshot Tests', () => {
  it('matches snapshot at tablet landscape (1024x768)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
    const { container } = render(<HomeScreen />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot at tablet portrait (768x1024)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    const { container } = render(<HomeScreen />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot at mobile (375x667)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
    const { container } = render(<HomeScreen />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
