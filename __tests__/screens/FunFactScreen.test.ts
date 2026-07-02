import React from 'react';
import { render } from '@testing-library/react';
import FunFactScreen from '../../src/screens/FunFactScreen';
import analyticsLogger from '../../src/services/analyticsLogger';

jest.mock('../../src/services/analyticsLogger');

describe('FunFactScreen', () => {
  it('should emit fun_fact_viewed event on mount', () => {
    const logEventSpy = jest.spyOn(analyticsLogger, 'logEvent');
    render(<FunFactScreen />);
    expect(logEventSpy).toHaveBeenCalledWith('fun_fact_viewed', {});
  });
});