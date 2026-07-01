import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import * as loggingService from '../services/loggingService';

jest.mock('../services/loggingService');

describe('ResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should emit game_completed event upon reaching the results screen', () => {
    const props = {
      score: 150,
      durationMs: 45000,
      appVersion: '1.2.3'
    };

    render(<ResultsScreen {...props} />);

    expect(loggingService.logGameCompleted).toHaveBeenCalledTimes(1);
    expect(loggingService.logGameCompleted).toHaveBeenCalledWith(
      props.score,
      props.durationMs,
      props.appVersion
    );
  });
});