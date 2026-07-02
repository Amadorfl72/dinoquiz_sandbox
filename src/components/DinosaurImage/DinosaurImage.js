import React, { useState } from 'react';
import placeholderImage from '../../assets/images/placeholder-dinosaur.png';
import './DinosaurImage.css';

const DinosaurImage = ({ src, alt, caption }) => {
  const [imageState, setImageState] = useState({
    hasError: false,
    placeholderError: false
  });

  const handleImageError = (e) => {
    // Prevent infinite loop by tracking both original and placeholder states
    if (!imageState.hasError && !imageState.placeholderError) {
      e.target.src = placeholderImage;
      e.target.setAttribute('data-testid', 'dinosaur-placeholder');
      setImageState({
        hasError: true,
        placeholderError: false
      });
    } else if (imageState.hasError && !imageState.placeholderError) {
      // If placeholder also fails, show a solid color fallback
      e.target.src = '';
      e.target.style.backgroundColor = '#333';
      e.target.style.width = '100%';
      e.target.style.height = '200px';
      setImageState({
        hasError: true,
        placeholderError: true
      });
    }
  };

  return (
    <div className="dinosaur-image-container">
      <img
        src={src}
        alt={alt}
        onError={handleImageError}
        className="dinosaur-image"
        data-testid={imageState.hasError ? 'dinosaur-placeholder' : 'dinosaur-image'}
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