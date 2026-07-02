import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from '../components/ResultsScreen';
import * as gameCompletedLogger from '../logging';

jest.mock('../logging');

describe('ResultsScreen', () => {
  it('should log game_completed event upon reaching the results screen', () => {
    const mockProps = {
      score: 200,
      duration_ms: 60000,
      app_version: '2.0.0',
    };

    render(
      <ResultsScreen
        score={mockProps.score}
        durationMs={mockProps.duration_ms}
        appVersion={mockProps.app_version}
      />
    );

    expect(gameCompletedLogger.logGameCompleted).toHaveBeenCalledTimes(1);
    expect(gameCompletedLogger.logGameCompleted).toHaveBeenCalledWith(
      mockProps.score,
      mockProps.duration_ms,
      mockProps.app_version
    );
  });

  it('should display the score, duration, and app version', () => {
    const { getByText } = render(
      <ResultsScreen score={200} durationMs={60000} appVersion="2.0.0" />
    );

    expect(getByText(/Score: 200/)).toBeInTheDocument();
    expect(getByText(/Duration: 60000 ms/)).toBeInTheDocument();
    expect(getByText(/App Version: 2.0.0/)).toBeInTheDocument();
  });
});
