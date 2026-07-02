import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsScreen from './ResultsScreen';
import * as storage from '../utils/storage';

jest.mock('../utils/storage');

describe('TRIOFSND-46: Render current best score on results screen', () => {
  const mockGetBestScore = storage.getBestScore as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current score', () => {
    mockGetBestScore.mockReturnValue(50);
    render(<ResultsScreen currentScore={75} />);
    
    expect(screen.getByText('Tu puntuación actual: 75')).toBeInTheDocument();
  });

  it('fetches and renders the persisted best score', () => {
    mockGetBestScore.mockReturnValue(100);
    render(<ResultsScreen currentScore={75} />);
    
    expect(screen.getByText('Tu mejor puntuación: 100')).toBeInTheDocument();
    expect(mockGetBestScore).toHaveBeenCalledTimes(1);
  });

  it('renders best score as 0 if no best score is persisted', () => {
    mockGetBestScore.mockReturnValue(0);
    render(<ResultsScreen currentScore={10} />);
    
    expect(screen.getByText('Tu mejor puntuación: 0')).toBeInTheDocument();
  });

  it('renders both current score and best score simultaneously', () => {
    mockGetBestScore.mockReturnValue(120);
    render(<ResultsScreen currentScore={90} />);
    
    expect(screen.getByText('Tu puntuación actual: 90')).toBeInTheDocument();
    expect(screen.getByText('Tu mejor puntuación: 120')).toBeInTheDocument();
  });
  
  it('renders the game over title and replay button', () => {
    mockGetBestScore.mockReturnValue(0);
    render(<ResultsScreen currentScore={0} />);
    
    expect(screen.getByText('¡Partida Terminada!')).toBeInTheDocument();
    expect(screen.getByText('Volver a jugar')).toBeInTheDocument();
  });
});