import React from 'react';
import { render } from '@testing-library/react-native';
import FunFactScreen from './FunFactScreen';
import { analytics } from '../../services/analytics';

jest.mock('../../services/analytics', () => ({
  analytics: {
    logEvent: jest.fn(),
  },
}));

describe('TRIOFSND-30: Trigger fun_fact_viewed event on screen load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits the fun_fact_viewed structured log when the screen is rendered', () => {
    render(<FunFactScreen />);
    
    expect(analytics.logEvent).toHaveBeenCalledWith('fun_fact_viewed');
  });

  it('does not emit the event multiple times on re-render', () => {
    const { rerender } = render(<FunFactScreen />);
    rerender(<FunFactScreen />);
    
    expect(analytics.logEvent).toHaveBeenCalledTimes(1);
  });
});