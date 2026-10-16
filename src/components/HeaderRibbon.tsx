import { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Camera,
  BookOpen,
  ChevronDown,
  Wrench,
  Cpu,
  RotateCcw,
} from 'lucide-react';
import { FullHardwareState } from '../types/digitalTwin';
import { ThemeId } from '../types/theme';
import { ThemeSelector } from './ThemeSelector';

interface HeaderRibbonProps {
  state: FullHardwareState | null;
  activeView: 'workspace' | 'camera' | 'help';
  setActiveView: (view: 'workspace' | 'camera' | 'help') => void;
  selectedMode?: 'simulation' | 'emulation';
  onSetMode?: (mode: 'simulation' | 'emulation') => void;
  onConnectHardware?: () => void;
  onOpenDiagnostics?: () => void;
  onRestoreDefaultView?: () => void;
  onOpenWiki?: () => void;
  isProbingHardware?: boolean;
  githubUrl?: string;
  theme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
}

export function HeaderRibbon({
  activeView,
  setActiveView,
  onConnectHardware,
  onOpenDiagnostics,
  onRestoreDefaultView,
  onOpenWiki,
  isProbingHardware = false,
  theme,
  onSelectTheme,
}: HeaderRibbonProps) {
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const viewsRef = useRef<HTMLDivElement>(null);

  // Close views menu when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewsRef.current && !viewsRef.current.contains(event.target as Node)) {
        setViewsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-[var(--theme-bg-card)] text-[var(--theme-text-main)] shadow-xs sticky top-0 z-40 border-b border-[var(--theme-border)] transition-colors duration-150">
      <div className="w-full px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        {/* Brand Zone - Authoritative University of Galway & Raspberry Pi Identity */}
        <div className="flex items-center gap-3.5 shrink-0">
          <a
            href="/"
            className="flex items-center gap-3 text-inherit no-underline group hover:opacity-95 transition-opacity"
            title="University of Galway · Raspberry Pi Digital Twin Studio"
          >
            {/* University of Galway OIP Crest & Raspberry Pi Insignia */}
            <div className="h-10 px-2.5 rounded bg-[var(--theme-bg-subtle)] border border-[var(--theme-border)] flex items-center justify-center gap-2 shadow-xs">
              <img
                src="/assets/images/OIP.svg"
                alt="University of Galway (OÉ Gaillimh) Crest"
                className="h-8 w-auto object-contain"
              />
              <div className="w-[1px] h-5 bg-[var(--theme-border)]" />
              <img
                src="/assets/images/pi-logo.svg"
                alt="Raspberry Pi"
                className="w-5.5 h-5.5 object-contain"
              />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-[#860038] uppercase font-mono">
                  University of Galway
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-[#f39200]" />
                <span className="text-[11px] font-bold text-[#f39200] font-mono uppercase">
                  OÉ Gaillimh
                </span>
              </div>
              <span className="text-base sm:text-lg font-bold tracking-tight leading-snug text-[var(--theme-text-main)] font-sans">
                Pi-Digit Digital Twin Studio
              </span>
            </div>
          </a>
        </div>

        {/* Center Zone: Professional Segmented View Switcher */}
        <div className="hidden md:flex items-center bg-[var(--theme-bg-subtle)] p-1 rounded border border-[var(--theme-border)] text-sm font-semibold">
          <button
            onClick={() => setActiveView('workspace')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeView === 'workspace'
                ? 'bg-[var(--theme-bg-card)] text-[#860038] dark:text-[#f39200] shadow-xs font-bold'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Workspace Studio</span>
          </button>

          <button
            onClick={() => setActiveView('camera')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeView === 'camera'
                ? 'bg-[var(--theme-bg-card)] text-[#860038] dark:text-[#f39200] shadow-xs font-bold'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Pi Camera & CV</span>
          </button>

          <button
            onClick={() => setActiveView('help')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeView === 'help'
                ? 'bg-[var(--theme-bg-card)] text-[#860038] dark:text-[#f39200] shadow-xs font-bold'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Help & Manual</span>
          </button>
        </div>

        {/* Mobile View Dropdown (Visible on small screens) */}
        <div className="md:hidden relative" ref={viewsRef}>
          <button
            onClick={() => setViewsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--theme-bg-subtle)] border border-[var(--theme-border)] text-[var(--theme-text-main)] text-sm font-semibold cursor-pointer shadow-xs"
          >
            {activeView === 'workspace' && <Layers className="w-4 h-4 text-[#860038]" />}
            {activeView === 'camera' && <Camera className="w-4 h-4 text-[#f39200]" />}
            {activeView === 'help' && <BookOpen className="w-4 h-4 text-[#860038]" />}
            <span>{activeView === 'workspace' ? 'Workspace' : activeView === 'camera' ? 'Camera' : 'Help'}</span>
            <ChevronDown className="w-4 h-4 text-[var(--theme-text-muted)]" />
          </button>

          {viewsMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-56 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded shadow-xl py-1 z-50 text-sm font-semibold text-[var(--theme-text-main)]">
              <button
                onClick={() => {
                  setActiveView('workspace');
                  setViewsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left"
              >
                <Layers className="w-4 h-4 text-[#860038]" />
                <span>Workspace Studio</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('camera');
                  setViewsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left"
              >
                <Camera className="w-4 h-4 text-[#f39200]" />
                <span>Pi Camera & CV</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('help');
                  setViewsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left"
              >
                <BookOpen className="w-4 h-4 text-[#860038]" />
                <span>Help & Manual</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Zone: Primary Actions, Restore Default View, Wiki, Themes & Diagnostics */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Promoted "Restore Default View" Action Button */}
          {onRestoreDefaultView && (
            <button
              onClick={onRestoreDefaultView}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[var(--theme-bg-subtle)] hover:bg-[var(--theme-border)] border border-[var(--theme-border)] text-[var(--theme-text-main)] text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Restore all 8 applets and reset to the default workspace view"
            >
              <RotateCcw className="w-4 h-4 text-[#f39200] shrink-0" />
              <span className="hidden lg:inline">Restore Default View</span>
              <span className="lg:hidden">Default View</span>
            </button>
          )}

          {/* Promoted "Emulator Wiki" Action Button */}
          {onOpenWiki && (
            <button
              onClick={onOpenWiki}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#860038] hover:bg-[#9e0e47] text-white text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Open Interactive Emulator Wiki & Python API Reference"
            >
              <BookOpen className="w-4 h-4 text-white shrink-0" />
              <span className="hidden sm:inline">Emulator Wiki</span>
              <span className="sm:hidden">Wiki</span>
            </button>
          )}

          {/* Connect Hardware Probe */}
          {onConnectHardware && (
            <button
              onClick={onConnectHardware}
              disabled={isProbingHardware}
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-sm font-semibold cursor-pointer transition-colors"
              title="Connect / Probe Physical Raspberry Pi Hardware"
            >
              <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isProbingHardware ? 'Probing...' : 'Probe Pi'}</span>
            </button>
          )}

          {/* UI Themes Selector */}
          <ThemeSelector currentTheme={theme} onSelectTheme={onSelectTheme} />

          {/* Hardware Diagnostics Modal Trigger */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="p-2 rounded bg-[var(--theme-bg-subtle)] border border-[var(--theme-border)] hover:border-[#860038] text-[var(--theme-text-main)] cursor-pointer transition-colors shadow-xs"
              title="System Diagnostics & Hardware Self-Test"
            >
              <Wrench className="w-4 h-4 text-[var(--theme-text-muted)]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
