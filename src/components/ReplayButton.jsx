import React from 'react';
import { recordReplayClicked } from '../telemetry/replayTelemetry.js';

/**
 * ReplayButton — the "Volver a jugar" button shown on the results screen.
 *
 * On click it:
 *  1. Emits the `replay_clicked` telemetry event with `previous_score`
 *     and `timestamp` (TRIOFSND-41).
 *  2. Calls the parent `onReplay` callback to start a new game.
 *
 * Telemetry is wrapped in try/catch internally (in replayTelemetry.js)
 * so failures never block the replay action.
 */
export default function ReplayButton({ previousScore = 0, onReplay }) {
  const handleClick = React.useCallback(() => {
    try {
      // Emit replay_clicked with previous_score and timestamp.
      // previousScore is the score of the just-completed game.
      recordReplayClicked(previousScore, Date.now());
    } catch (err) {
      // Defensive: never block replay on telemetry failure.
      console.error('[ReplayButton] telemetry error:', err);
    }

    // Proceed with the actual replay regardless of telemetry outcome.
    if (typeof onReplay === 'function') {
      onReplay();
    }
  }, [previousScore, onReplay]);

  return (
    <button
      type="button"
      className="replay-button"
      onClick={handleClick}
      aria-label="Volver a jugar"
      style={{
        minHeight: '64px',
        fontSize: '1.5rem',
        padding: '1rem 2rem',
        borderRadius: '16px',
        border: 'none',
        background: 'var(--color-primary, #4caf50)',
        color: '#fff',
        cursor: 'pointer',
        width: '100%',
        maxWidth: '320px',
      }}
    >
      Volver a jugar
    </button>
  );
}
