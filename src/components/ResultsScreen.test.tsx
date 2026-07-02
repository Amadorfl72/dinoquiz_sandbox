import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import * as gameLogger from '../services/gameLogger';

jest.mock('../services/gameLogger');

describe('TRIOFSND-36: ResultsScreen game_completed Logging', () => {
  const mockProps = {
    score: 2500,
    duration_ms: 180000,
    app_version: '1.2.3',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger game_completed logging upon reaching the results screen', () => {
    render(<ResultsScreen {...mockProps} />);

    expect(screen.getByText(/Game Over/i)).toBeInTheDocument();
    expect(gameLogger.logGameCompleted).toHaveBeenCalledTimes(1);
    expect(gameLogger.logGameCompleted).toHaveBeenCalledWith(mockProps);
  });

  it('should trigger logging exactly once even if re-rendered', () => {
    const { rerender } = render(<ResultsScreen {...mockProps} />);
    rerender(<ResultsScreen {...mockProps} />);

    expect(gameLogger.logGameCompleted).toHaveBeenCalledTimes(1);
  });
});