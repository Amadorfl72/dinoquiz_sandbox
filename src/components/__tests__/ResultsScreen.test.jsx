import React from 'react';
import { render } from '@testing-library/react';
import ResultsScreen from '../ResultsScreen';
import * as analytics from '../../logging';

jest.mock('../../logging');

describe('ResultsScreen Component', () => {
  it('should emit game_completed event upon reaching the results screen', () => {
    const props = {
      score: 2000,
      duration_ms: 60000,
      app_version: '1.2.0',
    };

    render(
      <ResultsScreen
        score={props.score}
        durationMs={props.duration_ms}
        appVersion={props.app_version}
      />
    );

    expect(analytics.logGameCompleted).toHaveBeenCalledTimes(1);
    expect(analytics.logGameCompleted).toHaveBeenCalledWith(
      props.score,
      props.duration_ms,
      props.app_version
    );
  });
});
