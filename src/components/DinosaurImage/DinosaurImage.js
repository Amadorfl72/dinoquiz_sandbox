import React, { useState } from 'react';
import placeholderImage from '../../assets/images/placeholder-dinosaur.png';
import './DinosaurImage.css';

const DinosaurImage = ({ src, alt, caption }) => {
  const [hasError, setHasError] = useState(false);

  const handleImageError = (e) => {
    if (!hasError) {
      e.target.src = placeholderImage;
      e.target.setAttribute('data-testid', 'dinosaur-placeholder');
      setHasError(true);
    }
  };

  return (
    <div className="dinosaur-image-container">
      <img
        src={src}
        alt={alt}
        onError={handleImageError}
        className="dinosaur-image"
        data-testid={hasError ? 'dinosaur-placeholder' : 'dinosaur-image'}
      />
      {caption && (
        <div className="caption-overlay" data-testid="caption-overlay">
          {caption}
        </div>
      )}
    </div>
  );
};

export default DinosaurImage;