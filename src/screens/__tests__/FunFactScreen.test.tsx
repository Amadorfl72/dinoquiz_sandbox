import React from 'react';
import { render } from '@testing-library/react';
import { FunFactScreen } from '../FunFactScreen';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  logger: {
    emit: jest.fn(),
  },
}));

describe('TRIOFSND-30: Trigger fun_fact_viewed event on screen load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits fun_fact_viewed structured log when the Fun Fact screen is rendered', () => {
    render(<FunFactScreen />);
    
    expect(logger.emit).toHaveBeenCalledTimes(1);
    expect(logger.emit).toHaveBeenCalledWith('fun_fact_viewed', expect.objectContaining({
      screen: 'FunFactScreen',
      timestamp: expect.any(Number),
    }));
  });
});
