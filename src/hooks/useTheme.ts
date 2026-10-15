import { useState, useEffect } from 'react';
import { ThemeId } from '../types/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('pi_digit_theme') as ThemeId;
      if (saved && (saved === 'neon' || saved === 'cyberpunk' || saved === 'minimalist')) {
        return saved;
      }
    } catch {}
    return 'neon'; // Default to exciting Neon Hacker for younger students!
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('pi_digit_theme', newTheme);
    } catch {}
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { theme, setTheme };
}
