import strings from '../i18n/es/strings.json';
import { DataLossNotice } from '../components/DataLossNotice';
import styles from './HomeScreen.module.css';

export interface HomeScreenProps {
  onPlay: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenPrivacyPolicy: () => void;
}

export function HomeScreen({ onPlay, isMuted, onToggleMute, onOpenPrivacyPolicy }: HomeScreenProps) {
  const { title, playButton, muteButton, unmuteButton, privacyPolicyLink } = strings.home;

  return (
    <main className={styles.screen}>
      <button
        type="button"
        className={styles.muteButton}
        onClick={onToggleMute}
        aria-pressed={isMuted}
      >
        {isMuted ? unmuteButton : muteButton}
      </button>

      <div className={styles.hero}>
        <h1 className={styles.title}>{title}</h1>
        <img
          className={styles.mascot}
          src="/assets/illustrations/mascot.png"
          alt="Dinosaurio mascota de DinoQuiz sonriendo y saludando"
        />
        <button type="button" className={styles.playButton} onClick={onPlay}>
          {playButton}
        </button>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.footerLink} onClick={onOpenPrivacyPolicy}>
          {privacyPolicyLink}
        </button>
        <DataLossNotice />
      </footer>
    </main>
  );
}
