import React from 'react';
import './HomeScreen.css';

const HomeScreen = () => {
  return (
    <div className="home-screen">
      <h1 className="title">DinoQuiz</h1>
      <img 
        src="dino-mascot.png" 
        alt="Dinosaurio mascota de DinoQuiz" 
        className="mascot" 
        data-testid="dino-mascot"
      />
      <button 
        className="play-button" 
        aria-label="Botón para comenzar a jugar DinoQuiz"
        accessibilityRole="button"
        data-testid="play-button"
      >
        ¡Jugar!
      </button>
    </div>
  );
};

export default HomeScreen;