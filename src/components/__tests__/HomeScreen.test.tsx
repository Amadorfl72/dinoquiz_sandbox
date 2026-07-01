import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeScreen from '../HomeScreen';

describe('HomeScreen', () => {
  beforeEach(() => {
    render(<HomeScreen />);
  });

  describe('Rendering', () => {
    it('renders the DinoQuiz title', () => {
      const title = screen.getByRole('heading', { name: /dinoquiz/i });
      expect(title).toBeInTheDocument();
    });

    it('renders the title with correct text content', () => {
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('DinoQuiz');
    });

    it('renders the dinosaur mascot illustration', () => {
      const mascot = screen.getByRole('img', { name: /dinosaur mascot/i });
      expect(mascot).toBeInTheDocument();
    });

    it('renders the dinosaur mascot with an accessible alt text', () => {
      const mascot = screen.getByRole('img', { name: /dinosaur mascot/i });
      expect(mascot).toHaveAttribute('alt');
      expect(mascot.getAttribute('alt').length).toBeGreaterThan(0);
    });

    it('renders the ¡Jugar! button', () => {
      const button = screen.getByRole('button', { name: /jugar/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('¡Jutar!');
    });

    it('renders the ¡Jugar! button with exact text', () => {
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('¡Jugar!');
    });
  });

  describe('Button Interaction', () => {
    it('calls onPlay when the ¡Jugar! button is clicked', () => {
      const onPlay = jest.fn();
      render(<HomeScreen onPlay={onPlay} />);
      const button = screen.getByRole('button', { name: /jugar/i });
      fireEvent.click(button);
      expect(onPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout Structure', () => {
    it('renders a main landmark', () => {
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('contains the title, mascot, and button within the main landmark', () => {
      const main = screen.getByRole('main');
      const title = screen.getByRole('heading', { name: /dinoquiz/i });
      const mascot = screen.getByRole('img', { name: /dinosaur mascot/i });
      const button = screen.getByRole('button', { name: /jugar/i });
      expect(main).toContainElement(title);
      expect(main).toContainElement(mascot);
      expect(main).toContainElement(button);
    });
  });
});
