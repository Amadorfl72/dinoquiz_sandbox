import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomeScreen } from './screens/HomeScreen';
import { PrivacyPolicyScreen } from './screens/PrivacyPolicyScreen';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/privacidad" element={<PrivacyPolicyScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
