import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFact } from '../src/components/FunFact';

describe('FunFact Snapshot', () => {
  const defaultProps = {
    fact: 'The Stegosaurus had plates on its back!',
    imageSource: { uri: 'https://example.com/stego.png' },
    onNext: jest.fn(),
  };

  it('matches the snapshot', () => {
    const { toJSON } = render(<FunFact {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot when loading', () => {
    const { toJSON } = render(<FunFact {...defaultProps} loading={true} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
