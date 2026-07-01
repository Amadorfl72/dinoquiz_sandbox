import { renderHook, act } from '@testing-library/react-hooks';
import { useBestScore } from './useBestScore';
import * as bestScoreService from '../services/bestScoreService';

jest.mock('../services/bestScoreService');

describe('useBestScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with the current best score from storage', () => {
    bestScoreService.getBestScore.mockReturnValue(200);
    const { result } = renderHook(() => useBestScore());

    expect(result.current.bestScore).toBe(200);
    expect(result.current.isNewBest).toBe(false);
  });

  it('initializes with null when no best score exists', () => {
    bestScoreService.getBestScore.mockReturnValue(null);
    const { result } = renderHook(() => useBestScore());

    expect(result.current.bestScore).toBeNull();
    expect(result.current.isNewBest).toBe(false);
  });

  it('updates best score and sets isNewBest to true when score beats the best', () => {
    bestScoreService.getBestScore.mockReturnValue(100);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(true);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    const { result } = renderHook(() => useBestScore());

    act(() => {
      result.current.submitScore(150);
    });

    expect(result.current.bestScore).toBe(150);
    expect(result.current.isNewBest).toBe(true);
    expect(bestScoreService.saveBestScore).toHaveBeenCalledWith(150);
  });

  it('does NOT update best score and keeps isNewBest false on a tie', () => {
    bestScoreService.getBestScore.mockReturnValue(100);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(false);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    const { result } = renderHook(() => useBestScore());

    act(() => {
      result.current.submitScore(100);
    });

    expect(result.current.bestScore).toBe(100);
    expect(result.current.isNewBest).toBe(false);
    expect(bestScoreService.saveBestScore).not.toHaveBeenCalled();
  });

  it('does NOT update best score and keeps isNewBest false when score is lower', () => {
    bestScoreService.getBestScore.mockReturnValue(100);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(false);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    const { result } = renderHook(() => useBestScore());

    act(() => {
      result.current.submitScore(50);
    });

    expect(result.current.bestScore).toBe(100);
    expect(result.current.isNewBest).toBe(false);
    expect(bestScoreService.saveBestScore).not.toHaveBeenCalled();
  });

  it('sets an error and does not set isNewBest when saveBestScore throws', () => {
    bestScoreService.getBestScore.mockReturnValue(50);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(true);
    bestScoreService.saveBestScore.mockImplementation(() => {
      throw new Error('storage error');
    });

    const { result } = renderHook(() => useBestScore());

    act(() => {
      result.current.submitScore(100);
    });

    expect(result.current.bestScore).toBe(50);
    expect(result.current.isNewBest).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toMatch(/storage error/);
  });

  it('resets isNewBest when resetNewBest is called', () => {
    bestScoreService.getBestScore.mockReturnValue(50);
    bestScoreService.shouldUpdateBestScore.mockReturnValue(true);
    bestScoreService.saveBestScore.mockImplementation(() => {});

    const { result } = renderHook(() => useBestScore());

    act(() => {
      result.current.submitScore(100);
    });
    expect(result.current.isNewBest).toBe(true);

    act(() => {
      result.current.resetNewBest();
    });
    expect(result.current.isNewBest).toBe(false);
  });
});