import { useEffect } from 'react';
import { trackAppOpen } from '../../analytics/analyticsService';
import { useFirstOpen } from '../../hooks/useFirstOpen';

export default function App() {
  const isFirstOpen = useFirstOpen();
  
  useEffect(() => {
    trackAppOpen(isFirstOpen);
  }, [isFirstOpen]);
  
  // ... rest of the App component
}
