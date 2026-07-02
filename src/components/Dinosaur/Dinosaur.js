import React from 'react';
import dinosaurPlaceholder from '../../assets/dinosaur-placeholder.png';
import './Dinosaur.css';

const Dinosaur = ({ src, alt, className }) => {
  const handleImageError = (e) => {
    e.target.src = dinosaurPlaceholder;
    e.target.className = `${className} placeholder`;
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleImageError}
    />
  );
};

export default Dinosaur;