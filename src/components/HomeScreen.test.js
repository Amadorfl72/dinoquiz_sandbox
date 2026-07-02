import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import { trackEvent } from '../utils/analytics';
import { useNavigation } from '@react-navigation/native';

jest.mock('../utils/analytics');
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('HomeScreen - ¡Jugar! Button Navigation and Event Logging', () => {
  const mockNavigate = jest.fn();
  const mockTrackEvent = trackEvent;

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue({ navigate: mockNavigate });
  });

  it('navigates to the GameScreen when ¡Jugar! button is pressed', () => {
    render(<HomeScreen />);
    const jugarButton = screen.getByText('¡Jugar!');
    
    act(() => {
      fireEvent.press(jugarButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('GameScreen');
  });

  it('triggers first_tap_jugar analytics event with timestamp since app_open', () => {
    const appOpenTimestamp = Date.now() - 10000; // 10 seconds ago
    render(<HomeScreen appOpenTimestamp={appOpenTimestamp} />);
    const jugarButton = screen.getByText('¡Jugar!');
    
    act(() => {
      fireEvent.press(jugarButton);
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith('first_tap_jugar', expect.objectContaining({
      timestamp: expect.any(Number)
    }));

    const eventPayload = mockTrackEvent.mock.calls[0][1];
    expect(eventPayload.timestamp).toBeGreaterThanOrEqual(9000);
    expect(eventPayload.timestamp).toBeLessThanOrEqual(11000);
  });
});