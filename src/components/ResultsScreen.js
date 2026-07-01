import React, { useEffect } from 'react';
import { logGameCompleted } from '../utils/logging';

const ResultsScreen = ({ score, gameStartTime }) => {
  useEffect(() => {
    const durationMs = Date.now() - gameStartTime;
    logGameCompleted(score, durationMs);
  }, [score, gameStartTime]);

  return (
    <div className="results-screen">
      {/* Existing results screen implementation */}
    </div>
  );
};

export default ResultsScreen;