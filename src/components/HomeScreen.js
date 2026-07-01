import React from 'react';
import './HomeScreen.css';

const HomeScreen = () => {
  return (
    <div className="home-screen">
      <h1>DinoQuiz</h1>
      <img id="dino_mascot" src="dino_mascot.png" alt="Dino Mascot" />
      <button id="play_button" tabIndex="0">¡Jugar!</button>
    </div>
  );
};

export default HomeScreen;