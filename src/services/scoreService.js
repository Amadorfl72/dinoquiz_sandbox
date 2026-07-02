import { getBestScore, setBestScore } from '../utils/safeWrapper';
import { triggerUIFeedback } from '../utils/uiFeedback';

export const handleScoreUpdate = async (newScore) => {
  try {
    const bestScore = await getBestScore();
    
    if (newScore > bestScore) {
      await setBestScore(newScore);
      triggerUIFeedback('newBestScore', { score: newScore });
    }
  } catch (error) {
    console.error('Error handling score update:', error);
  }
};