import { renderBestScoreFeedback } from './bestScoreFeedback';

describe('Best Score Feedback (TRIOFSND-33)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders the "¡Nueva mejor puntuación!" message when isNewBest is true', () => {
    renderBestScoreFeedback(container, { isNewBest: true });
    expect(container.textContent).toContain('¡Nueva mejor puntuación!');
  });

  it('renders nothing visible when isNewBest is false', () => {
    renderBestScoreFeedback(container, { isNewBest: false });
    expect(container.textContent).not.toContain('¡Nueva mejor puntuación!');
  });

  it('adds a CSS class that can be used for the mini-feedback animation', () => {
    renderBestScoreFeedback(container, { isNewBest: true });
    const feedbackEl = container.querySelector('[data-testid="best-score-feedback"]');
    expect(feedbackEl).not.toBeNull();
    expect(feedbackEl.classList.contains('mini-feedback')).toBe(true);
  });

  it('auto-dismisses the feedback after a short timeout', () => {
    jest.useFakeTimers();
    renderBestScoreFeedback(container, { isNewBest: true, duration: 2000 });
    expect(container.querySelector('[data-testid="best-score-feedback"]')).not.toBeNull();
    jest.advanceTimersByTime(2000);
    expect(container.querySelector('[data-testid="best-score-feedback"]')).toBeNull();
    jest.useRealTimers();
  });

  it('does not throw if the container is missing', () => {
    expect(() => renderBestScoreFeedback(null, { isNewBest: true })).not.toThrow();
  });
});
