import { render, screen, waitFor } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import * as bestScoreService from '../services/bestScoreService';

jest.mock('../services/bestScoreService');

describe('ResultsScreen - TRIOFSND-46: Render current best score on results screen', () => {
  const mockGetBestScore = bestScoreService.getBestScore as jest.MockedFunction<typeof bestScoreService.getBestScore>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current score', async () => {
    mockGetBestScore.mockResolvedValue(150);
    render(<ResultsScreen currentScore={120} />);
    expect(screen.getByText(/Your Score/i)).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('fetches and renders the persisted best score alongside the current score', async () => {
    mockGetBestScore.mockResolvedValue(200);
    render(<ResultsScreen currentScore={120} />);
    await waitFor(() => {
      expect(mockGetBestScore).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/Best Score/i)).toBeInTheDocument();
    expect(await screen.findByText('200')).toBeInTheDocument();
  });

  it('displays a placeholder when no best score has been persisted yet', async () => {
    mockGetBestScore.mockResolvedValue(null);
    render(<ResultsScreen currentScore={50} />);
    await waitFor(() => {
      expect(screen.getByText(/Best Score/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/--/i)).toBeInTheDocument();
  });

  it('shows a new record indicator when current score exceeds the persisted best score', async () => {
    mockGetBestScore.mockResolvedValue(100);
    render(<ResultsScreen currentScore={150} />);
    expect(await screen.findByText(/New Record!/i)).toBeInTheDocument();
  });

  it('does not show a new record indicator when current score is less than the persisted best score', async () => {
    mockGetBestScore.mockResolvedValue(300);
    render(<ResultsScreen currentScore={150} />);
    await waitFor(() => {
      expect(screen.getByText('300')).toBeInTheDocument();
    });
    expect(screen.queryByText(/New Record!/i)).not.toBeInTheDocument();
  });
});
