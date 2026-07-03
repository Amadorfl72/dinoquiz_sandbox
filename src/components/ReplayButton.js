import React from 'react';
import { Telemetry } from '../analytics/telemetry';

const ReplayButton = ({ score, onClick }) => {
  const handleClick = () => {
    Telemetry.logReplayClicked(score);
    onClick();
  };

  return (
    <button 
      className="replay-button" 
      onClick={handleClick}
      aria-label="Volver a jugar"
    >
      Volver a jugar
    </button>
  );
};

export default ReplayButton;
