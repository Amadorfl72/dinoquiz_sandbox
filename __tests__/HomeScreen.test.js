import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../src/screens/HomeScreen';
import * as analytics from '../src/services/analytics';
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../src/services/analytics', () => ({
  logEvent: jest.fn(),
  getAppOpenTime: jest.fn(),
}));

describe('TRIOFSND-52: Wire ¡Jugar! Button Navigation and Event Logging', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue({ navigate: mockNavigate });
  });

  it('should render the ¡Jugar! button', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('should navigate to the GameScreen when ¡Jugar! is pressed', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');
    fireEvent.press(jugarButton);
    expect(mockNavigate).toHaveBeenCalledWith('GameScreen');
  });

  it('should trigger first_tap_jugar analytics event on press', () => {
    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');
    fireEvent.press(jugarButton);
    expect(analytics.logEvent).toHaveBeenCalledWith('first_tap_jugar', expect.any(Object));
  });

  it('should include timestamp since app_open in the first_tap_jugar event', () => {
    const appOpenTime = 100000;
    const tapTime = 105000;
    const expectedTimestamp = tapTime - appOpenTime;

    analytics.getAppOpenTime.mockReturnValue(appOpenTime);
    
    const realDateNow = Date.now;
    global.Date.now = jest.fn(() => tapTime);

    const { getByText } = render(<HomeScreen />);
    const jugarButton = getByText('¡Jugar!');
    fireEvent.press(jugarButton);

    expect(analytics.logEvent).toHaveBeenCalledWith('first_tap_jugar', {
      timestamp_since_app_open: expectedTimestamp
    });

    global.Date.now = realDateNow;
  });
});