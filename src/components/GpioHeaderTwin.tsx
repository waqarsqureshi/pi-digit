import { useState, useId } from 'react';
import { Cpu, Zap, Activity, ChevronDown, ToggleLeft, ToggleRight, Radio, Info } from 'lucide-react';
import { GpioPin, EmulatedPeripheral } from '../types/digitalTwin';

interface GpioHeaderTwinProps {
  pins: GpioPin[];
  peripherals?: EmulatedPeripheral[];
  selectedMode: 'simulation' | 'emulation';
  isPhysicalConnected: boolean;
  onTogglePin: (pinNumber: number) => void;
  onTriggerButton: (bcm: number, pressed: boolean) => void;
}

export function GpioHeaderTwin({
  pins,
  peripherals = [],
  selectedMode,
  isPhysicalConnected,
  onTogglePin,
  onTriggerButton,
}: GpioHeaderTwinProps) {
  const pinSelectId = useId();
  const [selectedDropdownPin, setSelectedDropdownPin] = useState<number>(11); // Default to GPIO 17 (Pin 11)
  const [pwmDuty, setPwmDuty] = useState<number>(50); // Default 50% duty cycle for visualizer
  const [pwmFreq, setPwmFreq] = useState<number>(1000); // 1 kHz

  const isEmulationDisconnected = selectedMode === 'emulation' && !isPhysicalConnected;

  // Helper to find pin state by BCM
  const getPinByBcm = (bcm: number) => pins.find((p) => p.bcm === bcm);
  const getPinByNumber = (pinNum: number) => pins.find((p) => p.pin === pinNum);

  const inspectedPin = getPinByNumber(selectedDropdownPin);

  // Generate square wave SVG path based on PWM duty cycle
  const generateSquareWave = (dutyPercent: number) => {
    const width = 480;
    const height = 64;
    const cycles = 5;
    const cycleWidth = width / cycles;
    const highWidth = (dutyPercent / 100) * cycleWidth;
    const lowWidth = cycleWidth - highWidth;
    const topY = 12;
    const bottomY = 52;

    let path = `M 0,${bottomY}`;
    for (let i = 0; i < cycles; i++) {
      const startX = i * cycleWidth;
      path += ` L ${startX},${topY} L ${startX + highWidth},${topY} L ${startX + highWidth},${bottomY} L ${startX + cycleWidth},${bottomY}`;
    }
    return path;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col gap-3 text-slate-800 min-w-0">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              40-Pin GPIO & Peripherals
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Pin Header Status · Toggle Inputs · LEDs · PWM Waveform
          </span>
        </div>

        {/* Compact 40-Pin Header Status Dropdown */}
        <div className="flex items-center gap-1.5">
          <label htmlFor={pinSelectId} className="text-[11px] font-mono font-bold text-slate-600">
            Pin:
          </label>
          <div className="relative">
            <select
              id={pinSelectId}
              value={selectedDropdownPin}
              onChange={(e) => setSelectedDropdownPin(Number(e.target.value))}
              className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-semibold pl-2.5 pr-7 py-1 rounded border border-slate-300 cursor-pointer focus:outline-none transition-colors"
            >
              {pins.map((p) => (
                <option key={p.pin} value={p.pin}>
                  Pin {p.pin}: {p.name} - {isEmulationDisconnected ? 'INACTIVE' : p.value === 1 ? 'HIGH' : 'LOW'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Inspected Pin Quick Status Banner */}
      {inspectedPin && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#840038] flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#840038]" />
              <span>PIN #{inspectedPin.pin}: {inspectedPin.name}</span>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-600">
              Type: <strong className="text-slate-900 uppercase">{inspectedPin.type}</strong>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-600">
              Mode: <strong className="text-emerald-700">{inspectedPin.mode}</strong>
            </span>
            {inspectedPin.altFunction && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-amber-800">
                  Alt Bus: <strong>{inspectedPin.altFunction}</strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600">
              Level:{' '}
              {isEmulationDisconnected ? (
                <strong className="text-slate-400">NOT CONNECTED</strong>
              ) : inspectedPin.value === 1 ? (
                <strong className="text-rose-600 font-bold">HIGH (3.3V)</strong>
              ) : (
                <strong className="text-slate-500">LOW (0.0V)</strong>
              )}
            </span>

            {inspectedPin.isSafeToToggle && !isEmulationDisconnected && (
              <button
                onClick={() => onTogglePin(inspectedPin.pin)}
                className="px-2.5 py-1 bg-slate-200 hover:bg-[#840038] hover:text-white rounded text-[11px] font-mono transition-colors border border-slate-300"
              >
                Toggle Logic Level
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Feature: WIRE-FREE EMULATED LEDS & PERIPHERALS (User Requested) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="text-xs font-mono font-bold text-[#840038] flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-[#840038]" />
            <span>WIRE-FREE EMULATED LEDS & PERIPHERALS</span>
          </span>
          <span className="text-xs font-mono text-slate-500">
            No physical jumper wires or breadboard needed
          </span>
        </div>

        {/* Section A: Configurable Output LEDs with Live Blink Reflection */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-700">
              OUTPUT LED INDICATORS (BLINKS WHEN CODE EXECUTES):
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Mirroring GPIO 17, 27, 22, 23
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* LED 1: Red on GPIO 17 (Pin 11) */}
            {(() => {
              const p = getPinByBcm(17);
              const isLit = !isEmulationDisconnected && p?.value === 1;
              return (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col items-center gap-2 shadow-sm">
                  <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-600">
                    <span className="font-bold">GPIO 17</span>
                    <span>Pin 11</span>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                      isLit
                        ? 'bg-rose-500 border-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.95)] animate-pulse'
                        : 'bg-rose-100 border-rose-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${isLit ? 'bg-white' : 'bg-rose-300'}`} />
                  </div>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className={`text-[11px] font-mono font-bold ${isLit ? 'text-rose-600' : 'text-slate-400'}`}>
                      {isEmulationDisconnected ? 'INACTIVE' : isLit ? 'LED ON (HIGH)' : 'OFF (LOW)'}
                    </span>
                    {!isEmulationDisconnected && p && (
                      <button
                        onClick={() => onTogglePin(p.pin)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                      >
                        Toggle
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* LED 2: Yellow on GPIO 27 (Pin 13) */}
            {(() => {
              const p = getPinByBcm(27);
              const isLit = !isEmulationDisconnected && p?.value === 1;
              return (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col items-center gap-2 shadow-sm">
                  <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-600">
                    <span className="font-bold">GPIO 27</span>
                    <span>Pin 13</span>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                      isLit
                        ? 'bg-amber-400 border-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.95)] animate-pulse'
                        : 'bg-amber-100 border-amber-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${isLit ? 'bg-white' : 'bg-amber-300'}`} />
                  </div>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className={`text-[11px] font-mono font-bold ${isLit ? 'text-amber-600' : 'text-slate-400'}`}>
                      {isEmulationDisconnected ? 'INACTIVE' : isLit ? 'LED ON (HIGH)' : 'OFF (LOW)'}
                    </span>
                    {!isEmulationDisconnected && p && (
                      <button
                        onClick={() => onTogglePin(p.pin)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                      >
                        Toggle
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* LED 3: Green on GPIO 22 (Pin 15) */}
            {(() => {
              const p = getPinByBcm(22);
              const isLit = !isEmulationDisconnected && p?.value === 1;
              return (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col items-center gap-2 shadow-sm">
                  <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-600">
                    <span className="font-bold">GPIO 22</span>
                    <span>Pin 15</span>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                      isLit
                        ? 'bg-emerald-500 border-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.95)] animate-pulse'
                        : 'bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${isLit ? 'bg-white' : 'bg-emerald-300'}`} />
                  </div>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className={`text-[11px] font-mono font-bold ${isLit ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {isEmulationDisconnected ? 'INACTIVE' : isLit ? 'LED ON (HIGH)' : 'OFF (LOW)'}
                    </span>
                    {!isEmulationDisconnected && p && (
                      <button
                        onClick={() => onTogglePin(p.pin)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                      >
                        Toggle
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* LED 4: Blue on GPIO 23 (Pin 16) */}
            {(() => {
              const p = getPinByBcm(23);
              const isLit = !isEmulationDisconnected && p?.value === 1;
              return (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col items-center gap-2 shadow-sm">
                  <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-600">
                    <span className="font-bold">GPIO 23</span>
                    <span>Pin 16</span>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                      isLit
                        ? 'bg-cyan-500 border-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.95)] animate-pulse'
                        : 'bg-cyan-100 border-cyan-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${isLit ? 'bg-white' : 'bg-cyan-300'}`} />
                  </div>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className={`text-[11px] font-mono font-bold ${isLit ? 'text-cyan-700' : 'text-slate-400'}`}>
                      {isEmulationDisconnected ? 'INACTIVE' : isLit ? 'LED ON (HIGH)' : 'OFF (LOW)'}
                    </span>
                    {!isEmulationDisconnected && p && (
                      <button
                        onClick={() => onTogglePin(p.pin)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                      >
                        Toggle
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Section B: Configurable Inputs as Toggle Switches & Momentary Buttons */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-700">
              CONFIGURABLE INPUT SWITCHES (TRIGGER SENSOR/BUTTON CODE):
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              GPIO 24, 25, 26, 27
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Toggle Switch A: GPIO 24 (Pin 18) */}
            {(() => {
              const p = getPinByBcm(24);
              const isHigh = !isEmulationDisconnected && p?.value === 1;
              return (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-800">Toggle Switch A</span>
                    <span className="text-slate-500">GPIO 24</span>
                  </div>
                  <button
                    disabled={isEmulationDisconnected}
                    onClick={() => p && onTogglePin(p.pin)}
                    className={`py-2 px-3 rounded-lg border font-mono text-xs font-bold flex items-center justify-between transition-all ${
                      isHigh
                        ? 'bg-[#840038] text-white border-[#840038] shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>State: {isHigh ? 'HIGH (3.3V)' : 'LOW (0.0V)'}</span>
                    {isHigh ? (
                      <ToggleRight className="w-5 h-5 text-amber-300" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <span className="text-[10px] font-mono text-slate-400">
                    Input line to Raspberry Pi Pin 18
                  </span>
                </div>
              );
            })()}

            {/* Toggle Switch B: GPIO 25 (Pin 22) */}
            {(() => {
              const p = getPinByBcm(25);
              const isHigh = !isEmulationDisconnected && p?.value === 1;
              return (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-800">Toggle Switch B</span>
                    <span className="text-slate-500">GPIO 25</span>
                  </div>
                  <button
                    disabled={isEmulationDisconnected}
                    onClick={() => p && onTogglePin(p.pin)}
                    className={`py-2 px-3 rounded-lg border font-mono text-xs font-bold flex items-center justify-between transition-all ${
                      isHigh
                        ? 'bg-[#840038] text-white border-[#840038] shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>State: {isHigh ? 'HIGH (3.3V)' : 'LOW (0.0V)'}</span>
                    {isHigh ? (
                      <ToggleRight className="w-5 h-5 text-amber-300" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <span className="text-[10px] font-mono text-slate-400">
                    Input line to Raspberry Pi Pin 22
                  </span>
                </div>
              );
            })()}

            {/* Tactile Push Button 1: GPIO 27 (Pin 13) */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-800">Momentary Button 1</span>
                <span className="text-slate-500">GPIO 27</span>
              </div>
              <button
                disabled={isEmulationDisconnected}
                onMouseDown={() => onTriggerButton(27, true)}
                onMouseUp={() => onTriggerButton(27, false)}
                className="py-2 px-3 bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 hover:border-[#840038] rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Press Button (Push)</span>
              </button>
              <span className="text-[10px] font-mono text-slate-400">
                Holding sets Pin 13 to HIGH
              </span>
            </div>

            {/* Tactile Push Button 2: GPIO 26 (Pin 37) */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-800">Momentary Button 2</span>
                <span className="text-slate-500">GPIO 26</span>
              </div>
              <button
                disabled={isEmulationDisconnected}
                onMouseDown={() => onTriggerButton(26, true)}
                onMouseUp={() => onTriggerButton(26, false)}
                className="py-2 px-3 bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 hover:border-[#840038] rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Press Button (Push)</span>
              </button>
              <span className="text-[10px] font-mono text-slate-400">
                Holding sets Pin 37 to HIGH
              </span>
            </div>
          </div>
        </div>

        {/* Section C: PWM Visualizer tagged to PWM0 / GPIO 18 (User Requested) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#840038]" />
                <span>PWM OSCILLOSCOPE VISUALIZER (GPIO 18 / PWM0 · PIN 12)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Pulse-Width Modulation duty cycle & square wave simulation
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-600">
                Duty Cycle: <strong className="text-[#840038] font-bold">{isEmulationDisconnected ? '--' : `${pwmDuty}%`}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">
                Frequency: <strong className="text-slate-900">{isEmulationDisconnected ? '--' : `${pwmFreq} Hz`}</strong>
              </span>
            </div>
          </div>

          {/* Interactive Duty Cycle Slider */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-500 shrink-0">Adjust Duty Cycle:</span>
            <input
              type="range"
              min="0"
              max="100"
              disabled={isEmulationDisconnected}
              value={pwmDuty}
              onChange={(e) => setPwmDuty(Number(e.target.value))}
              className={`flex-1 accent-[#840038] ${isEmulationDisconnected ? 'opacity-40 cursor-not-allowed' : ''}`}
            />
            <div className="flex items-center gap-1">
              <button
                disabled={isEmulationDisconnected}
                onClick={() => setPwmDuty(25)}
                className={`px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] ${isEmulationDisconnected ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                25%
              </button>
              <button
                disabled={isEmulationDisconnected}
                onClick={() => setPwmDuty(50)}
                className={`px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] ${isEmulationDisconnected ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                50%
              </button>
              <button
                disabled={isEmulationDisconnected}
                onClick={() => setPwmDuty(75)}
                className={`px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] ${isEmulationDisconnected ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                75%
              </button>
            </div>
          </div>

          {/* Live Waveform Display */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-col gap-1 shadow-inner">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
              <span>VOLTAGE: +3.3V</span>
              <span className={isEmulationDisconnected ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                {isEmulationDisconnected ? 'PWM0 INACTIVE (NOT CONNECTED)' : 'PWM0 CHANNEL ACTIVE'}
              </span>
              <span>GROUND: 0.0V</span>
            </div>

            <svg viewBox="0 0 480 64" className="w-full h-16 overflow-visible" preserveAspectRatio="none">
              {/* Background grid lines */}
              <line x1="0" y1="12" x2="480" y2="12" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="0" y1="52" x2="480" y2="52" stroke="#334155" strokeWidth="1" />

              {/* Square wave (or flatline if disconnected) */}
              <path
                d={isEmulationDisconnected ? 'M 0,52 L 480,52' : generateSquareWave(pwmDuty)}
                fill="none"
                stroke={isEmulationDisconnected ? '#64748b' : '#38bdf8'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
