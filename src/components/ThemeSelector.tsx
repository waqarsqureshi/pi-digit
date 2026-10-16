import { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Check } from 'lucide-react';
import { ThemeId, THEME_OPTIONS } from '../types/theme';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  compact?: boolean;
}

export function ThemeSelector({
  currentTheme,
  onSelectTheme,
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeId = currentTheme === 'light' ? 'lite' : currentTheme;
  const currentOption = THEME_OPTIONS.find((t) => t.id === activeId) || THEME_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--theme-bg-subtle)] border border-[var(--theme-border)] hover:border-[#860038] text-[var(--theme-text-main)] text-sm font-semibold transition-colors cursor-pointer shadow-xs"
        title="Select UI Theme"
      >
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-black/20"
          style={{ backgroundColor: currentOption.primaryColor }}
        />
        <span className="hidden sm:inline">{currentOption.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded shadow-xl py-1 z-50 text-sm text-[var(--theme-text-main)] font-sans">
          <div className="px-3.5 py-1.5 text-xs uppercase font-bold text-[var(--theme-text-muted)] border-b border-[var(--theme-border)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#f39200]" />
            <span>Theme Preset</span>
          </div>
          {THEME_OPTIONS.map((opt) => {
            const isActive = activeId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelectTheme(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] transition-colors cursor-pointer text-left ${
                  isActive ? 'bg-[#860038]/10 text-[#860038] dark:text-[#f39200] font-bold' : 'text-[var(--theme-text-main)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20"
                    style={{ backgroundColor: opt.primaryColor }}
                  />
                  <div className="truncate">
                    <div className="truncate leading-tight font-medium text-sm">{opt.name}</div>
                    <div className="text-xs text-[var(--theme-text-muted)] truncate">{opt.tagline}</div>
                  </div>
                </div>
                {isActive && <Check className="w-4 h-4 text-[#860038] dark:text-[#f39200] shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
