import { Sparkles } from 'lucide-react';
import { ThemeId, THEME_OPTIONS } from '../types/theme';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  compact?: boolean;
}

export function ThemeSelector({
  currentTheme,
  onSelectTheme,
  compact = false,
}: ThemeSelectorProps) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/10 backdrop-blur-md shadow-inner"
      role="radiogroup"
      aria-label="Theme selector"
    >
      {!compact && (
        <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold tracking-wider uppercase text-white/70 select-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="hidden lg:inline">Theme</span>
        </div>
      )}

      {THEME_OPTIONS.map((opt) => {
        const isActive = currentTheme === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelectTheme(opt.id)}
            role="radio"
            aria-checked={isActive}
            title={`${opt.name}: ${opt.tagline}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all duration-200 cursor-pointer select-none ${
              isActive
                ? 'bg-white/20 text-white shadow-xs border border-white/25 scale-[1.02]'
                : 'text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
            style={{
              boxShadow: isActive ? `0 0 12px ${opt.primaryColor}55` : undefined,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200"
              style={{
                backgroundColor: opt.primaryColor,
                boxShadow: `0 0 8px ${opt.primaryColor}`,
                transform: isActive ? 'scale(1.2)' : 'scale(1)',
              }}
            />
            <span className="text-[11px] whitespace-nowrap">{opt.name}</span>
          </button>
        );
      })}
    </div>
  );
}
