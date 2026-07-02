import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import * as gameLogger from '../services/gameLogger';

jest.mock('../services/gameLogger');

describe('ResultsScreen', () => {
  it('should log game_completed event upon reaching the results screen', () => {
    const mockProps = {
      score: 200,
      duration_ms: 60000,
      app_version: '2.0.0'
    };

    render(<ResultsScreen {...mockProps} />);

    expect(gameLogger.logGameCompleted).toHaveBeenCalledTimes(1);
    expect(gameLogger.logGameCompleted).toHaveBeenCalledWith(mockProps);
  });
});