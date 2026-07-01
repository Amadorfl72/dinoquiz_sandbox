import React, { useEffect } from 'react';
import { logGameCompleted } from '../logging/gameCompleted';
import { getAppVersion } from '../utils/appInfo';

const ResultsScreen = ({ score, gameStartTime }) => {
  useEffect(() => {
    const durationMs = Date.now() - gameStartTime;
    logGameCompleted({
      score,
      duration_ms: durationMs,
      app_version: getAppVersion()
    });
  }, [score, gameStartTime]);

  return (
    <div className="results-screen">
      {/* Existing results screen implementation */}
    </div>
  );
};

export default ResultsScreen;