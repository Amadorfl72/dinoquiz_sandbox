import React from 'react';
import { render } from '@testing-library/react-native';
import FunFactScreen from '../FunFactScreen';
import { analyticsLogger } from '../../services/analyticsLogger';

jest.mock('../../services/analyticsLogger', () => ({
  analyticsLogger: {
    emit: jest.fn(),
  },
}));

describe('TRIOFSND-30: Trigger fun_fact_viewed event on screen load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits the fun_fact_viewed structured log when the screen is rendered', () => {
    render(<FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />);

    expect(analyticsLogger.emit).toHaveBeenCalledWith({
      event: 'fun_fact_viewed',
    });
  });

  it('does not emit the event multiple times on re-render', () => {
    const { rerender } = render(
      <FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />
    );
    rerender(
      <FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />
    );

    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
  });
});
