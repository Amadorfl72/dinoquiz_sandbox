import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from './ResultsScreen';
import { logEvent } from '../utils/logging';

jest.mock('../utils/logging');

describe('TRIOFSND-36: Implement Client-Side game_completed Logging', () => {
  const mockScore = 1500;
  const mockDurationMs = 120000;
  const mockAppVersion = '1.0.0';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_VERSION = mockAppVersion;
  });

  afterEach(() => {
    delete process.env.REACT_APP_VERSION;
  });

  it('should emit game_completed event with score, duration_ms, and app_version upon rendering the results screen', () => {
    render(<ResultsScreen score={mockScore} durationMs={mockDurationMs} />);

    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith('game_completed', {
      score: mockScore,
      duration_ms: mockDurationMs,
      app_version: mockAppVersion
    });
  });

  it('should not emit game_completed event multiple times on component re-render', () => {
    const { rerender } = render(<ResultsScreen score={mockScore} durationMs={mockDurationMs} />);
    
    // Re-render the component with the same props
    rerender(<ResultsScreen score={mockScore} durationMs={mockDurationMs} />);

    expect(logEvent).toHaveBeenCalledTimes(1);
  });

  it('should handle zero score correctly', () => {
    render(<ResultsScreen score={0} durationMs={mockDurationMs} />);

    expect(logEvent).toHaveBeenCalledWith('game_completed', {
      score: 0,
      duration_ms: mockDurationMs,
      app_version: mockAppVersion
    });
  });
});