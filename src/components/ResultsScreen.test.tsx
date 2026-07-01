import { render, screen, waitFor } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import * as storage from '../utils/storage';

jest.mock('../utils/storage');

describe('ResultsScreen - TRIOFSND-46: Render current best score on results screen', () => {
  const mockGetBestScore = storage.getBestScore as jest.MockedFunction<typeof storage.getBestScore>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current score', () => {
    mockGetBestScore.mockResolvedValue(0);
    render(<ResultsScreen route={{ params: { currentScore: 7 } }} />);
    expect(screen.getByText('Tu puntuación: 7/10')).toBeInTheDocument();
  });

  it('fetches and renders the persisted best score alongside the current score', async () => {
    mockGetBestScore.mockResolvedValue(8);
    render(<ResultsScreen route={{ params: { currentScore: 7 } }} />);
    await waitFor(() => {
      expect(mockGetBestScore).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Mejor puntuación: 8/10')).toBeInTheDocument();
  });

  it('displays 0 when no best score has been persisted yet', async () => {
    mockGetBestScore.mockResolvedValue(0);
    render(<ResultsScreen route={{ params: { currentScore: 5 } }} />);
    await waitFor(() => {
      expect(screen.getByText('Mejor puntuación: 0/10')).toBeInTheDocument();
    });
  });

  it('shows a new record indicator when current score exceeds the persisted best score', async () => {
    mockGetBestScore.mockResolvedValue(6);
    render(<ResultsScreen route={{ params: { currentScore: 7 } }} />);
    expect(await screen.findByText('¡Nuevo récord! 🎉')).toBeInTheDocument();
  });

  it('does not show a new record indicator when current score is less than the persisted best score', async () => {
    mockGetBestScore.mockResolvedValue(9);
    render(<ResultsScreen route={{ params: { currentScore: 7 } }} />);
    await waitFor(() => {
      expect(screen.getByText('Mejor puntuación: 9/10')).toBeInTheDocument();
    });
    expect(screen.queryByText('¡Nuevo récord! 🎉')).not.toBeInTheDocument();
  });
});