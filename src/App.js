import React, { useState } from 'react';
import ResultsScreen from './components/ResultsScreen';
import { saveBestScore } from './utils/storage';

const App = () => {
  const [currentScore, setCurrentScore] = useState(0);

  const handleGameEnd = (score) => {
    setCurrentScore(score);
    saveBestScore(score);
  };

  return (
    <div className="App">
      <ResultsScreen currentScore={currentScore} />
    </div>
  );
};

export default App;