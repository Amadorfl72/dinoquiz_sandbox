import React from 'react';
import { render } from '@testing-library/react-native';
import FunFactScreen from '../../src/screens/FunFactScreen';
import { logFunFactViewed } from '../../src/services/analyticsLogger';

jest.mock('../../src/services/analyticsLogger');

describe('TRIOFSND-30: FunFactScreen integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen and triggers fun_fact_viewed log on mount', () => {
    render(<FunFactScreen fact="Dinosaurs are cool!" questionId="q1" dinoId="trex" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    expect(logFunFactViewed).toHaveBeenCalledWith('q1', 'trex');
  });

  it('emits fun_fact_viewed exactly once even if component re-renders', () => {
    const { rerender } = render(
      <FunFactScreen fact="Fact 1" questionId="q1" dinoId="stego" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    rerender(<FunFactScreen fact="Fact 1 updated" questionId="q1" dinoId="stego" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });

  it('does not emit fun_fact_viewed when component is unmounted', () => {
    const { unmount } = render(
      <FunFactScreen fact="Fact" questionId="q4" dinoId="triceratops" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    unmount();
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });
});