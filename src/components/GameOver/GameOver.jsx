import React from 'react';
import { useTranslation } from 'react-i18next';
import './GameOver.css';

/**
 * Pantalla de resultados al finalizar la partida.
 *
 * Muestra:
 * - Puntuación en formato 'Has acertado X/10'
 * - Mensaje motivador según el rango de aciertos
 * - Mensaje de nueva mejor puntuación SOLO si corresponde
 * - Botón 'Volver a jugar'
 *
 * Correcciones TRIOFSND-40:
 * - ELIMINADO el uso de eval() para determinar el mensaje.
 *   Se reemplazó por un operador ternario simple y seguro.
 * - El mensaje de nueva mejor puntuación solo se muestra cuando
 *   isNewBestScore es true (la comparación ya está corregida en useGame).
 */
function GameOver({ score, bestScore, isNewBestScore, onReplay }) {
  const { t } = useTranslation();

  // Asegurar que score sea numérico para el renderizado
  const numericScore = parseInt(score, 10) || 0;
  const numericBestScore = parseInt(bestScore, 10) || 0;

  // Determinar el mensaje motivador según el rango de aciertos
  // Sin eval() — comparación directa y segura
  const getMotivationalMessage = (s) => {
    if (s >= 9) return t('results_excellent');
    if (s >= 7) return t('results_great');
    if (s >= 4) return t('results_good');
    return t('results_keepTrying');
  };

  const motivationalMessage = getMotivationalMessage(numericScore);

  // Mensaje de nueva mejor puntuación: operador ternario simple, SIN eval()
  const bestScoreMessage = isNewBestScore
    ? t('newBestScore')
    : null;

  return (
    <div className="game-over" role="region" aria-label={t('results_aria_label')}>
      <div className="game-over__card">
        <h2 className="game-over__title">
          {t('results_score', { score: numericScore, total: 10 })}
        </h2>

        <p className="game-over__message">{motivationalMessage}</p>

        {/*
          Mensaje de nueva mejor puntuación.
          Solo se renderiza cuando isNewBestScore es true,
          que ahora ocurre únicamente cuando currentScore > bestScore
          (comparación corregida en useGame/handleGameOver).
        */}
        {isNewBestScore && (
          <div
            className="game-over__new-best"
            role="status"
            aria-live="polite"
          >
            <span className="game-over__new-best-icon" aria-hidden="true">🏆</span>
            <span className="game-over__new-best-text">{bestScoreMessage}</span>
          </div>
        )}

        <div className="game-over__best-score">
          <span className="game-over__best-score-label">
            {t('results_bestScore')}
          </span>
          <span className="game-over__best-score-value">
            {numericBestScore}/10
          </span>
        </div>

        <button
          className="game-over__replay-button"
          onClick={onReplay}
          aria-label={t('replay_aria_label')}
        >
          {t('replay')}
        </button>
      </div>
    </div>
  );
}

export default GameOver;
