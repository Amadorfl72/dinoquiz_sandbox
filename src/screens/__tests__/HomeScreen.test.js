import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';

jest.mock('../../services/analytics', () => ({
  logEvent: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

describe('TRIOFSND-52: ¡Jugar! Button Navigation and Event Logging', () => {
  let logEventMock;

  beforeEach(() => {
    jest.clearAllMocks();
    logEventMock = require('../../services/analytics').logEvent;
  });

  it('should render the ¡Jugar! button', () => {
    render(<HomeScreen navigation={mockNavigation} appOpenTime={Date.now()} />);
    expect(screen.getByText('¡Jugar!')).toBeTruthy();
  });

  it('should navigate to the Game screen on press', () => {
    render(<HomeScreen navigation={mockNavigation} appOpenTime={Date.now()} />);
    fireEvent.press(screen.getByText('¡Jugar!'));
    expect(mockNavigate).toHaveBeenCalledWith('Game');
  });

  it('should trigger first_tap_jugar event with timestamp since app_open', () => {
    const appOpenTime = 1000;
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2500);
    
    render(<HomeScreen navigation={mockNavigation} appOpenTime={appOpenTime} />);
    fireEvent.press(screen.getByText('¡Jugar!'));
    
    expect(logEventMock).toHaveBeenCalledWith('first_tap_jugar', { timestamp_since_app_open: 1500 });
  });

  it('should only trigger first_tap_jugar event once', () => {
    render(<HomeScreen navigation={mockNavigation} appOpenTime={Date.now()} />);
    fireEvent.press(screen.getByText('¡Jugar!'));
    fireEvent.press(screen.getByText('¡Jugar!'));
    
    expect(logEventMock).toHaveBeenCalledTimes(1);
  });
});