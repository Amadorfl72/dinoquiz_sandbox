import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import QuizScreen from './screens/QuizScreen';
import ResultsScreen from './screens/ResultsScreen';
import SessionService from './services/SessionService';

function App() {
  useEffect(() => {
    // Clear any existing session when app loads
    SessionService.clearSession();
    
    // Add event listener to clear session when app is closed
    const handleBeforeUnload = () => {
      SessionService.clearSession();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/quiz" element={<QuizScreen />} />
        <Route path="/results" element={<ResultsScreen />} />
      </Routes>
    </Router>
  );
}

export default App;