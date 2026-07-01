import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import * as gameCompletedLogger from '../logging/gameCompletedLogger';

jest.mock('../logging/gameCompletedLogger');

describe('TRIOFSND-36: ResultsScreen game_completed Logging', () => {
  it('should call logGameCompleted with score, duration_ms, and app_version upon reaching the results screen', () => {
    const mockLogGameCompleted = jest.spyOn(gameCompletedLogger, 'logGameCompleted');
    
    const gameData = {
      score: 2000,
      duration_ms: 300000,
      app_version: '2.0.0',
    };

    render(<ResultsScreen {...gameData} />);

    expect(mockLogGameCompleted).toHaveBeenCalledTimes(1);
    expect(mockLogGameCompleted).toHaveBeenCalledWith(gameData);
  });
});