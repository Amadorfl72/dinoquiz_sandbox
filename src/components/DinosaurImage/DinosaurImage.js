import React, { useState } from 'react';
import placeholderImage from '../../assets/images/dino-placeholder.png';
import './DinosaurImage.css';

const DinosaurImage = ({ src, alt, children }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = (e) => {
    setImageError(true);
  };

  return (
    <div className="dinosaur-image-container" data-testid="dinosaur-image-container">
      {imageError ? (
        <div className="image-placeholder" data-testid="image-placeholder" role="img" aria-label={`${alt} placeholder`}>
          <img 
            src={placeholderImage} 
            alt={`${alt} placeholder`} 
            className="placeholder-image"
          />
          <div className="placeholder-overlay" data-testid="placeholder-overlay"></div>
          {children}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={handleImageError}
          className="dinosaur-image"
          data-testid="dinosaur-image"
        />
      )}
    </div>
  );
};

export default DinosaurImage;