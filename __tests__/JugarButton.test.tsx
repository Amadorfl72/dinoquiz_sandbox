import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../src/screens/HomeScreen';
import { useNavigation } from '@react-navigation/native';
import { logEvent } from '../src/analytics';
import { getAppOpenTime } from '../src/appTiming';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../src/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('../src/appTiming', () => ({
  getAppOpenTime: jest.fn(),
}));

describe('TRIOFSND-52: ¡Jugar! Button Navigation and Event Logging', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    // Simulate app opened 5 seconds ago
    (getAppOpenTime as jest.Mock).mockReturnValue(Date.now() - 5000);
  });

  it('navigates to the game screen when ¡Jugar! is pressed', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);

    expect(mockNavigate).toHaveBeenCalledWith('Game');
  });

  it('logs the first_tap_jugar analytics event with timestamp since app_open', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);

    expect(logEvent).toHaveBeenCalledWith('first_tap_jugar', expect.any(Number));
    
    const loggedTimestamp = (logEvent as jest.Mock).mock.calls[0][1];
    // The timestamp should be roughly the time elapsed since app open (around 5000ms)
    expect(loggedTimestamp).toBeGreaterThanOrEqual(5000);
    expect(loggedTimestamp).toBeLessThan(6000);
  });

  it('only logs the first_tap_jugar event once on multiple taps', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');

    fireEvent.press(jugarButton);
    fireEvent.press(jugarButton);
    fireEvent.press(jugarButton);

    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(3);
  });
});