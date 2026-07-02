import React, { useEffect, useState } from 'react';
import { handleScoreUpdate } from '../services/scoreService';
import { getBestScore } from '../utils/safeWrapper';

export const ResultsScreen = ({ score }) => {
  const [isNewBestScore, setIsNewBestScore] = useState(false);

  useEffect(() => {
    const checkBestScore = async () => {
      const bestScore = await getBestScore();
      if (score > bestScore) {
        setIsNewBestScore(true);
        await handleScoreUpdate(score);
      }
    };
    
    checkBestScore();
  }, [score]);

  return (
    <div className="results-screen">
      <h2>Your Score: {score}/10</h2>
      {isNewBestScore && <p className="new-best-score">New Best Score! 🎉</p>}
      {/* Rest of the results screen UI */}
    </div>
  );
};