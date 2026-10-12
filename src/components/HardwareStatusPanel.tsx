import React, { useState } from 'react';
import {
  Cpu,
  Activity,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Wifi,
  ChevronDown,
  Gauge,
  Sliders,
  Terminal,
} from 'lucide-react';
import { FullHardwareState } from '../types/digitalTwin';

interface HardwareStatusPanelProps {
  state: FullHardwareState | null;
  selectedMode: 'simulation' | 'emulation';
  isPhysicalConnected: boolean;
  onConnectHardware: (force?: boolean) => Promise<any>;
  onPingHardware: () => Promise<any>;
  isPinging: boolean;
  isProbing: boolean;
  sensorSource?: 'hardware' | 'simulated';
  onToggleSensorSource?: (source: 'hardware' | 'simulated') => void;
  operatingMode?: 'execution' | 'emulation';
  onToggleOperatingMode?: (mode: 'execution' | 'emulation') => void;
  lastPingResult?: {
    latencyMs?: number;
    timestamp?: number;
    message?: string;
    i2cStatus?: string;
    gpioStatus?: string;
    lcdStatus?: string;
  } | null;
  onSwitchMode?: (mode: 'simulation' | 'emulation') => void;
}

export function HardwareStatusPanel({
  state,
  selectedMode,
  isPhysicalConnected,
  onConnectHardware,
  onPingHardware,
  isPinging,
  isProbing,
  sensorSource = state?.sensorSource || 'simulated',
  onToggleSensorSource,
  operatingMode = state?.operatingMode || 'execution',
  onToggleOperatingMode,
  lastPingResult,
  onSwitchMode,
}: HardwareStatusPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [lastActionTime, setLastActionTime] = useState<string>(new Date().toLocaleTimeString());

  const handlePing = async () => {
    await onPingHardware();
    setLastActionTime(new Date().toLocaleTimeString());
  };

  const handleToggleConnect = async () => {
    await onConnectHardware();
    setLastActionTime(new Date().toLocaleTimeString());
  };

  const isLinked = isPhysicalConnected;
  const isEmulationOffline = selectedMode === 'emulation' && !isPhysicalConnected;
  const isRealSensorsOn = sensorSource === 'hardware';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col gap-3 text-slate-800 min-w-0">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#840038]" />
              <span>Raspberry Pi Hardware Status</span>
            </h2>
            {isLinked ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE HARDWARE LINKED</span>
              </span>
            ) : isEmulationOffline ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>STANDBY (UNLINKED)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-sky-100 text-sky-800 border border-sky-300">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span>VIRTUAL SIMULATOR</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            Real-time physical hardware bus linkage & remote control (BCM2711 · Sense HAT · GPIO)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePing}
            disabled={isPinging || isProbing}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors shadow-xs"
            title="Probe connection latency and bus health"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Pinging...' : 'Reconnect / Ping'}</span>
          </button>

          {selectedMode === 'simulation' ? (
            <div
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1.5 select-none"
              title="In simulation mode, connecting to actual board is not allowed. Switch to Emulation mode to connect physical hardware."
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Link Disabled (Simulation)</span>
            </div>
          ) : (
            <button
              onClick={handleToggleConnect}
              disabled={isPinging || isProbing}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                isLinked
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title="Toggle physical hardware linkage bridge"
            >
              <Zap className={`w-3.5 h-3.5 ${isLinked ? 'text-rose-500' : 'text-amber-300'}`} />
              <span>{isLinked ? 'Unlink Bridge' : 'Connect Hardware'}</span>
            </button>
          )}
        </div>
      </div>

      {/* DUAL MODE & SENSOR SOURCE CONTROL BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg">
        {/* Operating Mode Selector */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-200 rounded">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#840038]" />
            <span className="font-semibold text-slate-700">Mode:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleOperatingMode && onToggleOperatingMode('execution')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                operatingMode === 'execution'
                  ? 'bg-[#840038] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Mode 1: User Python/C code runs on Pi and visualizes in emulator"
            >
              1: Code Execution
            </button>
            <button
              onClick={() => onToggleOperatingMode && onToggleOperatingMode('emulation')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                operatingMode === 'emulation'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Mode 2: UI directly controls physical hardware (Remote Control Panel)"
            >
              2: UI Controls Hardware
            </button>
          </div>
        </div>

        {/* Global Sensor Mode Switch */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-200 rounded">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#840038]" />
            <span className="font-semibold text-slate-700">Sensor Mode:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleSensorSource && onToggleSensorSource('hardware')}
              disabled={selectedMode === 'simulation'}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
                selectedMode === 'simulation'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : isRealSensorsOn
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={selectedMode === 'simulation' ? 'Hardware sensors disabled in simulation mode' : 'Read real sensor values from physical Sense HAT'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isRealSensorsOn && selectedMode !== 'simulation' ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`} />
              <span>ON (Hardware)</span>
            </button>
            <button
              onClick={() => onToggleSensorSource && onToggleSensorSource('simulated')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                !isRealSensorsOn || selectedMode === 'simulation'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Generate simulated data and allow manual overrides"
            >
              OFF (Simulated)
            </button>
          </div>
        </div>
      </div>

      {/* Main Status Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        {/* Metric 1: Connection Health */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Radio className="w-3 h-3 text-[#840038]" />
            <span>BUS LINK</span>
          </span>
          <span className={`text-xs font-bold truncate ${isLinked ? 'text-emerald-700' : isEmulationOffline ? 'text-rose-700' : 'text-sky-700'}`}>
            {isLinked ? 'Physical Online' : isEmulationOffline ? 'Not Connected' : 'Simulated Twin'}
          </span>
          <span className="text-[9px] text-slate-400">
            {operatingMode === 'emulation' ? 'Remote Control' : 'Execution Mirror'}
          </span>
        </div>

        {/* Metric 2: Round-Trip Latency */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-[#840038]" />
            <span>PING LATENCY</span>
          </span>
          <span className="text-xs font-bold text-slate-900 truncate">
            {lastPingResult?.latencyMs !== undefined ? `${lastPingResult.latencyMs} ms` : '< 1 ms (Local)'}
          </span>
          <span className="text-[9px] text-slate-400">
            {lastActionTime ? `Ping @ ${lastActionTime}` : 'Daemon socket'}
          </span>
        </div>

        {/* Metric 3: Target Architecture */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[#840038]" />
            <span>TARGET SOC</span>
          </span>
          <span className="text-xs font-bold text-slate-900 truncate">
            BCM2711 Quad
          </span>
          <span className="text-[9px] text-slate-400 truncate">
            {state?.system.model || 'Raspberry Pi 4B'}
          </span>
        </div>

        {/* Metric 4: Sensor Source */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Wifi className="w-3 h-3 text-[#840038]" />
            <span>TELEMETRY SOURCE</span>
          </span>
          <span className={`text-xs font-bold truncate ${isRealSensorsOn ? 'text-emerald-700' : 'text-sky-700'}`}>
            {isRealSensorsOn ? 'Live Sense HAT' : 'Simulated Override'}
          </span>
          <span className="text-[9px] text-slate-400 truncate">
            {isRealSensorsOn ? 'HTS221 / LPS25H' : 'Manual / Noise'}
          </span>
        </div>
      </div>

      {/* Real-Time Diagnostic Line */}
      <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isLinked ? 'bg-emerald-400 animate-pulse' : isEmulationOffline ? 'bg-rose-400' : 'bg-sky-400'}`} />
          <span className="truncate text-slate-300">
            {lastPingResult?.message ||
              (isLinked
                ? `Hardware Link Active: ${operatingMode === 'emulation' ? 'UI clicks directly control physical LEDs and GPIO pins.' : 'Code execution mirrors to physical hardware and emulator.'}`
                : isEmulationOffline
                ? 'Emulation Mode: Physical hardware not detected. Click "Connect Hardware" to probe.'
                : 'Simulation Mode: Full digital twin active. Python & C scripts execute with virtual hardware.')}
          </span>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors shrink-0"
        >
          <span>{showDetails ? 'Hide Diagnostics' : 'Bus Details'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expandable Diagnostic Telemetry Details */}
      {showDetails && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-slate-600">
            <span className="font-bold text-[#840038]">Hardware Interface Diagnostics</span>
            <span>Uptime: {state?.system.uptimeSeconds || 0}s</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">I2C-1 Addresses:</span>
              <span className="font-semibold text-slate-800">
                0x46 (MCU), 0x5C (HTS221/LPS25H), 0x6A (LSM9DS1), 0x27 (LCD)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">GPIO Memory Map:</span>
              <span className="font-semibold text-slate-800">
                /dev/gpiomem (28 BCM pins active with pinctrl/raspi-gpio)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Daemon Status:</span>
              <span className="font-semibold text-emerald-700">
                Listening on 0.0.0.0:3000 (ws & REST)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
