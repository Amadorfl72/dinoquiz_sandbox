import { handleScoreUpdate } from '../src/services/scoreService';
import { getBestScore, setBestScore } from '../src/utils/safeWrapper';
import { triggerUIFeedback } from '../src/utils/uiFeedback';

jest.mock('../src/utils/safeWrapper');
jest.mock('../src/utils/uiFeedback');

describe('TRIOFSND-44: Best score comparison and update logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update best score and trigger UI feedback when new score is higher', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(100);
    
    await handleScoreUpdate(150);
    
    expect(setBestScore).toHaveBeenCalledTimes(1);
    expect(setBestScore).toHaveBeenCalledWith(150);
    expect(triggerUIFeedback).toHaveBeenCalledTimes(1);
    expect(triggerUIFeedback).toHaveBeenCalledWith('newBestScore', { score: 150 });
  });

  it('should do nothing when new score is equal to best score', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(100);
    
    await handleScoreUpdate(100);
    
    expect(setBestScore).not.toHaveBeenCalled();
    expect(triggerUIFeedback).not.toHaveBeenCalled();
  });

  it('should do nothing when new score is lower than best score', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(100);
    
    await handleScoreUpdate(50);
    
    expect(setBestScore).not.toHaveBeenCalled();
    expect(triggerUIFeedback).not.toHaveBeenCalled();
  });

  it('should update best score when there is no previous best score (0)', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(0);
    
    await handleScoreUpdate(10);
    
    expect(setBestScore).toHaveBeenCalledTimes(1);
    expect(setBestScore).toHaveBeenCalledWith(10);
    expect(triggerUIFeedback).toHaveBeenCalledWith('newBestScore', { score: 10 });
  });

  it('should not call setBestScore or triggerUIFeedback when getBestScore throws', async () => {
    (getBestScore as jest.Mock).mockRejectedValue(new Error('Storage error'));
    
    await handleScoreUpdate(150);
    
    expect(setBestScore).not.toHaveBeenCalled();
    expect(triggerUIFeedback).not.toHaveBeenCalled();
  });

  it('should not trigger UI feedback if setBestScore throws after comparison passes', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(50);
    (setBestScore as jest.Mock).mockRejectedValue(new Error('Write error'));
    
    await handleScoreUpdate(150);
    
    expect(setBestScore).toHaveBeenCalledTimes(1);
    expect(setBestScore).toHaveBeenCalledWith(150);
    expect(triggerUIFeedback).not.toHaveBeenCalled();
  });
});
