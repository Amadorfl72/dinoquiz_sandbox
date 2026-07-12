import { useCallback, useEffect, useState } from 'react';
import { audioManager } from './AudioManager';

export interface UseAudioManagerResult {
  muted: boolean;
  toggleMute: () => void;
}

/**
 * React binding for the shared AudioManager singleton. Re-renders whenever
 * the mute flag changes, so any screen showing the global mute button stays
 * in sync instantly (AC-11).
 */
export function useAudioManager(): UseAudioManagerResult {
  const [muted, setMuted] = useState<boolean>(() => audioManager.isMuted());

  useEffect(() => {
    setMuted(audioManager.isMuted());
    return audioManager.onMuteChange(setMuted);
  }, []);

  const toggleMute = useCallback(() => {
    audioManager.toggleMute();
  }, []);

  return { muted, toggleMute };
}
