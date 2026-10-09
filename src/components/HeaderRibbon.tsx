import { Radio, LineChart, HelpCircle, ChevronDown, AlertTriangle, Cpu, Layers, Zap, CheckCircle2 } from 'lucide-react';
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
  isProbingHardware = false,
  githubUrl = 'https://github.com/waqarsqureshi/pi-digit',
}: HeaderRibbonProps) {
  const isPhysicalConnected = state?.isSenseHatConnected ?? false;

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
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs border border-white/20 font-semibold"
            title="GitHub Repository: pi-digit"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="hidden sm:inline">GitHub: pi-digit</span>
            <span className="sm:hidden">GitHub</span>
          </a>
        </nav>

        {/* Zone 3: Mode Selector Dropdown & Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={selectedMode}
              onChange={(e) => onSetMode(e.target.value as 'simulation' | 'emulation')}
              className="appearance-none bg-white text-[#840038] text-xs font-mono font-bold pl-2.5 pr-7 py-1 rounded shadow-xs border border-rose-200 cursor-pointer focus:outline-none hover:bg-rose-50 transition-colors"
            >
              <option value="simulation">
                Simulation (Virtual Twin - Browser)
              </option>
              <option value="emulation">
                {isPhysicalConnected ? 'Emulation (Live Physical Pi)' : 'Emulation (Physical Hardware)'}
              </option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#840038] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {selectedMode === 'emulation' && !isPhysicalConnected && (
            <span className="hidden sm:inline-flex text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-200 border border-rose-300/30 uppercase">
              NOT CONNECTED
            </span>
          )}
        </div>
      </div>

      {/* Emulation Mode Status & Connection Bar */}
      {selectedMode === 'emulation' && (
        <div
          className={`border-t border-b px-4 sm:px-6 py-2.5 text-xs font-mono flex flex-wrap items-center justify-between gap-3 ${
            isPhysicalConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {isPhysicalConnected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>
              {isPhysicalConnected ? (
                <>
                  <strong>Emulation Mode (Live Hardware Linked):</strong> Real-time signals streaming from physical Raspberry Pi 4 Sense HAT (HTS221, LPS25H, LSM9DS1).
                </>
              ) : (
                <>
                  <strong>Emulation Mode (Hardware Standby / Disconnected):</strong> No physical Raspberry Pi 4 or Sense HAT detected. Connect your board or click Probe Hardware below.
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onConnectHardware && (
              <button
                onClick={onConnectHardware}
                disabled={isProbingHardware}
                className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                  isPhysicalConnected
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isProbingHardware ? (
                  <>
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Probing Hardware Pins & Sensors...</span>
                  </>
                ) : (
                  <>
                    <Zap className={`w-3.5 h-3.5 ${isPhysicalConnected ? 'text-emerald-600' : 'text-amber-300'}`} />
                    <span>
                      {isPhysicalConnected ? 'Disconnect Hardware' : '⚡ Connect to Hardware (Probe Pins)'}
                    </span>
                  </>
                )}
              </button>
            )}

            {!isPhysicalConnected && (
              <button
                onClick={() => onSetMode('simulation')}
                className="px-2.5 py-1 rounded text-[11px] bg-[#840038] hover:bg-[#6c002e] text-white font-medium shrink-0 transition-colors shadow-xs"
              >
                Switch to Simulation
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
