import { Sparkles, Sun } from 'lucide-react';
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
  const activeId = currentTheme === 'light' ? 'lite' : currentTheme;

  return (
    <div
      className="flex items-center gap-1 p-1 bg-black/40 border border-white/15 backdrop-blur-md shadow-inner"
      role="radiogroup"
      aria-label="Theme selector"
    >
      {!compact && (
        <div className="flex items-center gap-1.5 px-2 text-xs font-bold tracking-wider uppercase text-white/80 select-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Theme</span>
        </div>
      )}

      {THEME_OPTIONS.map((opt) => {
        const isActive = activeId === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelectTheme(opt.id)}
            role="radio"
            aria-checked={isActive}
            title={`${opt.name}: ${opt.tagline}`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-bold transition-all duration-150 cursor-pointer select-none border ${
              isActive
                ? 'bg-white/20 text-white border-white/40 shadow-xs'
                : 'text-white/70 hover:text-white hover:bg-white/10 border-transparent'
            }`}
            style={{
              boxShadow: isActive ? `0 0 10px ${opt.primaryColor}66` : undefined,
              borderColor: isActive ? opt.primaryColor : 'transparent',
            }}
          >
            {opt.id === 'lite' ? (
              <Sun className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400 animate-spin-slow' : 'text-amber-300'}`} />
            ) : (
              <span
                className="w-2.5 h-2.5 shrink-0 transition-transform duration-150"
                style={{
                  backgroundColor: opt.primaryColor,
                  boxShadow: `0 0 8px ${opt.primaryColor}`,
                  transform: isActive ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            )}
            <span className="text-xs whitespace-nowrap">{opt.name}</span>
          </button>
        );
      })}
    </div>
  );
}
