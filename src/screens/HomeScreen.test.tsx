import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';

// Mock navigation service
jest.mock('../navigation/navigationService', () => ({
  navigate: jest.fn(),
}));

// Mock analytics service
jest.mock('../analytics/analyticsService', () => ({
  logEvent: jest.fn(),
}));

// Mock app state to control app_open timestamp
jest.mock('../state/appState', () => ({
  getAppOpenTimestamp: jest.fn(() => 1000),
}));

import { navigate } from '../navigation/navigationService';
import { logEvent } from '../analytics/analyticsService';
import { getAppOpenTimestamp } from '../state/appState';

describe('HomeScreen - ¡Jugar! Button Navigation and Event Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current time to calculate time_since_app_open deterministically
    jest.spyOn(Date, 'now').mockReturnValue(5000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates to the GameScreen when the ¡Jugar! button is pressed', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('GameScreen');
  });

  it('triggers the first_tap_jugar analytics event with the correct timestamp since app_open', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);

    // Date.now() is 5000, getAppOpenTimestamp() is 1000. Difference is 4000.
    const expectedTimestamp = 5000 - 1000;
    
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith('first_tap_jugar', {
      time_since_app_open: expectedTimestamp,
    });
  });

  it('only triggers the first_tap_jugar event once even if pressed multiple times', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);
    fireEvent.press(jugarButton);
    fireEvent.press(jugarButton);

    expect(logEvent).toHaveBeenCalledTimes(1);
  });

  it('still navigates to the GameScreen on subsequent presses', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);
    fireEvent.press(jugarButton);

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, 'GameScreen');
    expect(navigate).toHaveBeenNthCalledWith(2, 'GameScreen');
  });
});
