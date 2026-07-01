import React from 'react';
import { compareScores, updateBestScore } from '../utils/scoreUtils';
import { saveBestScore } from '../utils/storage';

const ResultsScreen = ({ currentScore, bestScore }) => {
  const newBestScore = updateBestScore(currentScore, bestScore);
  
  React.useEffect(() => {
    if (compareScores(currentScore, bestScore)) {
      saveBestScore(currentScore);
    }
  }, [currentScore, bestScore]);

  return (
    <div className="results-screen">
      <h2>Your Score: {currentScore}/10</h2>
      <h3>Best Score: {newBestScore}/10</h3>
      {/* Rest of the results screen UI */}
    </div>
  );
};

export default ResultsScreen;
