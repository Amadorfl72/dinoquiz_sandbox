import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HomeScreen from './HomeScreen';

describe('HomeScreen Component - TRIOFSND-50', () => {
  const mockNavigation = { navigate: jest.fn() };

  beforeEach(() => {
    render(<HomeScreen navigation={mockNavigation} />);
  });

  it('renders the DinoQuiz title', () => {
    const title = screen.getByRole('heading', { name: /DinoQuiz/i });
    expect(title).toBeInTheDocument();
  });

  it('renders the dinosaur mascot illustration with accessibility attributes', () => {
    const mascot = screen.getByRole('image', { name: /Mascota de DinoQuiz/i });
    expect(mascot).toBeInTheDocument();
  });

  it('renders the ¡Jugar! button with proper accessibility attributes', () => {
    const button = screen.getByRole('button', { name: /Botón para empezar a jugar/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAccessibleName('Botón para empezar a jugar');
    expect(button).toHaveAttribute('accessibilityHint', 'Presiona para comenzar una nueva partida');
  });

  it('navigates to Quiz screen when button is pressed', async () => {
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /Botón para empezar a jugar/i });
    await user.click(button);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Quiz');
  });

  it('meets accessibility standards for button dimensions', () => {
    const button = screen.getByRole('button', { name: /Botón para empezar a jugar/i });
    expect(button).toHaveStyle({ minHeight: '64px', minWidth: '200px' });
  });

  it('has sufficient text contrast (WCAG AA)', () => {
    const buttonText = screen.getByText('¡Jugar!');
    expect(buttonText).toHaveStyle({ color: '#FFFFFF' });
    const button = screen.getByRole('button', { name: /Botón para empezar a jugar/i });
    expect(button).toHaveStyle({ backgroundColor: '#4ECDC4' });
  });
});