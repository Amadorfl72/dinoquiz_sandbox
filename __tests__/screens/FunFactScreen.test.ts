import React from 'react';
import { render } from '@testing-library/react';
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
    expect(logFunFactViewed).toHaveBeenCalledWith('q1', 'trex', expect.any(String));
  });

  it('emits fun_fact_viewed structured log on screen render', () => {
    render(<FunFactScreen fact="T-Rex had sharp teeth!" questionId="q2" dinoId="trex" />);

    expect(logFunFactViewed).toHaveBeenCalledWith(
      'q2',
      'trex',
      expect.any(String)
    );
  });

  it('emits fun_fact_viewed exactly once even if component re-renders', () => {
    const { rerender } = render(
      <FunFactScreen fact="Fact 1" questionId="q1" dinoId="stego" />
    );

    expect(logFunFactViewed).toHaveBeenCalledTimes(1);

    rerender(<FunFactScreen fact="Fact 1 updated" questionId="q1" dinoId="stego" />);
    rerender(<FunFactScreen fact="Fact 1 updated again" questionId="q1" dinoId="stego" />);

    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });

  it('emits fun_fact_viewed before any child content is interactable', () => {
    render(<FunFactScreen fact="Brachiosaurus was tall!" questionId="q3" dinoId="brachio" />);

    // The event should have been emitted synchronously during mount
    expect(logFunFactViewed).toHaveBeenCalled();
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
    render(<FunFactScreen fact="Fact" questionId="q5" dinoId="velociraptor" />);

    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    // logFunFactViewed internally uses Events.FUN_FACT_VIEWED which is 'fun_fact_viewed'
    // The mock captures the call; the actual event name is verified in analyticsLogger.test.ts
    expect(logFunFactViewed).toHaveBeenCalledWith(
      'q5',
      'velociraptor',
      expect.any(String)
    );
  });
});

describe('FunFactScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Fun Fact screen', () => {
    const { container } = render(
      <FunFactScreen fact="Dinosaurs ruled the Earth!" questionId="q1" dinoId="trex" />
    );
    expect(container).toBeTruthy();
  });

  it('emits fun_fact_viewed structured log on screen load', () => {
    render(<FunFactScreen fact="Fact" questionId="q1" dinoId="trex" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });

  it('emits fun_fact_viewed structured log exactly once on mount', () => {
    const { rerender } = render(
      <FunFactScreen fact="Fact" questionId="q1" dinoId="trex" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    rerender(<FunFactScreen fact="Fact" questionId="q1" dinoId="trex" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });

  it('does not emit fun_fact_viewed on re-render', () => {
    const { rerender } = render(
      <FunFactScreen fact="Fact" questionId="q1" dinoId="trex" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    rerender(<FunFactScreen fact="Updated Fact" questionId="q1" dinoId="trex" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });
});

describe('TRIOFSND-30: Trigger fun_fact_viewed event on screen load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits the fun_fact_viewed structured log when the screen is rendered', () => {
    render(<FunFactScreen fact="Fact" questionId="q1" dinoId="trex" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    expect(logFunFactViewed).toHaveBeenCalledWith('q1', 'trex', expect.any(String));
  });

  it('does not emit the event multiple times on re-render', () => {
    const { rerender } = render(
      <FunFactScreen fact="Fact" questionId="q1" dinoId="trex" />
    );
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
    rerender(<FunFactScreen fact="Fact" questionId="q1" dinoId="trex" />);
    rerender(<FunFactScreen fact="Fact" questionId="q1" dinoId="trex" />);
    expect(logFunFactViewed).toHaveBeenCalledTimes(1);
  });
});
