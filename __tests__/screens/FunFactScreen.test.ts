import React from 'react';
import { render } from '@testing-library/react-native';
import FunFactScreen from '../../src/screens/FunFactScreen';
import { logFunFactViewed } from '../../src/analytics/logger';

jest.mock('../../src/analytics/logger');

describe('TRIOFSND-30: FunFactScreen integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen and triggers fun_fact_viewed log on mount', () => {
    render(<FunFactScreen fact="Dinosaurs are cool!" questionId="q1" dinoId="trex" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    expect(logFunFactViewed).toHaveBeenCalledWith('q1', 'trex');
  });

  it('emits fun_fact_viewed structured log on screen render', () => {
    render(<FunFactScreen fact="Dinosaurs are cool!" questionId="q1" dinoId="trex" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });

  it('emits fun_fact_viewed exactly once even if component re-renders', () => {
    const { rerender } = render(
      <FunFactScreen fact="Fact 1" questionId="q1" dinoId="stego" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    rerender(<FunFactScreen fact="Fact 1 updated" questionId="q1" dinoId="stego" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });

  it('emits fun_fact_viewed before any child content is interactable', () => {
    const { getByText } = render(
      <FunFactScreen fact="Fact text" questionId="q5" dinoId="velociraptor" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    expect(getByText('Fact text')).toBeTruthy();
  });

  it('does not emit fun_fact_viewed when component is unmounted', () => {
    const { unmount } = render(
      <FunFactScreen fact="Fact" questionId="q4" dinoId="triceratops" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    unmount();
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });

  it('emits fun_fact_viewed with correct event name string', () => {
    render(<FunFactScreen fact="Fact" questionId="q6" dinoId="diplodocus" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    expect(logFunFactViewed).toHaveBeenCalledWith('q6', 'diplodocus');
  });
});

describe('FunFactScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Fun Fact screen', () => {
    const { getByText } = render(
      <FunFactScreen fact="T-Rex had tiny arms!" questionId="q1" dinoId="trex" />
    );
    expect(getByText('T-Rex had tiny arms!')).toBeTruthy();
  });

  it('emits fun_fact_viewed structured log on screen load', () => {
    render(<FunFactScreen fact="Fact" questionId="q2" dinoId="stego" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    expect(logFunFactViewed).toHaveBeenCalledWith('q2', 'stego');
  });

  it('emits fun_fact_viewed structured log exactly once on mount', () => {
    render(<FunFactScreen fact="Fact" questionId="q3" dinoId="brachio" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });

  it('does not emit fun_fact_viewed on re-render', () => {
    const { rerender } = render(
      <FunFactScreen fact="Fact" questionId="q3" dinoId="brachio" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    rerender(<FunFactScreen fact="Fact updated" questionId="q3" dinoId="brachio" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });
});

describe('TRIOFSND-30: Trigger fun_fact_viewed event on screen load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits the fun_fact_viewed structured log when the screen is rendered', () => {
    render(<FunFactScreen fact="Fact" questionId="q7" dinoId="anky" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    expect(logFunFactViewed).toHaveBeenCalledWith('q7', 'anky');
  });

  it('does not emit the event multiple times on re-render', () => {
    const { rerender } = render(
      <FunFactScreen fact="Fact" questionId="q8" dinoId="spino" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    rerender(<FunFactScreen fact="Fact v2" questionId="q8" dinoId="spino" />);
    rerender(<FunFactScreen fact="Fact v3" questionId="q8" dinoId="spino" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });
});
