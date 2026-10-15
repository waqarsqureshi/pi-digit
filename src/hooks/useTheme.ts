import { useState, useEffect } from 'react';
import { ThemeId } from '../types/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('pi_digit_theme') as ThemeId;
      if (saved && (saved === 'neon' || saved === 'cyberpunk' || saved === 'lite' || saved === 'light' || saved === 'minimalist')) {
        return saved === 'light' ? 'lite' : saved;
      }
    } catch {}
    return 'neon'; // Default to exciting Neon Hacker for younger students!
  });

  const setTheme = (newTheme: ThemeId) => {
    const normalized = newTheme === 'light' ? 'lite' : newTheme;
    setThemeState(normalized);
    try {
      localStorage.setItem('pi_digit_theme', normalized);
    } catch {}
    document.documentElement.setAttribute('data-theme', normalized);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { theme, setTheme };
}
