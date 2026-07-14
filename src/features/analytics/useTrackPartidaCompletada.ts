import { useEffect, useRef } from 'react';
import { recordPartidaCompletada } from './trackPartidaCompletada';

/**
 * Mount this in the Resultados screen. Guards against double-firing
 * under React StrictMode's dev-only double effect invocation.
 */
export function useTrackPartidaCompletada(score: number, totalQuestions: number): void {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;
    recordPartidaCompletada(score, totalQuestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
