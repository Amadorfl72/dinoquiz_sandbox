import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HomeScreen from './HomeScreen';

describe('HomeScreen Component - TRIOFSND-50', () => {
  beforeEach(() => {
    render(<HomeScreen />);
  });

  it('renders the DinoQuiz title', () => {
    const title = screen.getByRole('heading', { name: /DinoQuiz/i });
    expect(title).toBeInTheDocument();
  });

  it('renders the dinosaur mascot illustration', () => {
    const mascot = screen.getByAltText(/dinosaur mascot/i);
    expect(mascot).toBeInTheDocument();
  });

  it('renders the ¡Jugar! button', () => {
    const button = screen.getByRole('button', { name: /¡Jugar!/i });
    expect(button).toBeInTheDocument();
  });

  it('applies ARIA labels to the button for accessibility', () => {
    const button = screen.getByRole('button', { name: /¡Jugar!/i });
    expect(button).toHaveAttribute('aria-label', 'Jugar');
  });

  it('ensures button is keyboard navigable', async () => {
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /¡Jugar!/i });
    await user.tab();
    expect(button).toHaveFocus();
  });

  it('meets accessibility standards for button height (>= 64px)', () => {
    const button = screen.getByRole('button', { name: /¡Jugar!/i });
    expect(button).toHaveStyle({ minHeight: '64px' });
  });

  it('meets accessibility standards for touch area (>= 48x48px)', () => {
    const button = screen.getByRole('button', { name: /¡Jugar!/i });
    expect(button).toHaveStyle({ minWidth: '48px', minHeight: '48px' });
  });

  it('meets accessibility standards for text size (>= 24px)', () => {
    const button = screen.getByRole('button', { name: /¡Jugar!/i });
    expect(button).toHaveStyle({ fontSize: '24px' });
  });

  it('applies responsive design classes for tablet horizontal layout', () => {
    const container = screen.getByTestId('home-screen-container');
    expect(container).toHaveClass('tablet-horizontal-layout');
  });
});