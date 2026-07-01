import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFactScreen } from '../src/screens/FunFactScreen';
import { logger } from '../src/services/logger';

jest.mock('../src/services/logger', () => ({
  logger: {
    log: jest.fn(),
  },
}));

describe('TRIOFSND-30: Trigger fun_fact_viewed event on screen load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits the fun_fact_viewed structured log when the Fun Fact screen is rendered', () => {
    render(<FunFactScreen />);

    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'fun_fact_viewed',
      })
    );
  });

  it('emits the fun_fact_viewed event only once on mount, even with re-renders', () => {
    const { rerender } = render(<FunFactScreen />);
    
    expect(logger.log).toHaveBeenCalledTimes(1);

    rerender(<FunFactScreen />);
    
    expect(logger.log).toHaveBeenCalledTimes(1);
  });
});
