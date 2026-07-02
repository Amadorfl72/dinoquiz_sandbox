import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from '../ResultsScreen';

describe('ResultsScreen Component', () => {
  const mockOnReplay = jest.fn();

  beforeEach(() => {
    mockOnReplay.mockClear();
  });

  describe('Score Display', () => {
    it('renders the correct score text for a given score', () => {
      render(<ResultsScreen score={7} onReplay={mockOnReplay} />);
      expect(screen.getByText('Has acertado 7/10')).toBeInTheDocument();
    });

    it('renders the correct score text for 0', () => {
      render(<ResultsScreen score={0} onReplay={mockOnReplay} />);
      expect(screen.getByText('Has acertado 0/10')).toBeInTheDocument();
    });

    it('renders the correct score text for 10', () => {
      render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
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
        render(<ResultsScreen score={score} onReplay={mockOnReplay} />);
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      }
    );
  });

  describe('Volver a jugar Button', () => {
    it('renders the Volver a jugar button', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onReplay callback when clicked', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      fireEvent.click(button);
      expect(mockOnReplay).toHaveBeenCalledTimes(1);
    });
  });
});
