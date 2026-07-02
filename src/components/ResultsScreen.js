import React, { useEffect } from 'react';
import { logGameCompleted } from '../logging';

const ResultsScreen = ({ score, durationMs, appVersion }) => {
  useEffect(() => {
    logGameCompleted(score, durationMs, appVersion);
  }, [score, durationMs, appVersion]);

  return (
    <div>
      <h1>Results</h1>
      <p>Score: {score}</p>
      <p>Duration: {durationMs} ms</p>
      <p>App Version: {appVersion}</p>
    </div>
  );
};

export default ResultsScreen;
