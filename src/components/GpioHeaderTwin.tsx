import { useState, useId, useEffect } from 'react';
import { Activity, ChevronDown, Info, Radio, Zap } from 'lucide-react';
import { GpioPin } from '../types/digitalTwin';

interface GpioHeaderTwinProps {
  pins: GpioPin[];
  selectedMode: 'simulation' | 'emulation';
  isPhysicalConnected: boolean;
  onTogglePin?: (pinNumber: number) => void;
  pwm?: {
    channel: number;
    duty: number;
    freq: number;
    active: boolean;
  };
}

export function GpioHeaderTwin({
  pins,
  selectedMode,
  isPhysicalConnected,
  onTogglePin,
  pwm,
}: GpioHeaderTwinProps) {
  const pinSelectId = useId();
  const [selectedDropdownPin, setSelectedDropdownPin] = useState<number>(12); // Default to GPIO 18 / PWM0 (Pin 12)
  const [pwmDuty, setPwmDuty] = useState<number>(50); // Default 50% duty cycle for visualizer
  const [pwmFreq, setPwmFreq] = useState<number>(1000); // 1 kHz

  // Synchronize with live incoming PWM signals from Python program / hardware via WebSocket
  useEffect(() => {
    if (pwm) {
      if (typeof pwm.duty === 'number') setPwmDuty(pwm.duty);
      if (typeof pwm.freq === 'number') setPwmFreq(pwm.freq);
    }
  }, [pwm]);

  const getPinByNumber = (pinNum: number) => pins.find((p) => p.pin === pinNum);
  const inspectedPin = getPinByNumber(selectedDropdownPin);

  // Generate square wave SVG path based on PWM duty cycle
  const generateSquareWave = (dutyPercent: number) => {
    const width = 480;
    const height = 64;
    const cycles = 5;
    const cycleWidth = width / cycles;
    const highWidth = Math.max(2, Math.min(cycleWidth - 2, (dutyPercent / 100) * cycleWidth));
    const topY = 12;
    const bottomY = 52;

    let path = `M 0,${bottomY}`;
    for (let i = 0; i < cycles; i++) {
      const startX = i * cycleWidth;
      path += ` L ${startX},${topY} L ${startX + highWidth},${topY} L ${startX + highWidth},${bottomY} L ${startX + cycleWidth},${bottomY}`;
    }
    return path;
  };

  const isPwmActive = pwm?.active || inspectedPin?.mode === 'PWM';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col gap-3 text-slate-800 min-w-0">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Raspberry Pi 40-Pin Header & PWM Signal Analyzer
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Sense HAT Mounted · Pinout Reference & Live PWM Waveform Oscilloscope
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
                  Pin {p.pin}: {p.name} {p.mode === 'PWM' ? '(PWM)' : ''} - {p.value === 1 ? 'HIGH' : 'LOW'}
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
              {inspectedPin.value === 1 ? (
                <strong className="text-rose-600 font-bold">HIGH (3.3V)</strong>
              ) : (
                <strong className="text-slate-500">LOW (0.0V)</strong>
              )}
            </span>

            {inspectedPin.isSafeToToggle && onTogglePin && (
              <button
                onClick={() => onTogglePin(inspectedPin.pin)}
                className="px-2.5 py-1 bg-slate-200 hover:bg-[#840038] hover:text-white rounded text-[11px] font-mono transition-colors border border-slate-300 cursor-pointer"
                title="Toggle GPIO Pin logic level"
              >
                Toggle Logic Level
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hardware Architecture Context Notice */}
      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-950 font-sans">
        <Radio className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed text-[11px]">
          <strong>Physical Architecture Notice:</strong> The Raspberry Pi Sense HAT sits directly upon the 40-pin GPIO header, utilizing I2C-1 (Pins 3 & 5) and SPI/framebuffer interfaces. Output display is provided on the <strong>8x8 RGB LED Matrix</strong>, while student inputs are handled via the <strong>5-way joystick</strong> and onboard sensors. Hardware PWM on GPIO 18 (PWM0 · Pin 12) is rendered live below.
        </div>
      </div>

      {/* PWM Oscilloscope Visualizer (GPIO 18 / PWM0 · Pin 12) */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#840038]" />
                <span>PWM OSCILLOSCOPE VISUALIZER (GPIO 18 / PWM0 · PIN 12)</span>
              </span>
              {isPwmActive ? (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                  ACTIVE SIGNAL
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                  STANDBY
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Live Pulse-Width Modulation square wave analysis via WebSocket
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-600">
              Duty Cycle: <strong className="text-[#840038] font-bold">{pwmDuty}%</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              Frequency: <strong className="text-slate-900">{pwmFreq} Hz</strong>
            </span>
          </div>
        </div>

        {/* Interactive Duty Cycle Presets & Range Slider */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs font-mono">
          <span className="text-slate-500 shrink-0">Adjust Duty Cycle:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={pwmDuty}
            onChange={(e) => setPwmDuty(Number(e.target.value))}
            className="flex-1 accent-[#840038] cursor-pointer"
          />
          <div className="flex items-center gap-1">
            {[10, 25, 50, 75, 90].map((preset) => (
              <button
                key={preset}
                onClick={() => setPwmDuty(preset)}
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                  pwmDuty === preset
                    ? 'bg-[#840038] text-white font-bold'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Live Square Wave Oscilloscope Display */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col gap-1 shadow-inner">
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>HIGH: +3.3V (Logic 1)</span>
            <span className="text-sky-400 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>CHANNEL: BCM 18 / PWM0 (PIN 12)</span>
            </span>
            <span>LOW: 0.0V (Logic 0)</span>
          </div>

          <svg viewBox="0 0 480 64" className="w-full h-16 overflow-visible" preserveAspectRatio="none">
            {/* Background grid lines */}
            <line x1="0" y1="12" x2="480" y2="12" stroke="#1e293b" strokeDasharray="4 4" strokeWidth="1" />
            <line x1="0" y1="52" x2="480" y2="52" stroke="#1e293b" strokeWidth="1" />

            {/* Square wave */}
            <path
              d={generateSquareWave(pwmDuty)}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isPwmActive ? 'drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]' : ''}
            />
          </svg>

          <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 pt-1 border-t border-slate-900">
            <span>T_HIGH = {((1 / pwmFreq) * (pwmDuty / 100) * 1000).toFixed(2)} ms</span>
            <span>PERIOD = {(1000 / pwmFreq).toFixed(2)} ms</span>
            <span>T_LOW = {((1 / pwmFreq) * ((100 - pwmDuty) / 100) * 1000).toFixed(2)} ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
