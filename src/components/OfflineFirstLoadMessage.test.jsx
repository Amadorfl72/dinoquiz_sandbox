import React from 'react';
import { render, screen } from '@testing-library/react';
import OfflineFirstLoadMessage from './OfflineFirstLoadMessage';
import * as offlineFirstLoadUtils from '../utils/offlineFirstLoad';

describe('OfflineFirstLoadMessage component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the friendly message when it is the first time load and offline', () => {
    jest
      .spyOn(offlineFirstLoadUtils, 'shouldShowOfflineFirstLoadMessage')
      .mockReturnValue(true);

    render(<OfflineFirstLoadMessage />);

    expect(
      screen.getByText('Conéctate la primera vez para descargar el juego')
    ).toBeInTheDocument();
  });

  it('does not render the message when it is not the first time load', () => {
    jest
      .spyOn(offlineFirstLoadUtils, 'shouldShowOfflineFirstLoadMessage')
      .mockReturnValue(false);

    render(<OfflineFirstLoadMessage />);

    expect(
      screen.queryByText('Conéctate la primera vez para descargar el juego')
    ).not.toBeInTheDocument();
  });

  it('does not render any technical error messages', () => {
    jest
      .spyOn(offlineFirstLoadUtils, 'shouldShowOfflineFirstLoadMessage')
      .mockReturnValue(true);

    render(<OfflineFirstLoadMessage />);

    expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Exception/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TypeError/i)).not.toBeInTheDocument();
  });

  it('renders the message with an accessible role for screen readers', () => {
    jest
      .spyOn(offlineFirstLoadUtils, 'shouldShowOfflineFirstLoadMessage')
      .mockReturnValue(true);

    render(<OfflineFirstLoadMessage />);

    const message = screen.getByText(
      'Conéctate la primera vez para descargar el juego'
    );
    expect(message).toHaveAttribute('role', 'alert');
  });

  it('does not crash when the detection utility throws an error', () => {
    jest
      .spyOn(offlineFirstLoadUtils, 'shouldShowOfflineFirstLoadMessage')
      .mockImplementation(() => {
        throw new Error('Unexpected failure');
      });

    expect(() => render(<OfflineFirstLoadMessage />)).not.toThrow();
  });
});
