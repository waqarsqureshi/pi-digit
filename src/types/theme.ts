export type ThemeId = 'galway' | 'galway-dark' | 'lite' | 'light' | 'minimalist' | 'neon' | 'cyberpunk';

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
    id: 'galway',
    name: 'Univ. of Galway (Light)',
    tagline: 'Academic Maroon & Gold',
    emoji: '🏛️',
    primaryColor: '#860038',
    bgColor: '#ffffff',
    accentColor: '#f39200',
  },
  {
    id: 'galway-dark',
    name: 'Univ. of Galway (Dark)',
    tagline: 'Galway Engineering Obsidian',
    emoji: '🌑',
    primaryColor: '#860038',
    bgColor: '#0c0e14',
    accentColor: '#f39200',
  },
  {
    id: 'lite',
    name: 'Clean Slate Light',
    tagline: 'High-Contrast Classroom',
    emoji: '☀️',
    primaryColor: '#0284c7',
    bgColor: '#f8fafc',
    accentColor: '#0369a1',
  },
  {
    id: 'minimalist',
    name: 'Dark Studio',
    tagline: 'Deep Slate Workstation',
    emoji: '⚪',
    primaryColor: '#3b82f6',
    bgColor: '#090d16',
    accentColor: '#06b6d4',
  },
];
