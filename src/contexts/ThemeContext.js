import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState({
    backgroundColor: '#ffffff',
    textColor: '#333333',
    buttonColor: '#4CAF50',
    buttonTextColor: '#ffffff',
  });

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}