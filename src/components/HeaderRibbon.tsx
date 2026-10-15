import { useState } from 'react';
import {
  Layers,
  LineChart,
  Camera,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Wifi,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import { FullHardwareState } from '../types/digitalTwin';
import { ThemeId } from '../types/theme';
import { ThemeSelector } from './ThemeSelector';

interface HeaderRibbonProps {
  state: FullHardwareState | null;
  activeView: 'workspace' | 'camera' | 'help';
  setActiveView: (view: 'workspace' | 'camera' | 'help') => void;
  showSensorGraphs: boolean;
  onToggleSensorGraphs: () => void;
  selectedMode: 'simulation' | 'emulation';
  onSetMode: (mode: 'simulation' | 'emulation') => void;
  onConnectHardware?: () => void;
  onOpenDiagnostics?: () => void;
  isProbingHardware?: boolean;
  githubUrl?: string;
  theme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
}

export function HeaderRibbon({
  state,
  activeView,
  setActiveView,
  showSensorGraphs,
  onToggleSensorGraphs,
  onConnectHardware,
  onOpenDiagnostics,
  isProbingHardware = false,
  githubUrl = 'https://github.com/waqarsqureshi/pi-digit',
  theme,
  onSelectTheme,
}: HeaderRibbonProps) {
  const [copiedIp, setCopiedIp] = useState(false);
  const isPhysicalConnected = state?.isSenseHatConnected ?? false;
  const isPartial = isPhysicalConnected && state?.hardwareLinkStatus === 'partial';

  const handleCopyIp = () => {
    const url = state?.network?.networkUrl || `http://127.0.0.1:${state?.network?.port || 3000}`;
    navigator.clipboard?.writeText(url);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  return (
    <header className="bg-[var(--header-bg)] text-[var(--header-text)] shadow-md sticky top-0 z-40 border-b border-[var(--header-border)] transition-colors duration-200">
      {/* 3-Zone Top Bar */}
      <div className="max-w-[1800px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="flex items-center gap-2.5 text-inherit no-underline group transition-opacity hover:opacity-95"
            title="Return to Main Website"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center p-1.5 border border-white/15 shadow-2xs group-hover:bg-white/15 transition-colors">
              <img
                src="/assets/images/pi-logo.svg"
                alt="Raspberry Pi Logo"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight leading-none font-mono">
                Pi-Digit
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30 uppercase tracking-wide">
                Twin
              </span>
              <span className="hidden md:inline text-xs text-white/60 font-normal">
                · Raspberry Pi 4
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Workspace Navigation & Sample Toggles */}
        <nav className="flex items-center gap-1 sm:gap-1.5 text-xs font-medium">
          <button
            onClick={() => setActiveView('workspace')}
            className={`transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-lg cursor-pointer font-mono ${
              activeView === 'workspace'
                ? 'text-white bg-white/20 font-bold shadow-2xs border border-white/20'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </button>

          {/* Dedicated Camera & Morphological Vision View */}
          <button
            onClick={() => setActiveView('camera')}
            className={`transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-lg cursor-pointer font-mono ${
              activeView === 'camera'
                ? 'text-white bg-[var(--theme-accent)]/30 border border-[var(--theme-accent)] font-bold shadow-2xs text-[var(--theme-accent)]'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Open Pi Camera Module & Morphological Computer Vision View"
          >
            <Camera className="w-3.5 h-3.5 text-amber-300" />
            <span>Pi Camera</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-400 text-slate-950 uppercase hidden sm:inline">
              CV
            </span>
          </button>

          <button
            onClick={onToggleSensorGraphs}
            className={`transition-all flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg cursor-pointer font-mono ${
              showSensorGraphs
                ? 'text-white bg-white/20 font-bold shadow-2xs border border-white/20'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Sensor Graphs"
          >
            <LineChart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Graphs</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase transition-colors ${
                showSensorGraphs
                  ? 'bg-emerald-400 text-emerald-950'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {showSensorGraphs ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => setActiveView('help')}
            className={`transition-all flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg cursor-pointer font-mono ${
              activeView === 'help'
                ? 'text-white bg-white/20 font-bold shadow-2xs border border-white/20'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>
        </nav>

        {/* Zone 3: Theme Selector & Hardware Link Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* THEME SELECTOR PILL: Neon Hacker, Cyberpunk, Minimalist */}
          <ThemeSelector currentTheme={theme} onSelectTheme={onSelectTheme} />

          {/* LAN IP Address Indicator */}
          <button
            onClick={handleCopyIp}
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
              state?.network?.isOnline
                ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border-emerald-500/30'
                : 'bg-white/10 hover:bg-white/15 text-white/80 border-white/15'
            }`}
            title={
              state?.network?.isOnline
                ? `LAN IP: ${state.network.localIp} · Click to copy URL`
                : 'Offline / Local loop only · Click to copy 127.0.0.1:3000'
            }
          >
            <Wifi
              className={`w-3 h-3 ${state?.network?.isOnline ? 'text-emerald-400' : 'text-slate-300'}`}
            />
            <span>
              {state?.network?.isOnline
                ? `${state.network.localIp}:${state.network.port}`
                : '127.0.0.1:3000'}
            </span>
            {copiedIp ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-white/50" />
            )}
          </button>

          {/* Connection Status Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
              isPhysicalConnected
                ? isPartial
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                : 'bg-white/10 text-white/80 border-white/15'
            }`}
          >
            {isPhysicalConnected ? (
              isPartial ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Partial Pi</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Pi 4 Linked</span>
                </>
              )
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Sim Twin</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Header Notice / Diagnostic Banner when Partial or Disconnected */}
      <div className="bg-black/30 border-t border-white/5 px-3 sm:px-6 py-1 text-xs font-mono flex items-center justify-between gap-3 text-white/70">
        <div className="flex items-center gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent)] animate-pulse" />
          <span className="truncate text-[11px]">
            {isPhysicalConnected ? (
              isPartial ? (
                <>
                  <strong className="text-amber-300 font-bold">
                    Hardware Notice:
                  </strong>{' '}
                  LED Matrix (/dev/fb1) linked. Sensors on I2C bus are unlinked.
                </>
              ) : (
                <>
                  <strong className="text-emerald-300 font-bold">
                    Physical Hardware Online:
                  </strong>{' '}
                  LED Matrix (/dev/fb1), I2C sensors, and evdev joystick active.
                </>
              )
            ) : (
              <>
                <strong className="text-white font-bold">
                  Virtual Digital Twin:
                </strong>{' '}
                Browser emulator running. Ready to bridge to Raspberry Pi hardware.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer border ${
                isPartial
                  ? 'bg-amber-400/20 text-amber-200 border-amber-400/40 hover:bg-amber-400/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              Diagnostics
            </button>
          )}

          {onConnectHardware && (
            <button
              onClick={onConnectHardware}
              disabled={isProbingHardware}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isPhysicalConnected
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  : 'bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-accent-text)] shadow-xs'
              }`}
            >
              {isProbingHardware ? (
                <>
                  <span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Probing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  <span>{isPhysicalConnected ? 'Unlink Bridge' : 'Connect Pi'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
