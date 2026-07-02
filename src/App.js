import React from 'react';
import Tooltip from './components/Tooltip';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>DinoQuiz</h1>
      <button id="jugar-button">¡Jugar!</button>
      <Tooltip targetId="jugar-button" />
    </div>
  );
}

export default App;