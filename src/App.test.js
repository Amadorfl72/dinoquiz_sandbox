import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { checkOfflineFirstLoad } from './utils/offlineFirstLoad';

jest.mock('./utils/offlineFirstLoad');
jest.mock('./components/OfflineFirstLoadMessage', () => () =>
  React.createElement(
    'div',
    null,
    'Conéctate la primera vez para descargar el juego'
  )
);
jest.mock('./screens/HomeScreen', () => () =>
  React.createElement('div', null, 'HomeScreen')
);

describe('App - TRIOFSND-7', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders OfflineFirstLoadMessage when checkOfflineFirstLoad returns true', () => {
    checkOfflineFirstLoad.mockReturnValue(true);

    render(<App />);

    expect(
      screen.getByText('Conéctate la primera vez para descargar el juego')
    ).toBeInTheDocument();
    expect(screen.queryByText('HomeScreen')).not.toBeInTheDocument();
  });

  it('renders HomeScreen when checkOfflineFirstLoad returns false', () => {
    checkOfflineFirstLoad.mockReturnValue(false);

    render(<App />);

    expect(screen.getByText('HomeScreen')).toBeInTheDocument();
    expect(
      screen.queryByText('Conéctate la primera vez para descargar el juego')
    ).not.toBeInTheDocument();
  });

  it('calls checkOfflineFirstLoad once on mount', () => {
    checkOfflineFirstLoad.mockReturnValue(false);

    render(<App />);

    expect(checkOfflineFirstLoad).toHaveBeenCalledTimes(1);
  });

  it('does not throw technical errors when offline first load is detected', () => {
    checkOfflineFirstLoad.mockReturnValue(true);

    expect(() => render(<App />)).not.toThrow();
  });
});
