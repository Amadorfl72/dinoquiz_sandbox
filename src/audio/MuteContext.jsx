import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const MUTE_STORAGE_KEY = 'dinoquiz.audio.muted';
const MuteContext = createContext(null);

function readStoredMute() {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

function writeStoredMute(isMuted) {
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted));
  } catch (error) {
    // Storage unavailable (e.g. private browsing); mute state stays in-memory only.
  }
}

export function MuteProvider({ children }) {
  const [isMuted, setIsMuted] = useState(readStoredMute);

  useEffect(() => {
    writeStoredMute(isMuted);
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((previous) => !previous);
  }, []);

  return (
    <MuteContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </MuteContext.Provider>
  );
}

export function useMute() {
  const context = useContext(MuteContext);
  if (!context) {
    throw new Error('useMute must be used within a MuteProvider');
  }
  return context;
}
