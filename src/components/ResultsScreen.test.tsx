import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import * as gameCompletedLogger from '../logging';

describe('TRIOFSND-36: ResultsScreen', () => {
  it('logs game_completed event upon reaching the results screen', () => {
    const logSpy = jest
      .spyOn(gameCompletedLogger, 'logGameCompleted')
      .mockResolvedValue(undefined);

    const gameData = {
      score: 2000,
      duration_ms: 180000,
      app_version: '1.2.3',
    };

    render(
      <ResultsScreen
        score={gameData.score}
        durationMs={gameData.duration_ms}
        appVersion={gameData.app_version}
      />
    );

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      gameData.score,
      gameData.duration_ms,
      gameData.app_version
    );

    logSpy.mockRestore();
  });

  it('renders the score, duration, and app version on screen', () => {
    jest
      .spyOn(gameCompletedLogger, 'logGameCompleted')
      .mockResolvedValue(undefined);

    const { getByText } = render(
      <ResultsScreen score={500} durationMs={30000} appVersion="2.0.0" />
    );

    expect(getByText(/Score: 500/)).toBeInTheDocument();
    expect(getByText(/Duration: 30000 ms/)).toBeInTheDocument();
    expect(getByText(/App Version: 2.0.0/)).toBeInTheDocument();
  });

  it('does not block rendering if logging fails', () => {
    jest
      .spyOn(gameCompletedLogger, 'logGameCompleted')
      .mockRejectedValue(new Error('fail'));

    const { getByText } = render(
      <ResultsScreen score={100} durationMs={5000} appVersion="1.0.0" />
    );

    expect(getByText(/Score: 100/)).toBeInTheDocument();
  });
});
