import React, { useState, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import './HomeScreen.css';

export default function HomeScreen({ onStartGame }) {
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const hasOpenedApp = localStorage.getItem('hasOpenedApp');
    if (hasOpenedApp !== 'true') {
      setShowTooltip(true);
    }
  }, []);

  const handleFirstTap = () => {
    if (showTooltip) {
      setShowTooltip(false);
      localStorage.setItem('hasOpenedApp', 'true');
    }
  };

  return (
    <div className="home-screen" onClick={handleFirstTap} data-testid="home-screen">
      <h1>DinoQuiz</h1>
      <div className="dino-illustration" />
      <button
        id="jugar-button"
        className="jugar-button"
        onClick={(e) => {
          handleFirstTap();
          onStartGame(e);
        }}
        data-testid="jugar-button"
      >
        ¡Jugar!
      </button>

      {showTooltip && (
        <Tooltip
          anchorSelect="#jugar-button"
          place="top"
          isOpen={showTooltip}
          className="first-open-tooltip"
          data-testid="first-open-tooltip"
        >
          ¡Pulsa aquí para empezar a jugar!
        </Tooltip>
      )}
    </div>
  );
}