import ScoreService from '../scoreService';
import logger from '../../utils/logger';
import config from '../../config';

describe('scoreService logging', () => {
  let scoreService;
  const mockStorageService = {
    loadBestScore: jest.fn(),
    saveBestScore: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    scoreService = new ScoreService(mockStorageService);
    logger.info = jest.fn();
  });

  it('logs best_score_updated when a new best score is achieved', async () => {
    mockStorageService.loadBestScore.mockResolvedValue(5);
    await scoreService.initialize();
    
    await scoreService.updateScore(8);
    
    expect(logger.info).toHaveBeenCalledWith('best_score_updated', {
      previous_best: 5,
      new_best: 8,
      app_version: config.appVersion
    });
  });

  it('does not log best_score_updated when the new score is not greater than previous best', async () => {
    mockStorageService.loadBestScore.mockResolvedValue(7);
    await scoreService.initialize();
    
    await scoreService.updateScore(5);
    
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs best_score_updated when previous best is null (first score)', async () => {
    mockStorageService.loadBestScore.mockResolvedValue(null);
    await scoreService.initialize();
    
    await scoreService.updateScore(3);
    
    expect(logger.info).toHaveBeenCalledWith('best_score_updated', {
      previous_best: null,
      new_best: 3,
      app_version: config.appVersion
    });
  });

  it('does not include any PII fields in the best_score_updated log entry', async () => {
    mockStorageService.loadBestScore.mockResolvedValue(null);
    await scoreService.initialize();
    
    await scoreService.updateScore(3);
    
    const logEntry = logger.info.mock.calls[0][1];
    expect(logEntry).not.toHaveProperty('user_id');
    expect(logEntry).not.toHaveProperty('device_id');
    expect(logEntry).not.toHaveProperty('username');
  });

  it('includes the current app_version from config in the log entry', async () => {
    mockStorageService.loadBestScore.mockResolvedValue(null);
    await scoreService.initialize();
    
    await scoreService.updateScore(3);
    
    expect(logger.info).toHaveBeenCalledWith(
      'best_score_updated',
      expect.objectContaining({
        app_version: config.appVersion
      })
    );
  });

  it('emits exactly one structured log per best score update', async () => {
    mockStorageService.loadBestScore.mockResolvedValue(null);
    await scoreService.initialize();
    
    await scoreService.updateScore(3);
    await scoreService.updateScore(5);
    
    expect(logger.info).toHaveBeenCalledTimes(2);
  });
});