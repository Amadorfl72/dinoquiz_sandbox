import React, { useState } from 'react';
import PropTypes from 'prop-types';
import placeholderSrc from '../../assets/images/dino-placeholder.png';
import './DinoImage.css';

const DinoImage = ({ src, alt }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="dino-image-container">
      {imageError ? (
        <img 
          key="placeholder"
          src={placeholderSrc} 
          alt={`Placeholder for ${alt}`} 
          className="dino-image"
          data-testid="dino-placeholder"
          role="img"
          aria-label={`Missing dinosaur image for ${alt}`}
        />
      ) : (
        <img 
          key="dino-image"
          src={src} 
          alt={alt} 
          className="dino-image"
          onError={handleImageError}
          data-testid="dino-image"
        />
      )}
    </div>
  );
};

DinoImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired
};

export default DinoImage;
