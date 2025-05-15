import { createContext, useContext, useEffect, useState } from 'react';

// Theme types
export const themes = {
  dark: 'dark',
  light: 'light',
  system: 'system'
};

// Create context with default values
const ThemeContext = createContext({
  theme: themes.system,
  setTheme: () => null,
});

/**
 * Theme provider component to manage application theme
 */
export function ThemeProvider({
  children,
  defaultTheme = themes.system,
  storageKey = 'defi-theme-preference',
}) {
  // Initialize theme from localStorage or use default
  const [theme, setTheme] = useState(() => {
    const storedTheme = typeof window !== 'undefined' 
      ? localStorage.getItem(storageKey) 
      : null;
    
    return storedTheme || defaultTheme;
  });

  // Update HTML classList and localStorage when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove(themes.dark, themes.light);
    
    // Handle system preference
    if (theme === themes.system) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? themes.dark
        : themes.light;
      
      root.classList.add(systemTheme);
      return;
    }
    
    // Add selected theme class
    root.classList.add(theme);
    
    // Save preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, theme);
    }
  }, [theme, storageKey]);

  // Watch for system preference changes
  useEffect(() => {
    if (theme !== themes.system) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = window.document.documentElement;
      const systemTheme = mediaQuery.matches ? themes.dark : themes.light;
      
      root.classList.remove(themes.dark, themes.light);
      root.classList.add(systemTheme);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Provide theme context
  const value = {
    theme,
    setTheme: (newTheme) => setTheme(newTheme),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};