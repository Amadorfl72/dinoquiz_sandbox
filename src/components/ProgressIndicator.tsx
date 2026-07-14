import React from 'react';
import { FUN_FACTS } from '../data/funFacts';
import { useProgress } from '../hooks/useProgress';

// Shown on the results/home screen. Discovered count and total are always
// derived from real data (persisted IDs vs. the fun-facts catalog length)
// rather than a hardcoded number, so it stays correct if facts are added.
export function ProgressIndicator(): JSX.Element {
  const { progress } = useProgress();
  const discovered = progress.seenFactIds.length;
  const total = FUN_FACTS.length;

  return (
    <div
      className="progress-indicator"
      role="status"
      aria-label={`Datos curiosos descubiertos: ${discovered} de ${total}`}
    >
      <span className="progress-indicator__icon" aria-hidden="true">
        🦖
      </span>
      <span className="progress-indicator__label">
        Descubiertos {discovered}/{total}
      </span>
      <div className="progress-indicator__stats">
        <span className="progress-indicator__stat">Mejor puntuación: {progress.bestScore}</span>
        <span className="progress-indicator__stat">Racha máxima: {progress.maxStreak}</span>
      </div>
    </div>
  );
}
