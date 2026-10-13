import { useState } from 'react';
import { Radio, LineChart, HelpCircle, ChevronDown, AlertTriangle, Cpu, Layers, Zap, CheckCircle2, Wifi, Copy, Check } from 'lucide-react';
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
  selectedMode,
  onSetMode,
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
    <header className="bg-[#840038] text-white shadow-md sticky top-0 z-40">
      {/* 3-Zone Top Bar */}
      <div className="max-w-[1800px] mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Zone */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-xs">
            <Cpu className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
              Pi-Digit
            </span>
            <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-white/20 text-amber-200 border border-white/20 uppercase">
              RPi 4
            </span>
            <span className="hidden md:inline text-[11px] font-mono text-rose-100/75 ml-1">
              · Physical Computing
            </span>
          </div>
        </div>

        {/* Zone 2: Workspace Navigation & Sample Toggles */}
        <nav className="flex items-center gap-1.5 sm:gap-2.5 text-xs font-mono font-medium">
          <button
            onClick={() => setActiveView('workspace')}
            className={`transition-colors flex items-center gap-1 py-1 px-1.5 rounded ${
              activeView === 'workspace'
                ? 'text-amber-300 bg-white/10 font-bold'
                : 'text-rose-100 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span>Workspace</span>
          </button>

          <button
            onClick={onToggleSensorGraphs}
            className={`transition-colors flex items-center gap-1 py-1 px-1.5 rounded ${
              showSensorGraphs
                ? 'text-amber-300 bg-white/10 font-bold'
                : 'text-rose-100 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle Sensor Graphs"
          >
            <LineChart className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Sensors</span>
            <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${showSensorGraphs ? 'bg-amber-300 text-[#840038]' : 'bg-white/15 text-rose-200'}`}>
              {showSensorGraphs ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => setActiveView('help')}
            className={`transition-colors flex items-center gap-1 py-1 px-1.5 rounded ${
              activeView === 'help'
                ? 'text-amber-300 bg-white/10 font-bold'
                : 'text-rose-100 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
            <span>Wiki Help</span>
          </button>

          <a
            href="/"
            className="transition-colors flex items-center gap-1.5 py-1 px-2 rounded hover:bg-white/10 text-rose-100 hover:text-white"
            title="Return to Main Website"
          >
            <span>&larr; Website</span>
          </a>

          <a
            href="/wiki.html"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors flex items-center gap-1.5 py-1 px-2 rounded hover:bg-white/10 text-rose-100 hover:text-white"
            title="Open Technical Wiki and Documentation"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
            <span>Wiki Docs</span>
          </a>

          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs border border-white/20 font-semibold"
            title="GitHub Repository: pi-digit"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>

        {/* Zone 3: Hardware Emulator & Network Connection Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* LAN IP Address Indicator */}
          <button
            onClick={handleCopyIp}
            className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-medium border transition-colors cursor-pointer ${
              state?.network?.isOnline
                ? 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border-emerald-500/40'
                : 'bg-white/10 hover:bg-white/15 text-amber-200 border-white/20'
            }`}
            title={
              state?.network?.isOnline
                ? `LAN IP: ${state.network.localIp} · Click to copy connection URL (${state.network.networkUrl})`
                : 'Offline / Local loop only · Click to copy 127.0.0.1:3000'
            }
          >
            <Wifi className={`w-3 h-3 ${state?.network?.isOnline ? 'text-emerald-400' : 'text-amber-300'}`} />
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

          <div className="bg-white/10 border border-white/20 px-2.5 py-1 rounded text-xs font-mono font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>EMULATOR ENGINE</span>
          </div>

          {isPhysicalConnected ? (
            isPartial ? (
              <span className="hidden sm:inline-flex text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 border border-amber-300 uppercase items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-700 animate-pulse" />
                <span>LEDS ACTIVE (/dev/fb1)</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-400 text-emerald-950 border border-emerald-300 uppercase items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
                <span>HW CONNECTED</span>
              </span>
            )
          ) : (
            <span className="hidden sm:inline-flex text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-200 border border-rose-300/30 uppercase">
              STANDBY
            </span>
          )}
        </div>
      </div>

      {/* Hardware Status & Connection Bar */}
      <div
        className={`border-t border-b px-4 sm:px-6 py-2.5 text-xs font-mono flex flex-wrap items-center justify-between gap-3 ${
          isPhysicalConnected
            ? isPartial
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex items-center gap-2">
          {isPhysicalConnected ? (
            isPartial ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>
            {isPhysicalConnected ? (
              isPartial ? (
                <>
                  <strong>Hardware Emulator (Partial Link: 8×8 RGB LEDs Online):</strong> Physical LED matrix (/dev/fb1) is responding. Environmental sensors are in standby mode.
                </>
              ) : (
                <>
                  <strong>Hardware Emulator (Live Hardware Fully Linked):</strong> Real-time signals streaming from physical Raspberry Pi Sense HAT (HTS221, LPS25H, LSM9DS1).
                </>
              )
            ) : (
              <>
                <strong>Hardware Emulator (Standby Mode):</strong> Ready to connect to Raspberry Pi Sense HAT and GPIO buses. Click Connect below or check diagnostics.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors cursor-pointer border ${
                isPartial
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              Diagnostics
            </button>
          )}

          {onConnectHardware && (
            <button
              onClick={onConnectHardware}
              disabled={isProbingHardware}
              className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ${
                isPhysicalConnected
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isProbingHardware ? (
                <>
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Probing Hardware Pins &amp; Sensors...</span>
                </>
              ) : (
                <>
                  <Zap className={`w-3.5 h-3.5 ${isPhysicalConnected ? 'text-emerald-600' : 'text-amber-300'}`} />
                  <span>
                    {isPhysicalConnected ? 'Disconnect Hardware' : '⚡ Connect Hardware'}
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
