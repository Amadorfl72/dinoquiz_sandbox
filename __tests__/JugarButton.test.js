import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {HomeScreen } from '../src/screens/HomeScreen';
import { navigate } from '../src/navigation/NavigationService';
import { logEvent } from '../src/analytics/AnalyticsService';

jest.mock('../src/navigation/NavigationService', () => ({
  navigate: jest.fn(),
}));

jest.mock('../src/analytics/AnalyticsService', () => ({
  logEvent: jest.fn(),
}));

describe('TRIOFSND-52: ¡Jugar! Button Navigation and Event Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate app_open timestamp at render time
    Date.now = jest.fn(() => 1000);
  });

  it('navigates to the game screen when ¡Jugar! is pressed', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);

    expect(navigate).toHaveBeenCalledWith('GameScreen');
  });

  it('triggers first_tap_jugar analytics event with timestamp since app_open', async () => {
    // Simulate 2500ms passing since app_open
    Date.now = jest.fn(() => 3500);

    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);

    await waitFor(() => {
      expect(logEvent).toHaveBeenCalledWith('first_tap_jugar', {
        time_since_app_open_ms: 2500,
      });
    });
  });

  it('only triggers first_tap_jugar once on multiple presses', () => {
    Date.now = jest.fn(() => 2000);
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);
    fireEvent.press(jugarButton);

    expect(logEvent).toHaveBeenCalledTimes(1);
  });
});
