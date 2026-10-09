import { Radio, LineChart, HelpCircle, ChevronDown, AlertTriangle, Cpu, Layers, Share2 } from 'lucide-react';
import { FullHardwareState } from '../types/digitalTwin';

interface HeaderRibbonProps {
  state: FullHardwareState | null;
  activeView: 'workspace' | 'help';
  setActiveView: (view: 'workspace' | 'help') => void;
  showSensorGraphs: boolean;
  onToggleSensorGraphs: () => void;
  selectedMode: 'simulation' | 'emulation';
  onSetMode: (mode: 'simulation' | 'emulation') => void;
  onOpenPublish: () => void;
}

export function HeaderRibbon({
  state,
  activeView,
  setActiveView,
  showSensorGraphs,
  onToggleSensorGraphs,
  selectedMode,
  onSetMode,
  onOpenPublish,
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

          <button
            onClick={onOpenPublish}
            className="transition-colors flex items-center gap-1 py-1 px-2 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-amber-100 border border-amber-300/30 font-semibold"
            title="Publish, share website link, or install on Raspberry Pi"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Publish & Share</span>
            <span className="sm:hidden">Share</span>
          </button>
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
                Simulation
              </option>
              <option value="emulation">
                {isPhysicalConnected ? 'Emulation (Live)' : 'Emulation (Not Connected)'}
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

      {/* Prominent Banner when in Emulation Mode and board is NOT connected */}
      {selectedMode === 'emulation' && !isPhysicalConnected && (
        <div className="bg-amber-50 border-t border-b border-amber-200 px-4 sm:px-6 py-2 text-xs font-mono text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Hardware Not Connected:</strong> In Emulation Mode, physical Sense HAT and Pi board must be connected. Since no physical board is detected, hardware outputs and sensors are set to <strong>NOT CONNECTED (inactive)</strong>. Switch to <strong>Simulation Mode</strong> to test with virtual sensors.
            </span>
          </div>
          <button
            onClick={() => onSetMode('simulation')}
            className="px-2.5 py-0.5 rounded text-[11px] bg-[#840038] hover:bg-[#6c002e] text-white font-medium shrink-0 ml-3 transition-colors shadow-sm"
          >
            Switch to Simulation
          </button>
        </div>
      )}
    </header>
  );
}
