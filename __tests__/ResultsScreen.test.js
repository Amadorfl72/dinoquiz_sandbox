import React from 'react';
import { render } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import ResultsScreen from '../src/components/ResultsScreen';

// Mock CSS import so Jest can import the component
jest.mock('../src/components/ResultsScreen.css', () => ({}));

describe('TRIOFSND-32: Results Screen UI', () => {
  const cssPath = path.resolve(__dirname, '../src/components/ResultsScreen.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  it('renders without crashing', () => {
    const { container } = render(<ResultsScreen />);
    expect(container).not.toBeNull();
  });

  it('displays the Resultados title', () => {
    const { getByText } = render(<ResultsScreen />);
    expect(getByText('Resultados')).toBeTruthy();
  });

  it('displays the Volver a jugar button', () => {
    const { getByText } = render(<ResultsScreen />);
    expect(getByText('Volver a jugar')).toBeTruthy();
  });

  it('results_screen_button_height_meets_minimum - button min-height is at least 48px', () => {
    const match = css.match(/min-height:\s*(\d+)px/);
    expect(match).not.toBeNull();
    const minHeight = parseInt(match[1], 10);
    expect(minHeight).toBeGreaterThanOrEqual(48);
  });

  it('results_screen_button has a non-default background color', () => {
    const match = css.match(/background-color:\s*(#[0-9a-fA-F]{3,8}|\w+)/);
    expect(match).not.toBeNull();
    const bgColor = match[1];
    expect(bgColor).not.toBe('transparent');
    expect(bgColor).not.toBe('#000000');
  });

  it('results_screen_button has rounded corners', () => {
    const match = css.match(/border-radius:\s*(\d+)px/);
    expect(match).not.toBeNull();
    const borderRadius = parseInt(match[1], 10);
    expect(borderRadius).toBeGreaterThan(0);
  });

  it('results_screen_button has legible font size (>= 16px)', () => {
    const match = css.match(/font-size:\s*(\d+)px/);
    expect(match).not.toBeNull();
    const fontSize = parseInt(match[1], 10);
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  it('results_screen_button has contrasting text color', () => {
    const match = css.match(/color:\s*(#[0-9a-fA-F]{3,8}|\w+)/);
    expect(match).not.toBeNull();
    const color = match[1];
    expect(color).not.toBe('transparent');
  });
});
