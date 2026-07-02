import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import JugarButton from './JugarButton';
import { analytics } from '../../services/analytics';
import { navigationRef } from '../../services/navigation';
import * as TimeUtils from '../../utils/time';

jest.mock('../../services/analytics', () => ({
  analytics: {
    logEvent: jest.fn(),
  },
}));

jest.mock('../../services/navigation', () => ({
  navigationRef: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../utils/time', () => ({
  msSinceAppOpen: jest.fn(),
}));

const Stack = createNativeStackNavigator();

const renderWithNavigation = (ui) =>
  render(<NavigationContainer>{ui}</NavigationContainer>);

describe('TRIOFSND-52: JugarButton navigation and event logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    TimeUtils.msSinceAppOpen.mockReturnValue(12345);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the ¡Jugar! button with accessible label', () => {
    renderWithNavigation(<JugarButton />);
    expect(screen.getByText('¡Jugar!')).toBeTruthy();
    expect(screen.getByLabelText('¡Jugar!')).toBeTruthy();
  });

  it('navigates to the game screen when the button is pressed', () => {
    renderWithNavigation(<JugarButton />);
    fireEvent.press(screen.getByText('¡Jugar!'));
    expect(navigationRef.navigate).toHaveBeenCalledWith('Game', undefined);
    expect(navigationRef.navigate).toHaveBeenCalledTimes(1);
  });

  it('triggers the first_tap_jugar analytics event on press', () => {
    renderWithNavigation(<JugarButton />);
    fireEvent.press(screen.getByText('¡Jugar!'));
    expect(analytics.logEvent).toHaveBeenCalledWith('first_tap_jugar', {
      time_since_app_open_ms: 12345,
    });
    expect(analytics.logEvent).toHaveBeenCalledTimes(1);
  });

  it('logs the event before navigating to the game screen', () => {
    const logOrder = [];
    analytics.logEvent.mockImplementation(() => logOrder.push('log'));
    navigationRef.navigate.mockImplementation(() => logOrder.push('navigate'));

    renderWithNavigation(<JugarButton />);
    fireEvent.press(screen.getByText('¡Jugar!'));

    expect(logOrder).toEqual(['log', 'navigate']);
  });

  it('uses the current timestamp since app_open for the event', () => {
    TimeUtils.msSinceAppOpen.mockReturnValue(999);
    renderWithNavigation(<JugarButton />);
    fireEvent.press(screen.getByText('¡Jugar!'));
    expect(analytics.logEvent).toHaveBeenCalledWith('first_tap_jugar', {
      time_since_app_open_ms: 999,
    });
  });

  it('does not navigate or log when the button is disabled', () => {
    renderWithNavigation(<JugarButton disabled />);
    fireEvent.press(screen.getByText('¡Jugar!'));
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    expect(analytics.logEvent).not.toHaveBeenCalled();
  });

  it('logs the event only once even if pressed multiple times', () => {
    renderWithNavigation(<JugarButton />);
    const button = screen.getByText('¡Jugar!');
    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(button);
    expect(analytics.logEvent).toHaveBeenCalledTimes(1);
    expect(navigationRef.navigate).toHaveBeenCalledTimes(3);
  });

  it('still navigates if analytics logging throws an error', () => {
    analytics.logEvent.mockImplementation(() => {
      throw new Error('analytics failure');
    });
    renderWithNavigation(<JugarButton />);
    act(() => {
      fireEvent.press(screen.getByText('¡Jugar!'));
    });
    expect(navigationRef.navigate).toHaveBeenCalledWith('Game', undefined);
  });

  it('validates event parameters before logging', () => {
    const invalidParams = { malicious: { code: 'alert(1)' } };
    analytics.logEvent.mockImplementation(() => {
      throw new Error('Invalid parameters');
    });
    renderWithNavigation(<JugarButton />);
    expect(() => {
      fireEvent.press(screen.getByText('¡Jugar!'));
    }).not.toThrow();
  });
});