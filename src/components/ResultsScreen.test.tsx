import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';
import * as scoreService from '../services/scoreService';

jest.mock('../services/scoreService');

describe('TRIOFSND-46: Render current best score on results screen', () => {
  const mockFetchBestScore = scoreService.fetchBestScore as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current score', async () => {
    mockFetchBestScore.mockResolvedValue(50);
    render(<ResultsScreen currentScore={75} />);
    
    expect(screen.getByText(/Your Score:/i)).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('fetches and renders the persisted best score', async () => {
    mockFetchBestScore.mockResolvedValue(100);
    render(<ResultsScreen currentScore={75} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Best Score:/i)).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
    
    expect(mockFetchBestScore).toHaveBeenCalledTimes(1);
  });

  it('renders best score as 0 if no best score is persisted', async () => {
    mockFetchBestScore.mockResolvedValue(0);
    render(<ResultsScreen currentScore={10} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Best Score:/i)).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('handles null best score gracefully by displaying 0', async () => {
    mockFetchBestScore.mockResolvedValue(null);
    render(<ResultsScreen currentScore={10} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Best Score:/i)).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('renders both current score and best score simultaneously', async () => {
    mockFetchBestScore.mockResolvedValue(120);
    render(<ResultsScreen currentScore={90} />);
    
    await waitFor(() => {
      expect(screen.getByText('90')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });
  });
});
