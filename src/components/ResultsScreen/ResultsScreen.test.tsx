import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe('ResultsScreen Component', () => {
  const mockOnPlayAgain = jest.fn();

  beforeEach(() => {
    mockOnPlayAgain.mockClear();
  });

  describe('Score Display', () => {
    it('renders the correct score text for a given score', () => {
      render(<ResultsScreen score={7} onPlayAgain={mockOnPlayAgain} />);
      expect(screen.getByText('Has acertado 7/10')).toBeInTheDocument();
    });

    it('renders the correct score text for 0', () => {
      render(<ResultsScreen score={0} onPlayAgain={mockOnPlayAgain} />);
      expect(screen.getByText('Has acertado 0/10')).toBeInTheDocument();
    });

    it('renders the correct score text for 10', () => {
      render(<ResultsScreen score={10} onPlayAgain={mockOnPlayAgain} />);
      expect(screen.getByText('Has acertado 10/10')).toBeInTheDocument();
    });
  });

  describe('Motivating Messages based on Score Ranges', () => {
    const testCases = [
      { score: 0, expectedMessage: '¡No te rindas! ¡Sigue intentándolo!' },
      { score: 3, expectedMessage: '¡No te rindas! ¡Sigue intentándolo!' },
      { score: 4, expectedMessage: '¡Buen trabajo! ¡Puedes mejorar!' },
      { score: 6, expectedMessage: '¡Buen trabajo! ¡Puedes mejorar!' },
      { score: 7, expectedMessage: '¡Muy bien! ¡Casi lo logras!' },
      { score: 8, expectedMessage: '¡Muy bien! ¡Casi lo logras!' },
      { score: 9, expectedMessage: '¡Excelente! ¡Eres un genio!' },
      { score: 10, expectedMessage: '¡Excelente! ¡Eres un genio!' },
    ];

    test.each(testCases)(
      'displays the correct message for score $score',
      ({ score, expectedMessage }) => {
        render(<ResultsScreen score={score} onPlayAgain={mockOnPlayAgain} />);
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      }
    );
  });

  describe('Volver a jugar Button', () => {
    it('renders the Volver a jugar button', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onPlayAgain callback when clicked', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      fireEvent.click(button);
      expect(mockOnPlayAgain).toHaveBeenCalledTimes(1);
    });

    it('has a minimum height of 48dp (48px in web) to meet accessibility standards', () => {
      render(<ResultsScreen score={5} onPlayAgain={mockOnPlayAgain} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toHaveStyle({ minHeight: '48px' });
    });
  });
});