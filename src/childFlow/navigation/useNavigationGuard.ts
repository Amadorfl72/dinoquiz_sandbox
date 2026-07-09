import { useEffect } from 'react';
import { installExternalNavigationGuard } from './navigationGuard';

export function useNavigationGuard(): void {
  useEffect(() => {
    const uninstall = installExternalNavigationGuard();
    return uninstall;
  }, []);
}
