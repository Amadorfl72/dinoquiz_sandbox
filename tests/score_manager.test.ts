import { GameScoreManager } from '../src/score_manager';
import { SafeWrapper } from '../src/safe_wrapper';
import { EventBus } from '../src/event_bus';

jest.mock('../src/safe_wrapper');
jest.mock('../src/event_bus');

describe('TRIOFSND-44: Best score comparison and update logic', () => {
  let manager: GameScoreManager;
  let mockSafeWrapper: jest.Mocked<SafeWrapper>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockSafeWrapper = new SafeWrapper() as jest.Mocked<SafeWrapper>;
    mockEventBus = new EventBus() as jest.Mocked<EventBus>;
    manager = new GameScoreManager(mockSafeWrapper, mockEventBus);
  });

  it('should update best score and trigger UI feedback when new score is higher', () => {
    mockSafeWrapper.getBestScore.mockReturnValue(100);
    
    manager.onGameCompletion(150);
    
    expect(mockSafeWrapper.updateBestScore).toHaveBeenCalledTimes(1);
    expect(mockSafeWrapper.updateBestScore).toHaveBeenCalledWith(150);
    expect(mockEventBus.trigger).toHaveBeenCalledTimes(1);
    expect(mockEventBus.trigger).toHaveBeenCalledWith('ui_feedback');
  });

  it('should do nothing when new score is equal to best score', () => {
    mockSafeWrapper.getBestScore.mockReturnValue(100);
    
    manager.onGameCompletion(100);
    
    expect(mockSafeWrapper.updateBestScore).not.toHaveBeenCalled();
    expect(mockEventBus.trigger).not.toHaveBeenCalled();
  });

  it('should do nothing when new score is lower than best score', () => {
    mockSafeWrapper.getBestScore.mockReturnValue(100);
    
    manager.onGameCompletion(50);
    
    expect(mockSafeWrapper.updateBestScore).not.toHaveBeenCalled();
    expect(mockEventBus.trigger).not.toHaveBeenCalled();
  });

  it('should update best score when there is no previous best score (0)', () => {
    mockSafeWrapper.getBestScore.mockReturnValue(0);
    
    manager.onGameCompletion(10);
    
    expect(mockSafeWrapper.updateBestScore).toHaveBeenCalledTimes(1);
    expect(mockSafeWrapper.updateBestScore).toHaveBeenCalledWith(10);
    expect(mockEventBus.trigger).toHaveBeenCalledWith('ui_feedback');
  });
});