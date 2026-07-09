import React from 'react';
import { SafeButton } from '../components/SafeButton';

export type HomeScreenProps = {
  onPlay: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenRemoveAds: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
};

export function HomeScreen({
  onPlay,
  onOpenPrivacyPolicy,
  onOpenRemoveAds,
  isMuted,
  onToggleMute,
}: HomeScreenProps) {
  return (
    <section aria-label="Pantalla de inicio de DinoQuiz">
      <h1>DinoQuiz</h1>
      <img src="/assets/dinosaurs/mascota.png" alt="Dino, la mascota de DinoQuiz, saludando" />

      <SafeButton label="¡Jugar!" className="play-button" onClick={onPlay} />

      <SafeButton
        label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
        className="mute-button"
        onClick={onToggleMute}
      />

      <SafeButton
        label="Ver politica de privacidad"
        className="privacy-button"
        onClick={onOpenPrivacyPolicy}
      />

      <SafeButton
        label="Eliminar anuncios y desbloquear packs"
        className="remove-ads-button"
        onClick={onOpenRemoveAds}
      />
    </section>
  );
}
