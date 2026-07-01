import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';
import * as scoreService from '../services/scoreService';

jest.mock('../services/scoreService');

describe('ResultsScreen - TRIOFSND-46', () => {
  const currentScore = 150;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current score', async () => {
    (scoreService.getBestScore as jest.Mock).mockResolvedValue(200);
    render(<ResultsScreen currentScore={currentScore} />);
    
    expect(screen.getByText(/Your Score: 150/i)).toBeInTheDocument();
  });

  it('fetches and renders the persisted best score alongside the current score', async () => {
    (scoreService.getBestScore as jest.Mock).mockResolvedValue(250);
    render(<ResultsScreen currentScore={currentScore} />);
    
    await waitFor(() => {
      expect(scoreService.getBestScore).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Your Score: 150/i)).toBeInTheDocument();
      expect(screen.getByText(/Best Score: 250/i)).toBeInTheDocument();
    });
  });

  it('displays the current score as the best score if it is higher than the persisted best score', async () => {
    (scoreService.getBestScore as jest.Mock).mockResolvedValue(100);
    render(<ResultsScreen currentScore={currentScore} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Best Score: 150/i)).toBeInTheDocument();
    });
  });

  it('displays 0 as the best score if no persisted best score exists and current score is 0', async () => {
    (scoreService.getBestScore as jest.Mock).mockResolvedValue(null);
    render(<ResultsScreen currentScore={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Your Score: 0/i)).toBeInTheDocument();
      expect(screen.getByText(/Best Score: 0/i)).toBeInTheDocument();
    });
  });

  it('handles error during best score fetch gracefully and still shows current score', async () => {
    (scoreService.getBestScore as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
    render(<ResultsScreen currentScore={currentScore} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Your Score: 150/i)).toBeInTheDocument();
      expect(screen.queryByText(/Best Score:/i)).not.toBeInTheDocument();
    });
  });
});