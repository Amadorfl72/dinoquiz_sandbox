import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResultsScreen } from './ResultsScreen';
import * as bestScoreService from '../../services/bestScoreService';

jest.mock('../../services/bestScoreService');

describe('ResultsScreen', () => {
  const mockFetchBestScore = bestScoreService.fetchBestScore as jest.MockedFunction<
    typeof bestScoreService.fetchBestScore
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current score on the results screen', () => {
    mockFetchBestScore.mockReturnValue(0);
    render(<ResultsScreen currentScore={85} />);
    expect(screen.getByTestId('current-score')).toBeInTheDocument();
    expect(screen.getByTestId('current-score')).toHaveTextContent('85');
  });

  it('fetches the persisted best score on mount', () => {
    mockFetchBestScore.mockReturnValue(120);
    render(<ResultsScreen currentScore={85} />);
    expect(mockFetchBestScore).toHaveBeenCalledTimes(1);
  });

  it('renders the best score alongside the current score', () => {
    mockFetchBestScore.mockReturnValue(120);
    render(<ResultsScreen currentScore={85} />);
    expect(screen.getByTestId('best-score')).toBeInTheDocument();
    expect(screen.getByTestId('best-score')).toHaveTextContent('120');
    expect(screen.getByTestId('current-score')).toHaveTextContent('85');
  });

  it('displays a best score label so the child understands it is their record', () => {
    mockFetchBestScore.mockReturnValue(120);
    render(<ResultsScreen currentScore={85} />);
    expect(screen.getByText(/best score/i)).toBeInTheDocument();
  });

  it('renders both scores even when best score is zero', () => {
    mockFetchBestScore.mockReturnValue(0);
    render(<ResultsScreen currentScore={50} />);
    expect(screen.getByTestId('best-score')).toHaveTextContent('0');
    expect(screen.getByTestId('current-score')).toHaveTextContent('50');
  });

  it('renders both scores when current score equals best score', () => {
    mockFetchBestScore.mockReturnValue(100);
    render(<ResultsScreen currentScore={100} />);
    expect(screen.getByTestId('best-score')).toHaveTextContent('100');
    expect(screen.getByTestId('current-score')).toHaveTextContent('100');
  });

  it('renders both scores when current score exceeds best score', () => {
    mockFetchBestScore.mockReturnValue(50);
    render(<ResultsScreen currentScore={200} />);
    expect(screen.getByTestId('best-score')).toHaveTextContent('50');
    expect(screen.getByTestId('current-score')).toHaveTextContent('200');
  });

  it('does not crash when best score service returns null', () => {
    mockFetchBestScore.mockReturnValue(null as any);
    render(<ResultsScreen currentScore={85} />);
    expect(screen.getByTestId('current-score')).toHaveTextContent('85');
    expect(screen.getByTestId('best-score')).toBeInTheDocument();
  });
});
