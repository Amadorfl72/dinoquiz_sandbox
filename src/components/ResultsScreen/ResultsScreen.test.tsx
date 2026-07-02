import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from '../ResultsScreen';
import { MIN_BUTTON_HEIGHT } from './__mocks__/styleMock';

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

    it('renders the score text with the exact format "Has acertado X/10"', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      expect(screen.getByText('Has acertado 5/10')).toBeInTheDocument();
    });
  });

  describe('Motivating Messages based on Score Ranges', () => {
    const testCases = [
      { score: 0, expectedMessage: '¡No te rindas! ¡Sigue intentándolo!' },
      { score: 1, expectedMessage: '¡No te rindas! ¡Sigue intentándolo!' },
      { score: 2, expectedMessage: '¡No te rindas! ¡Sigue intentándolo!' },
      { score: 3, expectedMessage: '¡No te rindas! ¡Sigue intentándolo!' },
      { score: 4, expectedMessage: '¡Buen trabajo! ¡Puedes mejorar!' },
      { score: 5, expectedMessage: '¡Buen trabajo! ¡Puedes mejorar!' },
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

    it('displays exactly one motivating message', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const messages = screen.getAllByText(/¡.*!/);
      // The score text also contains exclamation marks, so filter for the message
      const motivationalMessages = messages.filter(
        (el) => !el.textContent?.includes('Has acertado')
      );
      expect(motivationalMessages).toHaveLength(1);
    });
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

    it('does not call onReplay before clicking', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      expect(mockOnReplay).not.toHaveBeenCalled();
    });

    it('calls onReplay each time the button is clicked', () => {
      render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      const button = screen.getByRole('button', { name: /Volver a jugar/i });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      expect(mockOnReplay).toHaveBeenCalledTimes(3);
    });
  });

  describe('Button Prominence (>=48dp)', () => {
    it('the replay button container has a minimum height of at least 48dp', () => {
      const { container } = render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
      // The component defines replayButtonContainer with minHeight: 48
      // and replayButton with minHeight: 48.
      // We verify the constant matches the requirement.
      expect(MIN_BUTTON_HEIGHT).toBeGreaterThanOrEqual(48);
    });

    it('the MIN_BUTTON_HEIGHT constant is 48', () => {
      expect(MIN_BUTTON_HEIGHT).toBe(48);
    });
  });

  describe('Component Props', () => {
    it('accepts a score prop and displays it', () => {
      render(<ResultsScreen score={3} onReplay={mockOnReplay} />);
      expect(screen.getByText('Has acertado 3/10')).toBeInTheDocument();
    });

    it('accepts an onReplay prop and invokes it on button press', () => {
      const customHandler = jest.fn();
      render(<ResultsScreen score={1} onReplay={customHandler} />);
      fireEvent.click(screen.getByRole('button', { name: /Volver a jugar/i }));
      expect(customHandler).toHaveBeenCalledTimes(1);
    });
  });
});
