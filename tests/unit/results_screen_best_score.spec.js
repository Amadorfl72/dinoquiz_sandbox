import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/vue';
import { flushPromises } from '@testing-library/vue';
import ResultsScreen from '@/components/ResultsScreen.vue';
import * as scoreRepository from '@/repositories/scoreRepository';

describe('ResultsScreen — TRIOFSND-46: Render current best score', () => {
  const mockFetchBestScore = vi.spyOn(scoreRepository, 'fetchBestScore');

  beforeEach(() => {
    mockFetchBestScore.mockReset();
  });

  it('renders the current score label and value', async () => {
    mockFetchBestScore.mockResolvedValue(80);

    render(ResultsScreen, {
      props: { currentScore: 75 },
    });

    await flushPromises();

    expect(screen.getByText(/your score/i)).toBeTruthy();
    expect(screen.getByText('75')).toBeTruthy();
  });

  it('fetches the persisted best score on mount', async () => {
    mockFetchBestScore.mockResolvedValue(120);

    render(ResultsScreen, {
      props: { currentScore: 50 },
    });

    await flushPromises();

    expect(mockFetchBestScore).toHaveBeenCalledTimes(1);
  });

  it('renders the best score label and value alongside the current score', async () => {
    mockFetchBestScore.mockResolvedValue(120);

    render(ResultsScreen, {
      props: { currentScore: 50 },
    });

    await flushPromises();

    expect(screen.getByText(/best score/i)).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
  });

  it('renders best score as 0 when no persisted best score exists', async () => {
    mockFetchBestScore.mockResolvedValue(null);

    render(ResultsScreen, {
      props: { currentScore: 30 },
    });

    await flushPromises();

    expect(screen.getByText(/best score/i)).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders best score as 0 when repository returns undefined', async () => {
    mockFetchBestScore.mockResolvedValue(undefined);

    render(ResultsScreen, {
      props: { currentScore: 30 },
    });

    await flushPromises();

    expect(screen.getByText('0')).toBeTruthy();
  });

  it('shows a "New Best!" badge when current score exceeds the persisted best score', async () => {
    mockFetchBestScore.mockResolvedValue(60);

    render(ResultsScreen, {
      props: { currentScore: 75 },
    });

    await flushPromises();

    expect(screen.getByText(/new best!/i)).toBeTruthy();
  });

  it('does not show a "New Best!" badge when current score equals the persisted best score', async () => {
    mockFetchBestScore.mockResolvedValue(75);

    render(ResultsScreen, {
      props: { currentScore: 75 },
    });

    await flushPromises();

    expect(screen.queryByText(/new best!/i)).toBeNull();
  });

  it('does not show a "New Best!" badge when current score is below the persisted best score', async () => {
    mockFetchBestScore.mockResolvedValue(100);

    render(ResultsScreen, {
      props: { currentScore: 50 },
    });

    await flushPromises();

    expect(screen.queryByText(/new best!/i)).toBeNull();
  });

  it('shows "New Best!" badge when there was no previous best score and current score > 0', async () => {
    mockFetchBestScore.mockResolvedValue(null);

    render(ResultsScreen, {
      props: { currentScore: 40 },
    });

    await flushPromises();

    expect(screen.getByText(/new best!/i)).toBeTruthy();
  });

  it('does not show "New Best!" badge when there was no previous best and current score is 0', async () => {
    mockFetchBestScore.mockResolvedValue(null);

    render(ResultsScreen, {
      props: { currentScore: 0 },
    });

    await flushPromises();

    expect(screen.queryByText(/new best!/i)).toBeNull();
  });

  it('renders a loading indicator while the best score is being fetched', async () => {
    mockFetchBestScore.mockReturnValue(new Promise(() => {}));

    render(ResultsScreen, {
      props: { currentScore: 50 },
    });

    await flushPromises();

    expect(screen.getByTestId('best-score-loading')).toBeTruthy();
    expect(screen.queryByText(/best score/i)).toBeNull();
  });

  it('renders an error message if fetching the best score fails', async () => {
    mockFetchBestScore.mockRejectedValue(new Error('Network error'));

    render(ResultsScreen, {
      props: { currentScore: 50 },
    });

    await flushPromises();

    expect(screen.getByText(/best score unavailable/i)).toBeTruthy();
  });

  it('still renders the current score even if fetching the best score fails', async () => {
    mockFetchBestScore.mockRejectedValue(new Error('Network error'));

    render(ResultsScreen, {
      props: { currentScore: 50 },
    });

    await flushPromises();

    expect(screen.getByText('50')).toBeTruthy();
  });

  it('updates the best score display when the currentScore prop changes and a new record is set', async () => {
    mockFetchBestScore.mockResolvedValue(50);

    const { rerender } = render(ResultsScreen, {
      props: { currentScore: 50 },
    });

    await flushPromises();

    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.queryByText(/new best!/i)).toBeNull();

    await rerender({ currentScore: 80 });

    await flushPromises();

    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText(/new best!/i)).toBeTruthy();
  });

  it('does not call fetchBestScore more than once on mount', async () => {
    mockFetchBestScore.mockResolvedValue(100);

    render(ResultsScreen, {
      props: { currentScore: 50 },
    });

    await flushPromises();
    await flushPromises();

    expect(mockFetchBestScore).toHaveBeenCalledTimes(1);
  });
});
