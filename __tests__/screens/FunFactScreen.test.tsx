import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFactScreen } from '../../src/screens/FunFactScreen';

describe('TRIOFSND-19: Fun Fact Screen (reached via incorrect answer)', () => {
  const mockRoute = {
    params: {
      funFact: 'Paris has been the capital of France since 987 AD.',
      wasCorrect: false,
    },
  };

  it('renders the fun fact content', () => {
    const { getByTestId } = render(<FunFactScreen route={mockRoute} />);
    const funFactText = getByTestId('fun-fact-text');
    expect(funFactText).toBeTruthy();
    expect(funFactText.props.children).toContain('Paris has been the capital');
  });

  it('does not show a score deduction indicator when arrived from incorrect answer', () => {
    const { queryByTestId } = render(<FunFactScreen route={mockRoute} />);
    expect(queryByTestId('score-deduction-indicator')).toBeNull();
  });

  it('displays a continue button to proceed', () => {
    const { getByTestId } = render(<FunFactScreen route={mockRoute} />);
    expect(getByTestId('continue-button')).toBeTruthy();
  });
});
