import { fetchBestScore, saveBestScore } from './bestScoreService';
import * as storage from '../utils/storage';

jest.mock('../utils/storage');

describe('bestScoreService', () => {
  const mockGetItem = storage.getItem as jest.MockedFunction<typeof storage.getItem>;
  const mockSetItem = storage.setItem as jest.MockedFunction<typeof storage.setItem>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchBestScore', () => {
    it('returns the persisted best score from storage', () => {
      mockGetItem.mockReturnValue('150');
      const result = fetchBestScore();
      expect(result).toBe(150);
      expect(mockGetItem).toHaveBeenCalledWith('bestScore');
    });

    it('returns 0 when no best score has been persisted', () => {
      mockGetItem.mockReturnValue(null);
      const result = fetchBestScore();
      expect(result).toBe(0);
    });

    it('returns 0 when stored value is not a valid number', () => {
      mockGetItem.mockReturnValue('not-a-number');
      const result = fetchBestScore();
      expect(result).toBe(0);
    });

    it('returns 0 when stored value is empty string', () => {
      mockGetItem.mockReturnValue('');
      const result = fetchBestScore();
      expect(result).toBe(0);
    });

    it('returns the stored value when it is a valid numeric string', () => {
      mockGetItem.mockReturnValue('42');
      const result = fetchBestScore();
      expect(result).toBe(42);
    });
  });

  describe('saveBestScore', () => {
    it('persists the best score to storage', () => {
      saveBestScore(200);
      expect(mockSetItem).toHaveBeenCalledWith('bestScore', '200');
    });

    it('does not save a score that is lower than the existing best score', () => {
      mockGetItem.mockReturnValue('300');
      saveBestScore(100);
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('saves a new score when it is higher than the existing best score', () => {
      mockGetItem.mockReturnValue('100');
      saveBestScore(250);
      expect(mockSetItem).toHaveBeenCalledWith('bestScore', '250');
    });

    it('saves a new score when no existing best score exists', () => {
      mockGetItem.mockReturnValue(null);
      saveBestScore(50);
      expect(mockSetItem).toHaveBeenCalledWith('bestScore', '50');
    });
  });
});
