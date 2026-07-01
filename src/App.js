import React from 'react';
import { View } from 'react-native';
import StartScreen from './components/StartScreen';

const App = () => {
  const handleStartGame = () => {
    console.log('Game started!');
    // Navigation to game screen will be implemented in a separate ticket
  };

  return (
    <View style={{ flex: 1 }}>
      <StartScreen onStartGame={handleStartGame} />
    </View>
  );
};

export default App;