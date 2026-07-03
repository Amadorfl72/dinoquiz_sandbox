import React from 'react';
import { render } from '@testing-library/react-native';
import App from './App';

// Fix TRIOFSND-5: mock the dinosaur image asset imported transitively via
// StartScreen so the App tests do not fail with
// "Cannot find module '../assets/dinosaur.png'."
jest.mock('./assets/dinosaur.png', () => 'dinosaur.png');
jest.mock('./components/assets/dinosaur.png', () => 'dinosaur.png');
jest.mock('../assets/dinosaur.png', () => 'dinosaur.png');

jest.mock('./utils/offlineFirstLoad', () => ({
  checkOfflineFirstLoad: jest.fn(() => false),
}));

jest.mock('./services/sessionService', () => ({
  resetGame: jest.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<App />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the StartScreen with play button', () => {
    const { getByTestId, getByText } = render(<App />);
    expect(getByTestId('StartScreen')).toBeTruthy();
    expect(getByTestId('play-button')).toBeTruthy();
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('renders within 3 seconds', () => {
    const start = Date.now();
    render(<App />);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });
});
