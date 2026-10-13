import { useState } from 'react';
import {
  Layers,
  LineChart,
  HelpCircle,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { FullHardwareState } from '../types/digitalTwin';

interface HeaderRibbonProps {
  state: FullHardwareState | null;
  activeView: 'workspace' | 'help';
  setActiveView: (view: 'workspace' | 'help') => void;
  showSensorGraphs: boolean;
  onToggleSensorGraphs: () => void;
  selectedMode: 'simulation' | 'emulation';
  onSetMode: (mode: 'simulation' | 'emulation') => void;
  onConnectHardware?: () => void;
  onOpenDiagnostics?: () => void;
  isProbingHardware?: boolean;
  githubUrl?: string;
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
    <header className="bg-[#840038] text-white shadow-xs sticky top-0 z-40 border-b border-[#5c0027]">
      {/* 3-Zone Top Bar */}
      <div className="max-w-[1800px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="flex items-center gap-2.5 text-white no-underline group transition-opacity hover:opacity-95"
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
              <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
                Pi-Digit
              </span>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-white/15 text-rose-100 border border-white/15 uppercase tracking-wide">
                Twin
              </span>
              <span className="hidden md:inline text-xs text-rose-200/80 font-normal">
                · Raspberry Pi 4 Model B
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Workspace Navigation & Sample Toggles */}
        <nav className="flex items-center gap-1 sm:gap-1.5 text-xs font-medium">
          <button
            onClick={() => setActiveView('workspace')}
            className={`transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-md cursor-pointer ${
              activeView === 'workspace'
                ? 'text-white bg-white/20 font-semibold shadow-2xs'
                : 'text-rose-100/90 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-white/90" />
            <span>Workspace</span>
          </button>

          <button
            onClick={onToggleSensorGraphs}
            className={`transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-md cursor-pointer ${
              showSensorGraphs
                ? 'text-white bg-white/20 font-semibold shadow-2xs'
                : 'text-rose-100/90 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Sensor Graphs"
          >
            <LineChart className="w-3.5 h-3.5 text-white/90" />
            <span className="hidden sm:inline">Telemetry</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold transition-colors ${
                showSensorGraphs
                  ? 'bg-emerald-400 text-emerald-950'
                  : 'bg-white/15 text-rose-200'
              }`}
            >
              {showSensorGraphs ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => setActiveView('help')}
            className={`transition-all flex items-center gap-1.5 py-1.5 px-3 rounded-md cursor-pointer ${
              activeView === 'help'
                ? 'text-white bg-white/20 font-semibold shadow-2xs'
                : 'text-rose-100/90 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-white/90" />
            <span>Wiki &amp; Guide</span>
          </button>

          <a
            href="/"
            className="transition-all flex items-center gap-1.5 py-1.5 px-2.5 rounded-md hover:bg-white/10 text-rose-100/90 hover:text-white text-xs font-medium"
            title="Return to Main Website"
          >
            <span>&larr; Website</span>
          </a>

          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex transition-all items-center gap-1.5 py-1.5 px-3 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs border border-white/15 font-medium ml-1"
            title="GitHub Repository: pi-digit"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub</span>
          </a>
        </nav>

        {/* Zone 3: Hardware Emulator & Network Connection Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* LAN IP Address Indicator */}
          <button
            onClick={handleCopyIp}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-all cursor-pointer ${
              state?.network?.isOnline
                ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border-emerald-500/30'
                : 'bg-white/10 hover:bg-white/15 text-rose-100 border-white/15'
            }`}
            title={
              state?.network?.isOnline
                ? `LAN IP: ${state.network.localIp} · Click to copy URL`
                : 'Offline / Local loop only · Click to copy 127.0.0.1:3000'
            }
          >
            <Wifi
              className={`w-3 h-3 ${state?.network?.isOnline ? 'text-emerald-400' : 'text-rose-200'}`}
            />
            <span>
              {state?.network?.isOnline
                ? `${state.network.localIp}:${state.network.port}`
                : '127.0.0.1:3000'}
            </span>
            {copiedIp ? (
              <Check className="w-3 h-3 text-emerald-300 ml-0.5" />
            ) : (
              <Copy className="w-3 h-3 opacity-60 ml-0.5" />
            )}
          </button>

          {/* Clean Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-xs font-medium text-white shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isPhysicalConnected
                  ? isPartial
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400 animate-pulse'
                  : 'bg-emerald-300'
              }`}
            />
            <span className="hidden sm:inline">
              {isPhysicalConnected
                ? isPartial
                  ? 'LEDs Active (/dev/fb1)'
                  : 'Hardware Linked'
                : 'Digital Twin Ready'}
            </span>
            <span className="sm:hidden">
              {isPhysicalConnected ? 'Linked' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Status & Connection Sub-Bar */}
      <div
        className={`border-t px-4 sm:px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3 transition-colors ${
          isPhysicalConnected
            ? isPartial
              ? 'bg-amber-50/95 border-amber-200 text-amber-950'
              : 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
            : 'bg-slate-50/95 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isPhysicalConnected ? (
            isPartial ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          )}
          <span className="truncate">
            {isPhysicalConnected ? (
              isPartial ? (
                <>
                  <strong className="font-semibold text-amber-900">
                    Partial Hardware Link:
                  </strong>{' '}
                  Physical 8×8 RGB LEDs (/dev/fb1) are online. Sensors in standby.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-emerald-900">
                    Live Hardware Connected:
                  </strong>{' '}
                  Sense HAT matrix &amp; I2C sensors streaming in real time.
                </>
              )
            ) : (
              <>
                <strong className="font-semibold text-slate-900">
                  Virtual Digital Twin Active:
                </strong>{' '}
                Running in browser emulator mode. Ready to sync with Raspberry Pi hardware.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                isPartial
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              Diagnostics
            </button>
          )}

          {onConnectHardware && (
            <button
              onClick={onConnectHardware}
              disabled={isProbingHardware}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                isPhysicalConnected
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                  : 'bg-[#840038] hover:bg-[#6c002e] text-white'
              }`}
            >
              {isProbingHardware ? (
                <>
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Probing...</span>
                </>
              ) : (
                <>
                  <Zap
                    className={`w-3.5 h-3.5 ${
                      isPhysicalConnected ? 'text-slate-600' : 'text-white'
                    }`}
                  />
                  <span>
                    {isPhysicalConnected ? 'Unlink Bridge' : 'Connect Hardware'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
