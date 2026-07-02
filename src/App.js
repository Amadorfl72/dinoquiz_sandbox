import React, { useEffect, useState } from 'react';
import { checkOfflineFirstLoad } from './utils/offlineFirstLoad';
import OfflineFirstLoadMessage from './components/OfflineFirstLoadMessage';
import HomeScreen from './screens/HomeScreen';

const App = () => {
  const [isOfflineFirstLoad, setIsOfflineFirstLoad] = useState(false);

  useEffect(() => {
    setIsOfflineFirstLoad(checkOfflineFirstLoad());
  }, []);

  if (isOfflineFirstLoad) {
    return <OfflineFirstLoadMessage />;
  }

  return <HomeScreen />;
};

export default App;