import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFactScreen } from '../../src/screens/FunFactScreen';

describe('TRIOFSND-30: FunFactScreen integration', () => {
  it('renders the screen and triggers fun_fact_viewed log on mount', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const { getByTestId } = render(<FunFactScreen />);

    expect(getByTestId('fun-fact-screen')).toBeTruthy();

    const structuredLogs = logSpy.mock.calls
      .map((call) => call[0])
      .filter((log) => {
        try {
          return JSON.parse(log).event === 'fun_fact_viewed';
        } catch {
          return false;
        }
      });

    expect(structuredLogs).toHaveLength(1);

    logSpy.mockRestore();
  });
});
