import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';

describe('ResultsScreen Accessibility', () => {
  it('has a heading or label for the results section', () => {
    render(<ResultsScreen score={7} onReplay={jest.fn()} />);
    const heading = screen.queryByRole('heading');
    expect(heading).toBeInTheDocument();
  });

  it('button has an accessible name', () => {
    render(<ResultsScreen score={5} onReplay={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName();
    expect(button.getAttribute('aria-label') || button.textContent).toMatch(/volver a jugar/i);
  });

  it('motivating message is readable by screen readers', () => {
    render(<ResultsScreen score={5} onReplay={jest.fn()} />);
    const message = screen.getByTestId('motivating-message');
    expect(message).toBeVisible();
  });
});