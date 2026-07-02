import React from 'react';
import { render } from '@testing-library/react-native';
import FunFactScreen from '../FunFactScreen';
import { analyticsLogger } from '../../services/analyticsLogger';

jest.mock('../../services/analyticsLogger', () => ({
  analyticsLogger: {
    emit: jest.fn(),
  },
}));

describe('FunFactScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Fun Fact screen', () => {
    const { getByText } = render(
      <FunFactScreen route={{ params: { funFact: { text: 'Fun Fact' } } }} />
    );
    expect(getByText('Fun Fact')).toBeTruthy();
  });

  it('emits fun_fact_viewed structured log on screen load', () => {
    render(<FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />);
    expect(analyticsLogger.emit).toHaveBeenCalledWith({ event: 'fun_fact_viewed' });
  });

  it('emits fun_fact_viewed structured log exactly once on mount', () => {
    render(<FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />);
    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
    expect(analyticsLogger.emit).toHaveBeenCalledWith({ event: 'fun_fact_viewed' });
  });

  it('does not emit fun_fact_viewed on re-render', () => {
    const { rerender } = render(
      <FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />
    );
    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
    rerender(
      <FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />
    );
    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
  });
});
