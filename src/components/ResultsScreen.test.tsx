import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';

describe('ResultsScreen', () => {
  const mockOnReplay = jest.fn();

  beforeEach(() => {
    mockOnReplay.mockClear();
  });

  it('renders the score correctly', () => {
    render(<ResultsScreen score={5} onReplay={mockOnReplay} />);
    expect(screen.getByText(/Has acertado 5\/10/i)).toBeInTheDocument();
  });

  it('renders the correct message for score range 0-3', () => {
    render(<ResultsScreen score={2} onReplay={mockOnReplay} />);
    expect(screen.getByText(/¡No te rindas!/i)).toBeInTheDocument();
  });

  it('renders the correct message for score range 4-6', () => {
    render(<ResultsScreen score={6} onReplay={mockOnReplay} />);
    expect(screen.getByText(/¡Buen trabajo!/i)).toBeInTheDocument();
  });

  it('renders the correct message for score range 7-8', () => {
    render(<ResultsScreen score={8} onReplay={mockOnReplay} />);
    expect(screen.getByText(/¡Muy bien!/i)).toBeInTheDocument();
  });

  it('renders the correct message for score range 9-10', () => {
    render(<ResultsScreen score={10} onReplay={mockOnReplay} />);
    expect(screen.getByText(/¡Excelente!/i)).toBeInTheDocument();
  });

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
});
