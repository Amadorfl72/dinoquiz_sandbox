import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';
import * as storage from '../utils/storage';

jest.mock('../utils/storage');

describe('TRIOFSND-46: Render current best score on results screen', () => {
  const mockGetBestScore = storage.getBestScore as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current score', async () => {
    mockGetBestScore.mockReturnValue(50);
    render(<ResultsScreen currentScore={75} />);
    
    expect(screen.getByText(/Tu puntuación actual:/i)).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('fetches and renders the persisted best score', async () => {
    mockGetBestScore.mockReturnValue(100);
    render(<ResultsScreen currentScore={75} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Tu mejor puntuación:/i)).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
    
    expect(mockGetBestScore).toHaveBeenCalledTimes(1);
  });

  it('renders best score as 0 if no best score is persisted', async () => {
    mockGetBestScore.mockReturnValue(0);
    render(<ResultsScreen currentScore={10} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Tu mejor puntuación:/i)).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('renders both current score and best score simultaneously', async () => {
    mockGetBestScore.mockReturnValue(120);
    render(<ResultsScreen currentScore={90} />);
    
    await waitFor(() => {
      expect(screen.getByText('90')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });
  });
});