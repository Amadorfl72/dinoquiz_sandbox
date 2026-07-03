import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ReplayButton from '../src/components/ReplayButton';
import * as telemetry from '../src/analytics/telemetry';

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the replay button with accessible label', () => {
    const { getByLabelText } = render(<ReplayButton onClick={jest.fn()} />);
    expect(getByLabelText('Volver a jugar')).toBeTruthy();
  });

  it('calls trackReplay telemetry when clicked', () => {
    const trackReplaySpy = jest.spyOn(telemetry, 'trackReplay');
    const onClick = jest.fn();
    const { getByText } = render(<ReplayButton onClick={onClick} />);

    fireEvent.click(getByText('Volver a jugar'));

    expect(trackReplaySpy).toHaveBeenCalledTimes(1);
  });

  it('calls the provided onClick handler after tracking replay', () => {
    jest.spyOn(telemetry, 'trackReplay');
    const onClick = jest.fn();
    const { getByText } = render(<ReplayButton onClick={onClick} />);

    fireEvent.click(getByText('Volver a jugar'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('logs the replay telemetry event to console', () => {
    const onClick = jest.fn();
    const { getByText } = render(<ReplayButton onClick={onClick} />);

    fireEvent.click(getByText('Volver a jugar'));

    expect(console.log).toHaveBeenCalledWith('Telemetry: replay event tracked');
  });

  it('tracks telemetry exactly once per click', () => {
    const trackReplaySpy = jest.spyOn(telemetry, 'trackReplay');
    const onClick = jest.fn();
    const { getByText } = render(<ReplayButton onClick={onClick} />);

    fireEvent.click(getByText('Volver a jugar'));
    fireEvent.click(getByText('Volver a jugar'));

    expect(trackReplaySpy).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
