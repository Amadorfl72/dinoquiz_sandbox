import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import JugarButton from '../JugarButton';
import * as analytics from '../../utils/analytics';

jest.mock('../../utils/analytics');

let mockNavigate;
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithRouter = (ui) => render(<Router>{ui}</Router>);

describe('TRIOFSND-52: JugarButton navigation and event logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
  });

  it('renders the ¡Jugar! button', () => {
    renderWithRouter(<JugarButton />);
    expect(screen.getByText('¡Jugar!')).toBeInTheDocument();
  });

  it('navigates to the game screen when the button is clicked', () => {
    renderWithRouter(<JugarButton />);
    fireEvent.click(screen.getByText('¡Jugar!'));
    expect(mockNavigate).toHaveBeenCalledWith('/game');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('triggers the first_tap_jugar analytics event on click', () => {
    renderWithRouter(<JugarButton />);
    fireEvent.click(screen.getByText('¡Jugar!'));
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'first_tap_jugar',
      expect.any(Object)
    );
    expect(analytics.logEvent).toHaveBeenCalledTimes(1);
  });

  it('includes a timestamp in the analytics event', () => {
    renderWithRouter(<JugarButton />);
    fireEvent.click(screen.getByText('¡Jugar!'));
    const eventPayload = analytics.logEvent.mock.calls[0][1];
    expect(eventPayload).toHaveProperty('timestamp');
    expect(typeof eventPayload.timestamp).toBe('number');
  });

  it('logs the event before navigating', () => {
    const callOrder = [];
    analytics.logEvent.mockImplementation(() => callOrder.push('log'));
    mockNavigate.mockImplementation(() => callOrder.push('navigate'));

    renderWithRouter(<JugarButton />);
    fireEvent.click(screen.getByText('¡Jugar!'));

    expect(callOrder).toEqual(['log', 'navigate']);
  });

  it('passes valid event parameters to analytics', () => {
    renderWithRouter(<JugarButton />);
    fireEvent.click(screen.getByText('¡Jugar!'));

    const [eventName, eventParams] = analytics.logEvent.mock.calls[0];
    expect(eventName).toBe('first_tap_jugar');
    expect(typeof eventParams).toBe('object');
    expect(eventParams.timestamp).toBeDefined();
  });

  it('captures timestamp close to click time', () => {
    const beforeClick = Date.now();
    renderWithRouter(<JugarButton />);
    fireEvent.click(screen.getByText('¡Jugar!'));
    const afterClick = Date.now();

    const eventPayload = analytics.logEvent.mock.calls[0][1];
    expect(eventPayload.timestamp).toBeGreaterThanOrEqual(beforeClick);
    expect(eventPayload.timestamp).toBeLessThanOrEqual(afterClick);
  });
});
