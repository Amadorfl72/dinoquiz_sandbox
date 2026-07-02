import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../src/App';

describe('App', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<App />);
    expect(getByText('DinoQuiz')).toBeTruthy();
  });

  it('renders the StartScreen with play button', () => {
    const { getByText } = render(<App />);
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('renders within 3 seconds', () => {
    const startTime = Date.now();
    render(<App />);
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(3000);
  });
});
