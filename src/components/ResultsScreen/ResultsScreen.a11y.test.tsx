import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResultsScreen } from './ResultsScreen';

describe('ResultsScreen accessibility', () => {
  it('has an accessible heading structure', () => {
    render(<ResultsScreen score={7} onReplay={jest.fn()} />);
    const heading = screen.getByRole('heading');
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/Has acertado/i);
  });

  it('the motivating message is readable by screen readers', () => {
    render(<ResultsScreen score={7} onReplay={jest.fn()} />);
    const message = screen.getByTestId('motivating-message');
    expect(message).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('the button has an accessible name', () => {
    render(<ResultsScreen score={7} onReplay={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName(/Volver a jugar/i);
  });
});