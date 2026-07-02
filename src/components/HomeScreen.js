import React from 'react';
import './HomeScreen.css';

const HomeScreen = () => {
  return (
    <div className="home-screen">
      <h1 className="title">DinoQuiz</h1>
      <img src="dino-mascot.png" alt="Dinosaur mascot" className="mascot" />
      <button className="play-button" aria-label="Jugar">¡Jugar!</button>
    </div>
  );
};

export default HomeScreen;