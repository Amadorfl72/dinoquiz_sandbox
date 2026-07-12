import React from 'react';
import { useAudioManager } from '../audio/useAudioManager';

export interface MuteButtonProps {
  muteLabel?: string;
  unmuteLabel?: string;
  className?: string;
}

/**
 * Global mute/unmute control, meant to be rendered on every screen per
 * AC-11. Toggling calls straight into AudioManager, which is a synchronous,
 * in-memory flag flip, so the UI updates well under the 300ms budget in
 * AC-5 without waiting on any audio I/O.
 */
export function MuteButton({
  muteLabel = 'Silenciar sonido',
  unmuteLabel = 'Activar sonido',
  className,
}: MuteButtonProps) {
  const { muted, toggleMute } = useAudioManager();
  const label = muted ? unmuteLabel : muteLabel;

  return (
    <button
      type="button"
      className={className ?? 'mute-button'}
      aria-pressed={muted}
      aria-label={label}
      onClick={toggleMute}
    >
      <span aria-hidden="true">{muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}</span>
    </button>
  );
}
