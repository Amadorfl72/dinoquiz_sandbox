import React, { useState, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import './HomeScreen.css';

export default function HomeScreen({ onStartGame }) {
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const isFirstOpen = localStorage.getItem('firstOpen') === null;
    if (isFirstOpen) {
      setShowTooltip(true);
      localStorage.setItem('firstOpen', 'false');
    }
  }, []);

  const handleFirstTap = () => {
    if (showTooltip) {
      setShowTooltip(false);
    }
  };

  return (
    <div className="home-screen" onClick={handleFirstTap}>
      <h1>DinoQuiz</h1>
      <div className="dino-illustration" />
      <button
        id="jugar-button"
        className="jugar-button"
        onClick={onStartGame}
      >
        ¡Jugar!
      </button>

      {showTooltip && (
        <Tooltip
          anchorSelect="#jugar-button"
          place="top"
          isOpen={showTooltip}
          className="first-open-tooltip"
        >
          ¡Pulsa aquí para empezar a jugar!
        </Tooltip>
      )}
    </div>
  );
}
