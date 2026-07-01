import React from 'react';
import PropTypes from 'prop-types';
import DinoImage from '../DinoImage/DinoImage';
import './Question.css';

const Question = ({ question, options, dinoImage, dinoName }) => {
  return (
    <div className="question-container">
      <h2 className="question-text">{question}</h2>
      <div className="dino-image-wrapper">
        <DinoImage 
          src={dinoImage} 
          alt={`Illustration of ${dinoName}`} 
        />
      </div>
      <div className="options-container">
        {options.map((option, index) => (
          <button key={index} className="option-button">
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

Question.propTypes = {
  question: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  dinoImage: PropTypes.string.isRequired,
  dinoName: PropTypes.string.isRequired
};

export default Question;