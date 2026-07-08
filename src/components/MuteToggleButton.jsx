import { useMute } from '../audio/MuteContext';
import strings from '../i18n/strings.es.json';
import styles from './MuteToggleButton.module.css';

function SpeakerOnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z" />
      <path
        fill="currentColor"
        d="M16.5 12c0-1.77-.77-3.29-2-4.24v8.48c1.23-.95 2-2.47 2-4.24zM14.5 3.23v2.06c2.89 1.02 5 3.76 5 7.01s-2.11 5.99-5 7.01v2.06c4.01-1.06 7-4.62 7-9.07s-2.99-8.01-7-9.07z"
      />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z" />
      <path
        fill="currentColor"
        d="M19.5 12l2.5-2.5-1.41-1.41L18.09 10.6 15.6 8.09 14.19 9.5 16.68 12l-2.49 2.49 1.41 1.41L18.09 13.4l2.5 2.5 1.41-1.41L19.5 12z"
      />
    </svg>
  );
}

export function MuteToggleButton() {
  const { isMuted, toggleMute } = useMute();
  const label = isMuted ? strings.muteButton.unmuteLabel : strings.muteButton.muteLabel;

  return (
    <button
      type="button"
      className={`${styles.muteButton} ${isMuted ? styles.muted : styles.unmuted}`}
      onClick={toggleMute}
      aria-label={label}
      aria-pressed={isMuted}
    >
      {isMuted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
    </button>
  );
}
