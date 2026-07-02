import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from '../ResultsScreen';
import * as analytics from '../../logging/analytics';

jest.mock('../../logging/analytics');

describe('ResultsScreen Component', () => {
  it('should emit game_completed event upon reaching the results screen', () => {
    const props = {
      score: 2000,
      duration_ms: 60000,
      app_version: '1.2.0'
    };

    render(<ResultsScreen {...props} />);

    expect(analytics.logGameCompleted).toHaveBeenCalledTimes(1);
    expect(analytics.logGameCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        score: props.score,
        duration_ms: props.duration_ms,
        app_version: props.app_version
      })
    );
  });
});