import React from 'react';
import { SafeButton } from '../components/SafeButton';

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizFeedback = {
  isCorrect: boolean;
  funFact: string;
};

export type QuizScreenProps = {
  questionNumber: number;
  totalQuestions: number;
  prompt: string;
  dinosaurImageAlt: string;
  dinosaurImageSrc: string;
  options: QuizOption[];
  onSelectOption: (optionId: string) => void;
  feedback: QuizFeedback | null;
  onNext: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
};

export function QuizScreen({
  questionNumber,
  totalQuestions,
  prompt,
  dinosaurImageAlt,
  dinosaurImageSrc,
  options,
  onSelectOption,
  feedback,
  onNext,
  isMuted,
  onToggleMute,
}: QuizScreenProps) {
  return (
    <section aria-label={`Pregunta ${questionNumber} de ${totalQuestions}`}>
      <SafeButton
        label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
        className="mute-button"
        onClick={onToggleMute}
      />

      <img src={dinosaurImageSrc} alt={dinosaurImageAlt} />
      <p className="prompt-text">{prompt}</p>

      <div role="group" aria-label="Opciones de respuesta">
        {options.map((option) => (
          <SafeButton
            key={option.id}
            label={option.text}
            className="option-button"
            disabled={feedback !== null}
            onClick={() => onSelectOption(option.id)}
          />
        ))}
      </div>

      {feedback && (
        <div role="status" aria-live="polite" className="feedback-panel">
          <p className="feedback-message">
            {feedback.isCorrect ? '¡Genial, lo has acertado!' : '¡Casi! Aqui tienes la respuesta correcta.'}
          </p>
          <p className="fun-fact-text">{feedback.funFact}</p>
          <SafeButton label="Siguiente" className="next-button" onClick={onNext} />
        </div>
      )}
    </section>
  );
}
