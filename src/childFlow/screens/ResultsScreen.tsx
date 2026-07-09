import React from 'react';
import { SafeButton } from '../components/SafeButton';

export type ResultsScreenProps = {
  score: number;
  totalQuestions: number;
  stars: 1 | 2 | 3;
  motivationalMessage: string;
  onPlayAgain: () => void;
  onExitToHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
};

export function ResultsScreen({
  score,
  totalQuestions,
  stars,
  motivationalMessage,
  onPlayAgain,
  onExitToHome,
  isMuted,
  onToggleMute,
}: ResultsScreenProps) {
  return (
    <section aria-label="Pantalla de resultados">
      <SafeButton
        label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
        className="mute-button"
        onClick={onToggleMute}
      />

      <p className="score-text">{`Puntuacion: ${score}/${totalQuestions}`}</p>
      <p className="stars-text" aria-label={`${stars} de 3 estrellas`}>
        {'⭐'.repeat(stars)}
      </p>
      <p className="message-text">{motivationalMessage}</p>

      <SafeButton label="Volver a jugar" className="play-again-button" onClick={onPlayAgain} />
      <SafeButton label="Salir" className="exit-button" onClick={onExitToHome} />
    </section>
  );
}
