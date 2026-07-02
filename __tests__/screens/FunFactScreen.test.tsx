import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFactScreen } from '../../src/screens/FunFactScreen';
import { analyticsLogger } from '../../src/services/analyticsLogger';

jest.mock('../../src/services/analyticsLogger', () => ({
  analyticsLogger: {
    emit: jest.fn(),
  },
}));

describe('TRIOFSND-30: FunFactScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits fun_fact_viewed structured log on screen render', () => {
    render(<FunFactScreen />);

    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
    expect(analyticsLogger.emit).toHaveBeenCalledWith({
      event: 'fun_fact_viewed',
    });
  });

  it('emits fun_fact_viewed exactly once even if component re-renders', () => {
    const { rerender } = render(<FunFactScreen factId="fact-1" />);

    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);

    rerender(<FunFactScreen factId="fact-2" />);

    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
  });

  it('emits fun_fact_viewed before any child content is interactable', () => {
    const { getByTestId } = render(<FunFactScreen />);

    const screen = getByTestId('fun-fact-screen');
    expect(screen).toBeTruthy();
    expect(analyticsLogger.emit).toHaveBeenCalledWith({
      event: 'fun_fact_viewed',
    });
  });

  it('does not emit fun_fact_viewed when component is unmounted', () => {
    const { unmount } = render(<FunFactScreen />);

    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);

    unmount();

    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
  });

  it('emits fun_fact_viewed with correct event name string', () => {
    render(<FunFactScreen />);

    const callArg = analyticsLogger.emit.mock.calls[0][0];
    expect(callArg).toHaveProperty('event', 'fun_fact_viewed');
    expect(typeof callArg.event).toBe('string');
  });
});
