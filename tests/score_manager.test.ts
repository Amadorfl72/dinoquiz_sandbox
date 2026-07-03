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

  it('should call getBestScore before setBestScore when updating', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(20);
    (setBestScore as jest.Mock).mockResolvedValue(undefined);
    
    await handleScoreUpdate(30);
    
    expect(getBestScore).toHaveBeenCalledTimes(1);
    expect(setBestScore).toHaveBeenCalledTimes(1);
    const getCallOrder = (getBestScore as jest.Mock).mock.invocationCallOrder[0];
    const setCallOrder = (setBestScore as jest.Mock).mock.invocationCallOrder[0];
    expect(getCallOrder).toBeLessThan(setCallOrder);
  });

  it('should trigger UI feedback after setBestScore resolves', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(20);
    (setBestScore as jest.Mock).mockResolvedValue(undefined);
    
    await handleScoreUpdate(30);
    
    const setCallOrder = (setBestScore as jest.Mock).mock.invocationCallOrder[0];
    const feedbackCallOrder = (triggerUIFeedback as jest.Mock).mock.invocationCallOrder[0];
    expect(setCallOrder).toBeLessThan(feedbackCallOrder);
  });

  it('should not update when new score equals 0 and best is 0', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(0);
    
    await handleScoreUpdate(0);
    
    expect(setBestScore).not.toHaveBeenCalled();
    expect(triggerUIFeedback).not.toHaveBeenCalled();
  });

  it('should handle negative scores correctly (negative is lower than 0)', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(0);
    
    await handleScoreUpdate(-1);
    
    expect(setBestScore).not.toHaveBeenCalled();
    expect(triggerUIFeedback).not.toHaveBeenCalled();
  });

  it('should pass the exact new score value to setBestScore and triggerUIFeedback', async () => {
    (getBestScore as jest.Mock).mockResolvedValue(3);
    (setBestScore as jest.Mock).mockResolvedValue(undefined);
    
    await handleScoreUpdate(7);
    
    expect(setBestScore).toHaveBeenCalledWith(7);
    expect(triggerUIFeedback).toHaveBeenCalledWith('newBestScore', { score: 7 });
  });
});
