import React from 'react';
import { render, fireEvent} from '@testing-library/react-native';
import App from '../App';

// Mock AsyncStorage to ensure no state is persisted between sessions
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('TRIOFSND-11: Session State Management', () => {
  it('should discard progress and show the start screen when reopening the app after closing mid-game', () => {
    // --- First Session ---
    // 1. Open the app and verify the start screen is visible
    const firstSession = render(<App />);
    expect(firstSession.getByText('Start Game')).toBeTruthy();

    // 2. Start the game and verify the game is in progress
    fireEvent.press(firstSession.getByText('Start Game'));
    expect(firstSession.getByText('Game in progress')).toBeTruthy();

    // 3. Simulate closing the app mid-game
    firstSession.unmount();

    // --- Second Session ---
    // 4. Reopen the app (create a new instance)
    const secondSession = render(<App />);

    // 5. Verify that progress was discarded and the start screen is shown again
    expect(secondSession.getByText('Start Game')).toBeTruthy();
    expect(secondSession.queryByText('Game in progress')).toBeNull();
  });
});