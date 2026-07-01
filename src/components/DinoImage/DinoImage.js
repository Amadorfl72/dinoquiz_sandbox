import React, { useState } from 'react';
import PropTypes from 'prop-types';
import placeholderImage from '../../assets/images/dino-placeholder.png';
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
          src={placeholderImage} 
          alt={`Placeholder for ${alt}`} 
          className="dino-image"
        />
      ) : (
        <img 
          src={src} 
          alt={alt} 
          className="dino-image"
          onError={handleImageError}
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