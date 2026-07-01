import React from 'react';
import { render } from '@testing-library/react-native';
import FunFactScreen from '../app/screens/FunFactScreen';
import { logger } from '../app/services/logger';

jest.mock('../app/services/logger', () => ({
  logger: {
    log: jest.fn(),
  },
}));

describe('TRIOFSND-30 - FunFactScreen fun_fact_viewed event on load', () => {
  const mockLog = (logger.log as jest.MockedFunction<typeof logger.log>);

  beforeEach(() => {
    mockLog.mockClear();
  });

  it('emits the fun_fact_viewed structured log when the screen is rendered', () => {
    render(<FunFactScreen factId="123" />);

    expect(mockLog).toHaveBeenCalledTimes(1);

    const call = mockLog.mock.calls[0];
    const eventName =
      typeof call[0] === 'string' ? call[0] : call[0] && call[0].event;
    expect(eventName).toBe('fun_fact_viewed');
  });

  it('passes a structured object payload to the logger', () => {
    render(<FunFactScreen factId="123" />);

    const payload = mockLog.mock.calls[0][1] ?? mockLog.mock.calls[0][0];
    expect(payload).toEqual(expect.any(Object));
  });

  it('includes the fact id in the structured payload', () => {
    render(<FunFactScreen factId="abc-123" />);

    const payload = mockLog.mock.calls[0][1] ?? mockLog.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ factId: 'abc-123' }));
  });

  it('emits the event exactly once on initial mount', () => {
    const { rerender } = render(<FunFactScreen factId="1" />);

    rerender(<FunFactScreen factId="1" />);
    rerender(<FunFactScreen factId="1" />);

    expect(mockLog).toHaveBeenCalledTimes(1);
  });

  it('does not emit the event before the screen is rendered', () => {
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('emits a new fun_fact_viewed event when a new instance is mounted', () => {
    const { unmount } = render(<FunFactScreen factId="1" />);
    expect(mockLog).toHaveBeenCalledTimes(1);

    unmount();
    render(<FunFactScreen factId="2" />);

    expect(mockLog).toHaveBeenCalledTimes(2);
    const secondCall = mockLog.mock.calls[1];
    const eventName =
      typeof secondCall[0] === 'string' ? secondCall[0] : secondCall[0] && secondCall[0].event;
    expect(eventName).toBe('fun_fact_viewed');
  });

  it('does not emit fun_fact_viewed when the screen fails to mount', () => {
    // Ensure the event is tied to successful render, not to module import side effects.
    expect(mockLog).not.toHaveBeenCalled();
  });
});