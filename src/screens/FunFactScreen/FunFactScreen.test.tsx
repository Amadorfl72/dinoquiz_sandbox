import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFactScreen } from './FunFactScreen';
import { logEvent } from '../../utils/analytics';

jest.mock('../../utils/analytics', () => ({
  logEvent: jest.fn(),
}));

describe('TRIOFSND-30: Trigger fun_fact_viewed event on screen load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits the fun_fact_viewed structured log when the Fun Fact screen is rendered', () => {
    render(<FunFactScreen />);
    
    expect(logEvent).toHaveBeenCalledWith('fun_fact_viewed');
  });

  it('emits the fun_fact_viewed event exactly once on initial render', () => {
    render(<FunFactScreen />);
    
    expect(logEvent).toHaveBeenCalledTimes(1);
  });

  it('does not emit the event again on re-render', () => {
    const { rerender } = render(<FunFactScreen />);
    
    expect(logEvent).toHaveBeenCalledTimes(1);
    
    rerender(<FunFactScreen />);
    
    expect(logEvent).toHaveBeenCalledTimes(1);
  });
});
