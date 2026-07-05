import React, { useState, useEffect } from 'react';
import { checkOfflineFirstLoad } from './utils/offlineFirstLoad';
import OfflineFirstLoadMessage from './components/OfflineFirstLoadMessage';
import HomeScreen from './screens/HomeScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import sessionService from './services/sessionService';
import { View, Button, StyleSheet } from 'react-native';

const App = () => {
  const [gameState, setGameState] = useState('start');
  const [isOfflineFirstLoad, setIsOfflineFirstLoad] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setIsOfflineFirstLoad(checkOfflineFirstLoad());
    sessionService.resetGame();
  }, []);

  const handleStartGame = () => {
    setGameState('quiz');
  };

  const handleReplay = () => {
    setScore(0);
    setGameState('quiz');
  };

  if (isOfflineFirstLoad) {
    return <OfflineFirstLoadMessage />;
  }

  return (
    <View style={styles.container}>
      {gameState === 'start' && <HomeScreen onStartGame={handleStartGame} />}
      {gameState === 'quiz' && <QuizScreen onComplete={(finalScore) => {
        setScore(finalScore);
        setGameState('results');
      }} />}
      {gameState === 'results' && <ResultsScreen score={score} onReplay={handleReplay} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default App;