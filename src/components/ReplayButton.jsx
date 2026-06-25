import React, { useCallback } from 'react';
import { useGameState } from '../game/GameStateContext.jsx';
import { handleReplayClick } from '../telemetry/replayTelemetry.js';

/**
 * 'Volver a jugar' button shown on the results screen.
 *
 * On click:
 *   1. Emits 'replay_clicked' with previous_score and timestamp.
 *   2. Triggers a new game (which will emit 'game_started' with trigger:'replay').
 */
export default function ReplayButton() {
  const { lastScore, startNewGame } = useGameState();

  const handleClick = useCallback(() => {
    try {
      // Emit 'replay_clicked' with previous_score and timestamp.
      handleReplayClick(lastScore);
    } catch {
      // Swallow - telemetry must never block the replay action.
    }

    // Start a new game. GameController will emit 'game_started' with trigger:'replay'.
    startNewGame({ trigger: 'replay' });
  }, [lastScore, startNewGame]);

  return (
    <button
      className="replay-button"
      onClick={handleClick}
      aria-label="Volver a jugar"
      style={{
        minHeight: '64px',
        fontSize: '1.5rem',
        padding: '1rem 2rem',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '320px',
      }}
    >
      Volver a jugar
    </button>
  );
}
