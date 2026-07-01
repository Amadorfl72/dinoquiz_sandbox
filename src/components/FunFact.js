import React from 'react';
import './FunFact.css';

const FunFact = ({ fact, dinosaurImage, onNext }) => {
  return (
    <div className="fun-fact-container">
      <div className="fun-fact-content">
        <img 
          src={dinosaurImage} 
          alt="Dinosaur" 
          className="dinosaur-image" 
          data-testid="dinosaur-image"
        />
        <p className="fun-fact-text">{fact}</p>
      </div>
      <button 
        className="next-button" 
        onClick={onNext}
        data-testid="next-button"
      >
        Next
      </button>
    </div>
  );
};

export default FunFact;