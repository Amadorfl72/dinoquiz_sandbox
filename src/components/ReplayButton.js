import React from 'react';
import { trackReplay } from '../analytics/telemetry';

const ReplayButton = ({ onClick }) => {
  const handleClick = () => {
    trackReplay();
    onClick();
  };

  return (
    <button 
      onClick={handleClick}
      aria-label="Volver a jugar"
      style={{
        fontSize: '24px',
        padding: '16px 32px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        minHeight: '64px',
        minWidth: '48px'
      }}
    >
      Volver a jugar
    </button>
  );
};

export default ReplayButton;