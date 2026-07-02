import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import * as gameCompletedLogger from '../logging';

describe('TRIOFSND-36: ResultsScreen', () => {
  it('logs game_completed event upon reaching the results screen', () => {
    const logSpy = jest.spyOn(gameCompletedLogger, 'logGameCompleted').mockResolvedValue(undefined);
    
    const gameData = {
      score: 2000,
      duration_ms: 180000,
      app_version: '1.2.3',
    };

    render(<ResultsScreen {...gameData} />);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(gameData.score, gameData.duration_ms, gameData.app_version);
    
    logSpy.mockRestore();
  });
});