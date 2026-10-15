export type ThemeId = 'neon' | 'cyberpunk' | 'lite' | 'light' | 'minimalist';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  tagline: string;
  emoji: string;
  primaryColor: string;
  bgColor: string;
  accentColor: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'neon',
    name: 'Neon Hacker',
    tagline: 'Matrix Phosphor Void',
    emoji: '🟢',
    primaryColor: '#00ff66',
    bgColor: '#030804',
    accentColor: '#34d399',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    tagline: 'Night City Synthwave',
    emoji: '🟣',
    primaryColor: '#ff007f',
    bgColor: '#0b0318',
    accentColor: '#00f0ff',
  },
  {
    id: 'lite',
    name: 'Lite',
    tagline: 'Clean High-Contrast Classroom',
    emoji: '☀️',
    primaryColor: '#0284c7',
    bgColor: '#f8fafc',
    accentColor: '#0369a1',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'Sleek Dark Obsidian',
    emoji: '⚪',
    primaryColor: '#e11d48',
    bgColor: '#09090b',
    accentColor: '#38bdf8',
  },
];
