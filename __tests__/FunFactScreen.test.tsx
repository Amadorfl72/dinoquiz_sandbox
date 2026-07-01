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
    render(<FunFactScreen route={{ params: { funFact: 'Test fact', dinosaurName: 'T-Rex', factId: '123' } }} />);

    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      'fun_fact_viewed',
      expect.objectContaining({
        dinosaur_name: 'T-Rex',
        fact_id: '123'
      })
    );
  });

  it('emits the fun_fact_viewed event only once on mount, even with re-renders', () => {
    const { rerender } = render(<FunFactScreen route={{ params: { funFact: 'Test fact', dinosaurName: 'T-Rex', factId: '123' } }} />);
    
    expect(logger.log).toHaveBeenCalledTimes(1);

    rerender(<FunFactScreen route={{ params: { funFact: 'Test fact', dinosaurName: 'T-Rex', factId: '123' } }} />);
    
    expect(logger.log).toHaveBeenCalledTimes(1);
  });
});