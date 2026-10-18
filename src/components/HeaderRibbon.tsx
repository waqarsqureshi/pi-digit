import { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Camera,
  BookOpen,
  ChevronDown,
  Wrench,
  Cpu,
  RotateCcw,
  LayoutGrid,
  Move,
  PanelLeft,
  LayoutTemplate,
  Check,
  ExternalLink,
} from 'lucide-react';
import { FullHardwareState } from '../types/digitalTwin';
import { ThemeId } from '../types/theme';
import { ThemeSelector } from './ThemeSelector';

export type WorkspaceLayout = 'grid' | 'floating' | 'studio-focus' | 'bench';

interface HeaderRibbonProps {
  state: FullHardwareState | null;
  activeView: 'workspace' | 'camera' | 'help';
  setActiveView: (view: 'workspace' | 'camera' | 'help') => void;
  layoutMode?: WorkspaceLayout;
  onSelectLayout?: (layout: WorkspaceLayout) => void;
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
  state,
  activeView,
  setActiveView,
  layoutMode = 'grid',
  onSelectLayout,
  onConnectHardware,
  onOpenDiagnostics,
  onRestoreDefaultView,
  onOpenWiki,
  isProbingHardware = false,
  theme,
  onSelectTheme,
}: HeaderRibbonProps) {
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const viewsRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const systemStatus =
    state?.systemMode === 'simulation'
      ? 'Simulation'
      : state?.hardwareLinkStatus === 'full'
        ? 'Hardware connected'
        : state?.hardwareLinkStatus === 'partial'
          ? 'Partial connection'
          : state
            ? 'Ready'
            : 'Connecting';
  const statusColor =
    state?.systemMode === 'simulation' || state?.hardwareLinkStatus === 'full'
      ? 'bg-emerald-500'
      : state?.hardwareLinkStatus === 'partial'
        ? 'bg-amber-500'
        : 'bg-slate-400';

  // Close menus when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewsRef.current && !viewsRef.current.contains(event.target as Node)) {
        setViewsMenuOpen(false);
      }
      if (layoutRef.current && !layoutRef.current.contains(event.target as Node)) {
        setLayoutMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#6b002d] bg-[#840038] text-white shadow-sm transition-colors duration-150">
      <div className="flex min-h-[92px] w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3 sm:px-6">
        {/* Brand Zone - Raspberry Pi Digital Twin Studio */}
        <div className="flex items-center gap-3.5 shrink-0">
          <a
            href="/"
            className="flex items-center gap-3 text-inherit no-underline group hover:opacity-95 transition-opacity"
            title="Raspberry Pi Digital Twin Studio"
          >
            {/* Raspberry Pi Insignia */}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 shadow-sm">
              <img
                src="/assets/images/pi-logo.svg"
                alt="Raspberry Pi"
                className="w-7 h-7 object-contain"
              />
            </div>
            
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Pi-Digit
                </span>
                <span className="hidden rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-rose-100 sm:inline-flex">
                  DIGITAL TWIN
                </span>
              </div>
              <span className="text-xs text-rose-100">
                Raspberry Pi hardware studio
              </span>
            </div>
          </a>
        </div>

        {/* Center Zone: Professional Segmented View Switcher */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 rounded-xl border border-white/20 bg-[#6b002d]/70 p-1 text-sm font-medium md:flex"
        >
          <button
            onClick={() => setActiveView('workspace')}
            aria-current={activeView === 'workspace' ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-base transition-all cursor-pointer ${
              activeView === 'workspace'
                ? 'bg-white text-[#840038] shadow-sm font-bold'
                : 'text-rose-100 hover:bg-white/15 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Workspace</span>
          </button>

          <button
            onClick={() => setActiveView('camera')}
            aria-current={activeView === 'camera' ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-base transition-all cursor-pointer ${
              activeView === 'camera'
                ? 'bg-white text-[#840038] shadow-sm font-bold'
                : 'text-rose-100 hover:bg-white/15 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Camera</span>
          </button>

          <a
            href="/wiki.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-base transition-all cursor-pointer text-rose-100 hover:bg-white/15 hover:text-white"
            title="Open Complete Documentation & Hardware Architecture Wiki"
          >
            <BookOpen className="w-4 h-4 shrink-0 text-rose-100" />
            <span>Wiki</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </nav>

        {/* Layout Selection Top-Down Dropdown Menu (Beside Workspace Controls) */}
        {activeView === 'workspace' && onSelectLayout && (
          <div className="relative" ref={layoutRef}>
            <button
              onClick={() => setLayoutMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/20 cursor-pointer"
              title="Workspace Layout Selection"
            >
              {layoutMode === 'floating' && <Move className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />}
              {layoutMode === 'grid' && <LayoutGrid className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />}
              {layoutMode === 'studio-focus' && <PanelLeft className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />}
              {layoutMode === 'bench' && <LayoutTemplate className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />}
              <span className="hidden xl:inline text-xs font-mono uppercase text-rose-100">Layout:</span>
              <span className="text-xs font-bold text-white">
                {layoutMode === 'floating'
                  ? 'Floating'
                  : layoutMode === 'grid'
                  ? '2-Col Grid'
                  : layoutMode === 'studio-focus'
                  ? 'Studio Focus'
                  : 'Hardware Bench'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-rose-100" />
            </button>

            {layoutMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-64 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-md shadow-2xl py-1.5 z-50 text-xs font-medium text-[var(--theme-text-main)] divide-y divide-[var(--theme-border)]">
                <div className="px-3 py-1 text-[10px] font-mono uppercase text-[var(--theme-text-muted)] font-bold">
                  Select Workspace Layout
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      onSelectLayout('grid');
                      setLayoutMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left transition-colors ${
                      layoutMode === 'grid' ? 'text-[#860038] dark:text-[#f39200] font-bold bg-[var(--theme-bg-subtle)]/80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />
                      <div>
                        <div className="font-semibold text-xs">2-Column Grid</div>
                        <div className="text-[10px] text-[var(--theme-text-muted)] font-normal">Docked split: Code Studio & Peripherals</div>
                      </div>
                    </div>
                    {layoutMode === 'grid' && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>

                  <button
                    onClick={() => {
                      onSelectLayout('floating');
                      setLayoutMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left transition-colors ${
                      layoutMode === 'floating' ? 'text-[#860038] dark:text-[#f39200] font-bold bg-[var(--theme-bg-subtle)]/80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Move className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />
                      <div>
                        <div className="font-semibold text-xs">Floating Windows</div>
                        <div className="text-[10px] text-[var(--theme-text-muted)] font-normal">Drag, layer & reposition applets freely</div>
                      </div>
                    </div>
                    {layoutMode === 'floating' && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>

                  <button
                    onClick={() => {
                      onSelectLayout('studio-focus');
                      setLayoutMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left transition-colors ${
                      layoutMode === 'studio-focus' ? 'text-[#860038] dark:text-[#f39200] font-bold bg-[var(--theme-bg-subtle)]/80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <PanelLeft className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />
                      <div>
                        <div className="font-semibold text-xs">Studio Focus</div>
                        <div className="text-[10px] text-[var(--theme-text-muted)] font-normal">Expanded 74% width code editor & terminal</div>
                      </div>
                    </div>
                    {layoutMode === 'studio-focus' && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>

                  <button
                    onClick={() => {
                      onSelectLayout('bench');
                      setLayoutMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left transition-colors ${
                      layoutMode === 'bench' ? 'text-[#860038] dark:text-[#f39200] font-bold bg-[var(--theme-bg-subtle)]/80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutTemplate className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />
                      <div>
                        <div className="font-semibold text-xs">Hardware Bench</div>
                        <div className="text-[10px] text-[var(--theme-text-muted)] font-normal">Prioritize peripherals & full monitoring canvas</div>
                      </div>
                    </div>
                    {layoutMode === 'bench' && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile View Dropdown (Visible on small screens) */}
        <div className="relative md:hidden" ref={viewsRef}>
          <button
            onClick={() => setViewsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white cursor-pointer"
          >
            {activeView === 'workspace' && <Layers className="w-4 h-4 text-white" />}
            {activeView === 'camera' && <Camera className="w-4 h-4 text-white" />}
            {activeView === 'help' && <BookOpen className="w-4 h-4 text-white" />}
            <span>{activeView === 'workspace' ? 'Workspace' : activeView === 'camera' ? 'Camera' : 'Wiki'}</span>
            <ChevronDown className="w-4 h-4 text-rose-100" />
          </button>

          {viewsMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-56 bg-[#6b002d] border border-white/20 rounded shadow-xl py-1 z-50 text-sm font-semibold text-white">
              <button
                onClick={() => {
                  setActiveView('workspace');
                  setViewsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left"
              >
                <Layers className="w-4 h-4 text-rose-100" />
                <span>Workspace</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('camera');
                  setViewsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left"
              >
                <Camera className="w-4 h-4 text-rose-100" />
                <span>Camera</span>
              </button>
              <a
                href="/wiki.html"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setViewsMenuOpen(false)}
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-[var(--theme-bg-subtle)] cursor-pointer text-left text-inherit no-underline"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-rose-100" />
                  <span>Wiki</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>
          )}
        </div>

        {/* Right Zone: Primary Actions, Restore Default View, Wiki, Themes & Diagnostics */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="hidden items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-xs font-medium text-rose-100 lg:flex"
            title={`System status: ${systemStatus}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span>{systemStatus}</span>
          </div>
          {/* Promoted "Restore Default View" Action Button */}
          {onRestoreDefaultView && (
            <button
              onClick={onRestoreDefaultView}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 cursor-pointer"
              title="Restore all 8 applets and reset to the default workspace view"
            >
              <RotateCcw className="w-4 h-4 text-[#f39200] shrink-0" />
              <span className="hidden xl:inline">Reset workspace</span>
              <span className="xl:hidden">Reset</span>
            </button>
          )}

          {/* Connect Hardware Probe */}
          {onConnectHardware && (
            <button
              onClick={onConnectHardware}
              disabled={isProbingHardware}
              className="hidden xl:flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300 cursor-pointer"
              title="Detect and connect physical Raspberry Pi hardware"
            >
              <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isProbingHardware ? 'Detecting...' : 'Detect Hardware'}</span>
            </button>
          )}

          {/* UI Themes Selector */}
          <ThemeSelector currentTheme={theme} onSelectTheme={onSelectTheme} />

          {/* Hardware Diagnostics Modal Trigger */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="rounded-lg border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20 cursor-pointer"
              title="System Diagnostics & Hardware Self-Test"
            >
              <Wrench className="w-4 h-4 text-rose-100" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
