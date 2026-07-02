import React, { useEffect } from 'react';
import analyticsLogger from '../services/analyticsLogger';

const FunFactScreen = () => {
  useEffect(() => {
    analyticsLogger.logEvent('fun_fact_viewed', {});
  }, []);

  return (
    <div>
      {/* Fun Fact Screen Content */}
    </div>
  );
};

export default FunFactScreen;