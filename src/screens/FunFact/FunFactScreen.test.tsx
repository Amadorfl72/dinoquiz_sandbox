import React from 'react';
import { render } from '@testing-library/react-native';
import FunFactScreen from '../FunFactScreen';
import { analyticsLogger } from '../../services/analyticsLogger';

jest.mock('../../services/analyticsLogger', () => ({
  analyticsLogger: {
    emit: jest.fn(),
  },
}));

describe('TRIOFSND-30: FunFactScreen fun_fact_viewed event', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Fun Fact screen', () => {
    const { getByText } = render(
      <FunFactScreen route={{ params: { funFact: { text: 'Fun Fact' } } }} />
    );
    expect(getByText('Fun Fact')).toBeTruthy();
  });

  it('renders the fun fact text from route params', () => {
    const { getByText } = render(
      <FunFactScreen route={{ params: { funFact: { text: 'Dinosaurs ruled the Earth' } } }} />
    );
    expect(getByText('Dinosaurs ruled the Earth')).toBeTruthy();
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

  it('does not emit fun_fact_viewed on re-render with different props', () => {
    const { rerender } = render(
      <FunFactScreen route={{ params: { funFact: { text: 'First fact' } } }} />
    );
    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
    rerender(
      <FunFactScreen route={{ params: { funFact: { text: 'Second fact' } } }} />
    );
    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
  });

  it('emits fun_fact_viewed with no PII fields', () => {
    render(<FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />);
    const call = (analyticsLogger.emit as jest.Mock).mock.calls[0][0];
    expect(call).toEqual({ event: 'fun_fact_viewed' });
    expect(call).not.toHaveProperty('userId');
    expect(call).not.toHaveProperty('email');
    expect(call).not.toHaveProperty('name');
  });

  it('emits fun_fact_viewed with only the event field', () => {
    render(<FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />);
    const call = (analyticsLogger.emit as jest.Mock).mock.calls[0][0];
    expect(Object.keys(call)).toEqual(['event']);
  });

  it('emits the event on mount before unmounting', () => {
    const { unmount } = render(
      <FunFactScreen route={{ params: { funFact: { text: 'Test fun fact' } } }} />
    );
    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
    unmount();
    expect(analyticsLogger.emit).toHaveBeenCalledTimes(1);
  });
});
