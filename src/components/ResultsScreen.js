import React, { useState, useEffect } from 'react';
import { isNewBestScore, setBestScore, getBestScore } from '../utils/score';
import { strings } from '../strings';
import { logGameCompleted } from '../logging';

const ResultsScreen = ({ score, durationMs, appVersion, onRestart }) => {
  const [showNewBestFeedback, setShowNewBestFeedback] = useState(false);

  useEffect(() => {
    logGameCompleted(score, durationMs, appVersion);
  }, [score, durationMs, appVersion]);

  useEffect(() => {
    if (isNewBestScore(score)) {
      try {
        setBestScore(score);
        setShowNewBestFeedback(true);

        // Hide feedback after 3 seconds
        const timer = setTimeout(() => setShowNewBestFeedback(false), 3000);
        return () => clearTimeout(timer);
      } catch (error) {
        console.warn('Failed to persist best score:', error);
      }
    }
  }, [score]);

  return (
    <div className="results-screen">
      <h2>{strings.resultsTitle}</h2>
      <p>{strings.resultsScore.replace('{score}', score)}</p>
      <p className="best-score">Tu mejor puntuación: {getBestScore()}</p>

      {showNewBestFeedback && (
        <div className="new-best-feedback">
          {strings.newBestScore}
        </div>
      )}

      <button
        className="play-again-button"
        onClick={onRestart}
        aria-label={strings.playAgain}
      >
        {strings.playAgain}
      </button>
    </div>
  );
};

export default ResultsScreen;
