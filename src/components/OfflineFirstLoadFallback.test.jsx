import React from 'react';
import { render } from '@testing-library/react-native';
import OfflineFirstLoadMessage from './OfflineFirstLoadMessage';

describe('OfflineFirstLoadMessage - TRIOFSND-7', () => {
  it('displays the friendly message when rendered', () => {
    const { getByText } = render(<OfflineFirstLoadMessage />);
    expect(
      getByText('Conéctate la primera vez para descargar el juego')
    ).toBeTruthy();
  });

  it('does not throw technical errors when rendered', () => {
    expect(() => render(<OfflineFirstLoadMessage />)).not.toThrow();
  });

  it('renders exactly one message node', () => {
    const { getAllByText } = render(<OfflineFirstLoadMessage />);
    expect(
      getAllByText('Conéctate la primera vez para descargar el juego').length
    ).toBe(1);
  });
});
