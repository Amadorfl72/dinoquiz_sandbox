import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReplayButton from '../ReplayButton';
import { Telemetry } from '../../analytics/telemetry';

describe('TRIOFSND-41: ReplayButton telemetría', () => {
  let logReplayClickedSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    logReplayClickedSpy = jest.spyOn(Telemetry, 'logReplayClicked').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe renderizar el botón con el texto "Volver a jugar"', () => {
    render(<ReplayButton score={0} onClick={() => {}} />);
    expect(screen.getByText('Volver a jugar')).toBeInTheDocument();
  });

  it('debe tener aria-label "Volver a jugar"', () => {
    render(<ReplayButton score={0} onClick={() => {}} />);
    expect(screen.getByLabelText('Volver a jugar')).toBeInTheDocument();
  });

  it('debe llamar a Telemetry.logReplayClicked con el score al hacer click', () => {
    const score = 1500;
    render(<ReplayButton score={score} onClick={() => {}} />);
    fireEvent.click(screen.getByText('Volver a jugar'));

    expect(logReplayClickedSpy).toHaveBeenCalledTimes(1);
    expect(logReplayClickedSpy).toHaveBeenCalledWith(score);
  });

  it('debe llamar a onClick después de registrar la telemetría', () => {
    const onClick = jest.fn();
    render(<ReplayButton score={100} onClick={onClick} />);
    fireEvent.click(screen.getByText('Volver a jugar'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('debe registrar la telemetría antes de invocar onClick', () => {
    const callOrder = [];
    logReplayClickedSpy.mockRestore();
    jest.spyOn(Telemetry, 'logReplayClicked').mockImplementation(() => {
      callOrder.push('telemetry');
    });
    const onClick = jest.fn(() => callOrder.push('onClick'));

    render(<ReplayButton score={200} onClick={onClick} />);
    fireEvent.click(screen.getByText('Volver a jugar'));

    expect(callOrder).toEqual(['telemetry', 'onClick']);
  });

  it('debe pasar el score correctamente incluso cuando es 0', () => {
    render(<ReplayButton score={0} onClick={() => {}} />);
    fireEvent.click(screen.getByText('Volver a jugar'));

    expect(logReplayClickedSpy).toHaveBeenCalledWith(0);
  });
});
