import React, { useEffect, useRef } from 'react';
import strings from '../../i18n/strings.es.json';
import { formatString } from '../../i18n/format';
import { getStarCount } from './starRating';
import { getMotivationalMessage } from './motivationalMessage';
import styles from './ResultsScreen.module.css';

export interface ResultsScreenProps {
  score: number;
  totalQuestions: number;
  onPlayAgain: () => void;
  onExit?: () => void;
}

export function ResultsScreen({
  score,
  totalQuestions,
  onPlayAgain,
  onExit,
}: ResultsScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stars = getStarCount(score, totalQuestions);
  const message = getMotivationalMessage(stars);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className={styles.screen} aria-label={strings.results.screenLabel}>
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
        {strings.results.title}
      </h1>

      <p
        className={styles.score}
        aria-label={formatString(strings.results.scoreLabel, {
          score,
          total: totalQuestions,
        })}
      >
        {score}/{totalQuestions}
      </p>

      <div
        className={styles.stars}
        role="img"
        aria-label={formatString(strings.results.starsLabel, { count: stars })}
      >
        {[1, 2, 3].map((position) => (
          <span
            key={position}
            aria-hidden="true"
            className={position <= stars ? styles.starFilled : styles.starEmpty}
          >
            {'\u2605'}
          </span>
        ))}
      </div>

      <p className={styles.message}>{message}</p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onPlayAgain}
          aria-label={strings.results.playAgainA11yLabel}
        >
          {strings.results.playAgainButton}
        </button>

        {onExit && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onExit}
            aria-label={strings.results.exitA11yLabel}
          >
            {strings.results.exitButton}
          </button>
        )}
      </div>
    </section>
  );
}
