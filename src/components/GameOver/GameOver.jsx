import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getBestScore } from '../../utils/storage';
import './GameOver.css';

/**
 * GameOver — results screen shown after all 10 questions are answered.
 *
 * Displays:
 * - "Has acertado X/10"
 * - A motivational message appropriate to the score range.
 * - "¡Nueva mejor puntuación!" ONLY when the score strictly surpassed a
 *   previously-stored finite best score (not on first-ever play).
 * - The persisted best score.
 * - A single "Volver a jugar" button.
 *
 * SECURITY NOTE: This component previously used eval() to select a message.
 * That has been removed entirely. Message selection now uses a plain
 * lookup object with a numeric range check — no code execution whatsoever.
 */
export default function GameOver({ score, bestScore, isNewBestScore, onReplay, onFinalizeScore }) {
  const { t } = useTranslation();

  // Finalize the best-score comparison exactly once when the screen mounts.
  // This keeps the read-compare-write atomic and avoids race conditions
  // where localStorage might change between a parent's calculation and
  // this component's render.
  useEffect(() => {
    onFinalizeScore(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Motivational message by score range (no eval, no dynamic code) ---
  // Ranges per PRD: 0-3, 4-6, 7-8, 9-10
  const numericScore = Number.isFinite(Number(score)) ? Number(score) : 0;
  let messageKey;
  if (numericScore <= 3) {
    messageKey = 'resultsMessageLow';
  } else if (numericScore <= 6) {
    messageKey = 'resultsMessageMid';
  } else if (numericScore <= 8) {
    messageKey = 'resultsMessageHigh';
  } else {
    messageKey = 'resultsMessageTop';
  }
  const motivationalMessage = t(messageKey);

  // The "new best score" banner is shown exclusively when `isNewBestScore`
  // is true — which is only set when a previous finite best score existed
  // and was strictly surpassed.
  const newBestBanner = isNewBestScore ? t('newBestScore') : '';

  // Read the current persisted best for display (already in state via hook,
  // but we use the prop passed from the parent for a single source of truth).
  const displayBest = Number.isFinite(Number(bestScore)) ? Number(bestScore) : getBestScore();

  return (
    <section className="gameover" role="region" aria-label={t('resultsAriaLabel')}>
      <h2 className="gameover__title">{t('resultsTitle')}</h2>

      <p className="gameover__score" aria-live="polite">
        {t('resultsScore', { score: numericScore, total: 10 })}
      </p>

      <p className="gameover__message">{motivationalMessage}</p>

      {isNewBestScore && (
        <p className="gameover__new-best" role="status" aria-live="assertive">
          {newBestBanner}
        </p>
      )}

      <p className="gameover__best">
        {t('bestScoreLabel', { best: displayBest })}
      </p>

      <button
        className="btn btn--primary btn--large"
        onClick={onReplay}
        aria-label={t('replayAriaLabel')}
      >
        {t('replay')}
      </button>
    </section>
  );
}
