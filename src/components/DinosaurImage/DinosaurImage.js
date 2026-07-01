import React from 'react';
import placeholderImage from '../../assets/images/dino-placeholder.png';
import './DinosaurImage.css';

const DinosaurImage = ({ src, alt }) => {
  const handleImageError = (e) => {
    e.target.src = placeholderImage;
    e.target.alt = 'Placeholder image';
  };

  return (
    <img
      src={src}
      alt={alt}
      onError={handleImageError}
      className="dinosaur-image"
    />
  );
};

export default DinosaurImage;