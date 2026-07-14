import { useCallback, useEffect, useState } from 'react';
import { getProgress, markFactSeen, recordGameResult, ProgressState } from '../lib/progressStorage';

export interface UseProgressResult {
  progress: ProgressState;
  seeFact: (factId: string) => void;
  finishGame: (result: { score: number; streak: number }) => void;
}

// Recomputes progress from storage on mount so reopening the app (or
// navigating back to a screen) always shows the latest persisted state.
export function useProgress(): UseProgressResult {
  const [progress, setProgress] = useState<ProgressState>(() => getProgress());

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  const seeFact = useCallback((factId: string) => {
    setProgress(markFactSeen(factId));
  }, []);

  const finishGame = useCallback((result: { score: number; streak: number }) => {
    setProgress(recordGameResult(result));
  }, []);

  return { progress, seeFact, finishGame };
}
