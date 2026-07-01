import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { flushPromises } from '@testing-library/vue';
import GameView from '@/views/GameView.vue';
import * as scoreRepository from '@/repositories/scoreRepository';

describe('TRIOFSND-46: Best score on results screen — integration', () => {
  const mockFetchBestScore = vi.spyOn(scoreRepository, 'fetchBestScore');
  const mockSaveBestScore = vi.spyOn(scoreRepository, 'saveBestScore');

  beforeEach(() => {
    mockFetchBestScore.mockReset();
    mockSaveBestScore.mockReset();
    mockSaveBestScore.mockResolvedValue(undefined);
  });

  it('shows best score alongside current score after game completion', async () => {
    mockFetchBestScore.mockResolvedValue(90);

    const { container } = render(GameView);

    // Simulate game completion
    await fireEvent.click(screen.getByTestId('finish-game-button'));
    await flushPromises();

    expect(screen.getByText(/your score/i)).toBeTruthy();
    expect(screen.getByText(/best score/i)).toBeTruthy();
    expect(screen.getByText('90')).toBeTruthy();
  });

  it('persists a new best score and displays it when the child beats their record', async () => {
    mockFetchBestScore.mockResolvedValue(40);

    render(GameView);

    await fireEvent.click(screen.getByTestId('finish-game-button'));
    await flushPromises();

    // The current score in the test game state is 60, which beats 40
    expect(mockSaveBestScore).toHaveBeenCalledWith(60);
    expect(screen.getByText(/new best!/i)).toBeTruthy();
    expect(screen.getByText('60')).toBeTruthy();
  });

  it('does not persist a new best score when the child does not beat their record', async () => {
    mockFetchBestScore.mockResolvedValue(200);

    render(GameView);

    await fireEvent.click(screen.getByTestId('finish-game-button'));
    await flushPromises();

    expect(mockSaveBestScore).not.toHaveBeenCalled();
    expect(screen.queryByText(/new best!/i)).toBeNull();
  });

  it('displays the persisted best score from a previous session on the results screen', async () => {
    mockFetchBestScore.mockResolvedValue(150);

    render(GameView);

    await fireEvent.click(screen.getByTestId('finish-game-button'));
    await flushPromises();

    const bestScoreElements = screen.getAllByText('150');
    expect(bestScoreElements.length).toBeGreaterThan(0);
  });

  it('handles gracefully when the persistence layer is unavailable', async () => {
    mockFetchBestScore.mockRejectedValue(new Error('Storage unavailable'));

    render(GameView);

    await fireEvent.click(screen.getByTestId('finish-game-button'));
    await flushPromises();

    expect(screen.getByText(/best score unavailable/i)).toBeTruthy();
    // Current score should still render
    expect(screen.getByText(/your score/i)).toBeTruthy();
  });
});
