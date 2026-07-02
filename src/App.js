import { logAppOpen } from './utils/logger';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    logAppOpen();
  }, []);
  
  // Rest of the App component code
}