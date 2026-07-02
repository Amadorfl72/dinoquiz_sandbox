import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFactScreen } from './FunFactScreen';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  logger: {
    logEvent: jest.fn(),
  },
}));

describe('FunFactScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Fun Fact screen', () => {
    const { getByText } = render(<FunFactScreen />);
    expect(getByText('Fun Fact')).toBeTruthy();
  });

  it('emits fun_fact_viewed structured log on screen load', () => {
    render(<FunFactScreen />);
    expect(logger.logEvent).toHaveBeenCalledWith('fun_fact_viewed', expect.any(Object));
  });

  it('emits fun_fact_viewed structured log exactly once on mount', () => {
    render(<FunFactScreen />);
    expect(logger.logEvent).toHaveBeenCalledTimes(1);
    expect(logger.logEvent).toHaveBeenCalledWith('fun_fact_viewed', expect.any(Object));
  });

  it('does not emit fun_fact_viewed on re-render', () => {
    const { rerender } = render(<FunFactScreen />);
    expect(logger.logEvent).toHaveBeenCalledTimes(1);
    rerender(<FunFactScreen />);
    expect(logger.logEvent).toHaveBeenCalledTimes(1);
  });
});
