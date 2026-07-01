import React, { useEffect } from 'react';
import { trackLCP } from './utils/metrics';
import GameStartButton from './components/GameStartButton';

const App = () => {
  useEffect(() => {
    // Track LCP once the main content is loaded
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          trackLCP(entry.startTime);
          observer.disconnect();
        }
      }
    });
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    
    return () => observer.disconnect();
  }, []);
  
  const handleGameStart = () => {
    // Game start logic
  };
  
  return (
    <div className="App">
      <GameStartButton onClick={handleGameStart} />
    </div>
  );
};

export default App;