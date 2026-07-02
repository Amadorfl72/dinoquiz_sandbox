import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe('ResultsScreen', () => {
  const mockOnReplay = jest.fn();

  beforeEach(() => {
    mockOnReplay.mockClear();
  });

  describe('Score Display', () => {
    it('renders the score text with the provided score', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      expect(screen.getByText(/Has acertado 5\/10/i)).toBeInTheDocument();
    });

    it('renders the score text for score 0', () => {
      render(<ResultsScreen score={0} onReplay={mockOnReplay} />);
      expect(screen.getByText(/Has acertado 0\/10/i)).toBeInTheDocument();
    });

    it('renders the score text for score 10', () => {
      render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
      expect(screen.getByText(/Has acertado 10\/10/i)).toBeInTheDocument();
    });
  });

  describe('Motivating Messages based on Score Ranges', () => {
    it('renders the correct message for score range 0-3', () => {
      render(<ResultsScreen score={2} onReplay={mockOnReplay} />);
      expect(screen.getByText(/¡No te rindas!/i)).toBeInTheDocument();
    });

    it('renders the correct message for score 0 (boundary)', () => {
      render(<ResultsScreen score={0} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡No te rindas! ¡Sigue intentándolo!')).toBeInTheDocument();
    });

    it('renders the correct message for score 3 (boundary)', () => {
      render(<ResultsScreen score={3} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡No te rindas! ¡Sigue intentándolo!')).toBeInTheDocument();
    });

    it('renders the correct message for score range 4-6', () => {
      render(<ResultsScreen score={6} onReplay={mockOnReplay} />);
      expect(screen.getByText(/¡Buen trabajo!/i)).toBeInTheDocument();
    });

    it('renders the correct message for score 4 (boundary)', () => {
      render(<ResultsScreen score={4} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Buen trabajo! ¡Puedes mejorar!')).toBeInTheDocument();
    });

    it('renders the correct message for score range 7-8', () => {
      render(<ResultsScreen score={8} onReplay={mockOnReplay} />);
      expect(screen.getByText(/¡Muy bien!/i)).toBeInTheDocument();
    });

    it('renders the correct message for score 7 (boundary)', () => {
      render(<ResultsScreen score={7} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Muy bien! ¡Casi lo logras!')).toBeInTheDocument();
    });

    it('renders the correct message for score range 9-10', () => {
      render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
      expect(screen.getByText(/¡Excelente!/i)).toBeInTheDocument();
    });

    it('renders the correct message for score 9 (boundary)', () => {
      render(<ResultsScreen score={9} onReplay={mockOnReplay} />);
      expect(screen.getByText('¡Excelente! ¡Eres un genio!')).toBeInTheDocument();
    });
  });

  describe('Volver a jugar Button', () => {
    it('renders a prominent "Volver a jugar" button', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onReplay when the button is clicked', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      fireEvent.click(button);
      expect(mockOnReplay).toHaveBeenCalledTimes(1);
    });

    it('renders the button for every score range', () => {
      [0, 3, 4, 6, 7, 8, 9, 10].forEach((score) => {
        const { unmount } = render(<ResultsScreen score={score} onReplay={mockOnReplay} />);
        const button = screen.getByRole('button', { name: /Volver a jugar/i });
        expect(button).toBeInTheDocument();
        unmount();
      });
    });
  });
});