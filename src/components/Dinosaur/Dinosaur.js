import React from 'react';
import dinosaurPlaceholder from '../../assets/dinosaur-placeholder.png';
import './Dinosaur.css';

const Dinosaur = ({ imageUrl, altText }) => {
  const handleImageError = (e) => {
    e.target.src = dinosaurPlaceholder;
    e.target.className = 'dinosaur-image placeholder';
  };

  return (
    <div className="dinosaur-container">
      <img 
        src={imageUrl} 
        alt={altText}
        className="dinosaur-image"
        onError={handleImageError}
      />
    </div>
  );
};

export default Dinosaur;