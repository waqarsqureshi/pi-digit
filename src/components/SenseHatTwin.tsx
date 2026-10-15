import { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Navigation,
  Activity,
  Wind,
  Thermometer,
  Gauge,
  Compass,
  AlertTriangle,
  Sliders,
  Zap,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  RgbColor,
  SenseHatSensors,
  JoystickEvent,
  JoystickDirection,
  JoystickAction,
} from '../types/digitalTwin';

interface SenseHatTwinProps {
  matrix: RgbColor[];
  sensors: SenseHatSensors;
  lastJoystick: JoystickEvent | null;
  isSenseHatConnected: boolean;
  selectedMode: 'simulation' | 'emulation';
  hardwareLinkStatus?: 'full' | 'partial' | 'disconnected' | 'simulated';
  onSetPixel: (x: number, y: number, color: RgbColor) => void;
  onClearMatrix: (color?: RgbColor) => void;
  onSetMatrixPattern: (matrix: RgbColor[]) => void;
  onTriggerJoystick: (direction: JoystickDirection, action?: JoystickAction) => void;
  onInjectSensors: (values: Partial<SenseHatSensors>) => void;
  onConnectHardware?: () => void;
  onOpenDiagnostics?: () => void;
  isProbingHardware?: boolean;
}

const PALETTE: { name: string; color: RgbColor; hex: string }[] = [
  { name: 'Red', color: [255, 0, 0], hex: '#ef4444' },
  { name: 'Maroon', color: [132, 0, 56], hex: '#840038' },
  { name: 'Gold', color: [212, 175, 55], hex: '#d4af37' },
  { name: 'Amber', color: [245, 158, 11], hex: '#f59e0b' },
  { name: 'Green', color: [34, 197, 94], hex: '#22c55e' },
  { name: 'Cyan', color: [6, 182, 212], hex: '#06b6d4' },
  { name: 'Blue', color: [59, 130, 246], hex: '#3b82f6' },
  { name: 'White', color: [255, 255, 255], hex: '#ffffff' },
  { name: 'Off', color: [0, 0, 0], hex: '#1e293b' },
];

export function SenseHatTwin({
  matrix,
  sensors,
  lastJoystick,
  isSenseHatConnected,
  selectedMode,
  hardwareLinkStatus,
  onSetPixel,
  onClearMatrix,
  onSetMatrixPattern,
  onTriggerJoystick,
  onInjectSensors,
  onConnectHardware,
  onOpenDiagnostics,
  isProbingHardware = false,
}: SenseHatTwinProps) {
  const [selectedColor, setSelectedColor] = useState<RgbColor>([255, 0, 0]);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [tempInput, setTempInput] = useState(sensors.temperature);
  const [humidityInput, setHumidityInput] = useState(sensors.humidity);
  const [pressureInput, setPressureInput] = useState(sensors.pressure);
  const [activeHighlight, setActiveHighlight] = useState<JoystickDirection | null>(null);
  const [activeActionState, setActiveActionState] = useState<JoystickAction | null>(null);

  // Joystick press, hold, and release tracking
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeDirectionRef = useRef<JoystickDirection | null>(null);
  const isHoldingRef = useRef<boolean>(false);

  // In emulation mode with physical board connected vs standalone
  const isPhysicalLinked = selectedMode === 'emulation' && isSenseHatConnected;
  const isPartial = isPhysicalLinked && hardwareLinkStatus === 'partial';
  const isEmulationDisconnected = selectedMode === 'emulation' && !isSenseHatConnected;

  // Animate and highlight keypad button when an event arrives
  useEffect(() => {
    if (lastJoystick?.direction) {
      const raw = String(lastJoystick.direction).toLowerCase();
      const d = (raw === 'centre' || raw === 'center' || raw === 'enter' ? 'middle' : raw) as JoystickDirection;
      setActiveHighlight(d);
      setActiveActionState(lastJoystick.action);
      const timer = setTimeout(() => {
        if (!activeDirectionRef.current) {
          setActiveHighlight(null);
          setActiveActionState(null);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [lastJoystick?.direction, lastJoystick?.action, lastJoystick?.timestamp]);

  // Press & Hold and Release Handlers
  const handlePointerDown = (direction: JoystickDirection) => {
    const raw = String(direction).toLowerCase();
    const normDir = (raw === 'centre' || raw === 'center' || raw === 'enter' ? 'middle' : raw) as JoystickDirection;
    activeDirectionRef.current = normDir;
    isHoldingRef.current = false;
    setActiveHighlight(normDir);
    setActiveActionState('press');

    // Trigger immediate press event
    onTriggerJoystick(normDir, 'press');

    // Start 350ms hold timer
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    holdTimerRef.current = setTimeout(() => {
      if (activeDirectionRef.current === normDir) {
        isHoldingRef.current = true;
        setActiveActionState('hold');
        onTriggerJoystick(normDir, 'hold');

        // Repeated hold ticks while pointer continues to be pressed
        holdIntervalRef.current = setInterval(() => {
          if (activeDirectionRef.current === normDir) {
            onTriggerJoystick(normDir, 'hold');
          }
        }, 300);
      }
    }, 350);
  };

  const handlePointerUp = (direction?: JoystickDirection) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    const targetDir = direction || activeDirectionRef.current;
    if (targetDir) {
      const raw = String(targetDir).toLowerCase();
      const normDir = (raw === 'centre' || raw === 'center' || raw === 'enter' ? 'middle' : raw) as JoystickDirection;
      activeDirectionRef.current = null;
      isHoldingRef.current = false;
      setActiveHighlight(normDir);
      setActiveActionState('release');

      // Trigger release event
      onTriggerJoystick(normDir, 'release');

      // Keep visual feedback visible for clear user perception
      setTimeout(() => {
        if (!activeDirectionRef.current) {
          setActiveHighlight(null);
          setActiveActionState(null);
        }
      }, 1000);
    }
  };

  // Global window listeners for pointer release and keyboard controls
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (activeDirectionRef.current) {
        handlePointerUp(activeDirectionRef.current);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in code editor, textarea, or input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      let dir: JoystickDirection | null = null;
      if (e.key === 'ArrowUp') dir = 'up';
      else if (e.key === 'ArrowDown') dir = 'down';
      else if (e.key === 'ArrowLeft') dir = 'left';
      else if (e.key === 'ArrowRight') dir = 'right';
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'm' || e.key === 'M') dir = 'middle';

      if (dir && !e.repeat && activeDirectionRef.current !== dir) {
        e.preventDefault();
        handlePointerDown(dir);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      let dir: JoystickDirection | null = null;
      if (e.key === 'ArrowUp') dir = 'up';
      else if (e.key === 'ArrowDown') dir = 'down';
      else if (e.key === 'ArrowLeft') dir = 'left';
      else if (e.key === 'ArrowRight') dir = 'right';
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'm' || e.key === 'M') dir = 'middle';

      if (dir && activeDirectionRef.current === dir) {
        e.preventDefault();
        handlePointerUp(dir);
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handlePixelClick = (x: number, y: number) => {
    onSetPixel(x, y, selectedColor);
  };

  const loadPresetPattern = (type: 'raspberry' | 'smiley' | 'rainbow') => {
    if (type === 'raspberry') {
      const p: RgbColor[] = Array(64).fill([0, 0, 0]);
      const red: RgbColor = [220, 20, 60];
      const green: RgbColor = [34, 139, 34];
      [2, 3, 4, 5].forEach((i) => (p[i] = green));
      [10, 11, 12, 13].forEach((i) => (p[i] = green));
      [18, 19, 20, 21].forEach((i) => (p[i] = red));
      [25, 26, 27, 28, 29, 30].forEach((i) => (p[i] = red));
      [33, 34, 35, 36, 37, 38].forEach((i) => (p[i] = red));
      [42, 43, 44, 45].forEach((i) => (p[i] = red));
      [51, 52].forEach((i) => (p[i] = red));
      onSetMatrixPattern(p);
    } else if (type === 'smiley') {
      const p: RgbColor[] = Array(64).fill([0, 0, 0]);
      const y: RgbColor = [255, 215, 0];
      const b: RgbColor = [0, 0, 0];
      for (let i = 0; i < 64; i++) p[i] = y;
      [0, 1, 6, 7, 8, 15, 48, 55, 56, 57, 62, 63].forEach((i) => (p[i] = b));
      p[18] = b;
      p[21] = b;
      [41, 46, 50, 51, 52, 53].forEach((i) => (p[i] = b));
      onSetMatrixPattern(p);
    } else if (type === 'rainbow') {
      const p: RgbColor[] = [];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const hue = ((x + y) / 14) * 360;
          p.push(hslToRgb(hue, 100, 50));
        }
      }
      onSetMatrixPattern(p);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-5 shadow-xs flex flex-col gap-3.5 text-slate-800 min-w-0">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-200/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Raspberry Pi Sense HAT</span>
              <span className="text-xs font-normal text-slate-500 font-mono">(8×8 RGB + 5-Way Stick)</span>
            </h3>
            {isPhysicalLinked ? (
              isPartial ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                  <span>LED Matrix Active (/dev/fb1)</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Physical Hardware Linked</span>
                </span>
              )
            ) : isEmulationDisconnected ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                Standby (Unlinked)
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Digital Twin Mode
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            Interactive 8×8 RGB LED matrix, 5-way joystick (press/hold/release), and calibrated telemetry
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowInjectModal(!showInjectModal)}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Inject test environmental sensor readings"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>Test Sensors</span>
          </button>
        </div>
      </div>

      {/* Partial Hardware Connection Banner */}
      {isPartial && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <strong className="font-semibold text-amber-900 block">
                Physical 8×8 RGB LED Matrix is Active &amp; Working:
              </strong>
              <span>
                Your LED matrix is directly linked to your Raspberry Pi (/dev/fb1). Environmental sensors are in standby mode. Click Diagnostics for I2C bus commands.
              </span>
            </div>
          </div>
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="px-2.5 py-1 rounded-md bg-amber-200 hover:bg-amber-300 text-amber-950 font-semibold text-xs shrink-0 transition-colors cursor-pointer"
            >
              Diagnostics
            </button>
          )}
        </div>
      )}

      {/* Sensor Perturbation Drawer */}
      {showInjectModal && (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-300/80 flex flex-col gap-3 text-xs animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between font-semibold text-[#840038]">
            <span>Teacher Sensor Perturbation (Inject Test Values):</span>
            <button
              onClick={() => setShowInjectModal(false)}
              className="text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-600 block mb-1">
                Temperature: <span className="font-mono font-bold text-slate-900">{tempInput}°C</span>
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="0.5"
                value={tempInput}
                onChange={(e) => setTempInput(parseFloat(e.target.value))}
                className="w-full accent-[#840038]"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">
                Humidity: <span className="font-mono font-bold text-slate-900">{humidityInput}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="95"
                step="1"
                value={humidityInput}
                onChange={(e) => setHumidityInput(parseFloat(e.target.value))}
                className="w-full accent-[#840038]"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">
                Pressure: <span className="font-mono font-bold text-slate-900">{pressureInput} hPa</span>
              </label>
              <input
                type="range"
                min="960"
                max="1040"
                step="1"
                value={pressureInput}
                onChange={(e) => setPressureInput(parseFloat(e.target.value))}
                className="w-full accent-[#840038]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                onInjectSensors({
                  temperature: tempInput,
                  humidity: humidityInput,
                  pressure: pressureInput,
                });
                setShowInjectModal(false);
              }}
              className="px-3 py-1.5 bg-[#840038] hover:bg-[#6c002e] text-white rounded-md font-medium transition-colors shadow-2xs cursor-pointer"
            >
              Apply Injected Readings
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: 8x8 Matrix + Joystick & Gauges */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: 8x8 LED Matrix Canvas */}
        <div
          style={{ backgroundColor: 'var(--sensehat-bezel-bg)', borderColor: 'var(--sensehat-bezel-border)' }}
          className="xl:col-span-7 flex flex-col items-center justify-center p-4 border rounded-xl shadow-inner transition-colors duration-200"
        >
          <div className="flex items-center justify-between w-full mb-3 text-xs text-slate-400 px-1">
            <span className="font-semibold text-[var(--theme-text-main)] font-mono">8×8 RGB LED Matrix</span>
            <span className="font-mono text-[11px] text-[var(--theme-accent)]">
              {hoveredPixel
                ? `Pixel [${hoveredPixel.x}, ${hoveredPixel.y}]`
                : isPhysicalLinked
                ? 'Interactive (Hardware /dev/fb1)'
                : 'Interactive (Digital Twin)'}
            </span>
          </div>

          {/* 8x8 Grid Canvas */}
          <div
            style={{ backgroundColor: 'var(--sensehat-grid-bg)', borderColor: 'var(--theme-border)' }}
            className="p-3 rounded-lg border shadow-md transition-colors duration-200"
          >
            <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
              {Array.from({ length: 64 }).map((_, index) => {
                const x = index % 8;
                const y = Math.floor(index / 8);
                const color = matrix[index] || [0, 0, 0];
                const isOff = color[0] === 0 && color[1] === 0 && color[2] === 0;
                const rgbStr = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

                return (
                  <button
                    key={index}
                    onClick={() => handlePixelClick(x, y)}
                    onMouseEnter={() => setHoveredPixel({ x, y })}
                    onMouseLeave={() => setHoveredPixel(null)}
                    style={{
                      backgroundColor: isOff ? 'var(--sensehat-pixel-off)' : rgbStr,
                      boxShadow: isOff
                        ? 'inset 0 1px 2px rgba(0,0,0,0.6)'
                        : `0 0 10px ${rgbStr}, inset 0 1px 1px rgba(255,255,255,0.4)`,
                    }}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-[4px] border transition-transform flex items-center justify-center cursor-pointer ${
                      isOff
                        ? 'border-white/5 hover:border-[var(--theme-accent)] hover:scale-105'
                        : 'border-white/30 hover:scale-110 active:scale-95'
                    }`}
                  >
                    <span className="sr-only">Pixel {x},{y}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette & Controls */}
          <div className="w-full mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs font-medium">Color:</span>
              <div className="flex items-center gap-1">
                {PALETTE.map((p) => {
                  const isCurrent =
                    selectedColor[0] === p.color[0] &&
                    selectedColor[1] === p.color[1] &&
                    selectedColor[2] === p.color[2];
                  return (
                    <button
                      key={p.name}
                      onClick={() => setSelectedColor(p.color)}
                      title={`Select ${p.name}`}
                      style={{ backgroundColor: p.hex }}
                      className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950 scale-110 border-white'
                          : 'border-slate-600 hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onClearMatrix()}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-colors text-xs font-medium cursor-pointer shadow-2xs"
                title="Clear matrix"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>

              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => loadPresetPattern('raspberry')}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer text-xs font-medium shadow-2xs"
                  title="Raspberry Pi Logo Preset"
                >
                  Pi
                </button>
                <button
                  onClick={() => loadPresetPattern('smiley')}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer text-xs font-medium shadow-2xs"
                  title="Smiley Face Preset"
                >
                  Smile
                </button>
                <button
                  onClick={() => loadPresetPattern('rainbow')}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer text-xs font-medium shadow-2xs"
                  title="Rainbow Spectrum Preset"
                >
                  Rainbow
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: 5-Way Joystick & Real-Time Sensors */}
        <div className="xl:col-span-5 flex flex-col gap-3.5">
          {/* 5-Way Keypad / Joystick Controller */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#840038]" />
                <span>5-Way Sense HAT Joystick</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Supports Press, Hold &amp; Release
              </span>
            </div>

            {/* 5-Way Joystick Status Banner */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/90 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700 text-xs">Event:</span>
                {lastJoystick ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold uppercase bg-slate-900 text-white shadow-2xs">
                      {String(lastJoystick.direction).toLowerCase() === 'centre' || String(lastJoystick.direction).toLowerCase() === 'enter' || String(lastJoystick.direction).toLowerCase() === 'middle' ? 'MIDDLE' : lastJoystick.direction.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold uppercase shadow-2xs transition-all ${
                        lastJoystick.action === 'release'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 ring-1 ring-rose-200'
                          : lastJoystick.action === 'hold'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-200 animate-pulse'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-1 ring-emerald-200'
                      }`}
                    >
                      {lastJoystick.action === 'release'
                        ? 'RELEASED'
                        : lastJoystick.action === 'hold'
                        ? 'HELD (HOLD)'
                        : 'PRESSED'}
                    </span>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded-md font-mono text-xs text-slate-400 bg-slate-100">
                    IDLE
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Middle / Up / Down / Left / Right (Arrow Keys &amp; Enter)
              </span>
            </div>

            {/* Interactive D-Pad Controller with Touch & Mouse Hold / Release */}
            <div className="flex items-center justify-center py-1">
              <div className="grid grid-cols-3 gap-2 w-44 h-44 p-2.5 bg-slate-200/80 border border-slate-300 rounded-2xl relative shadow-inner">
                <div />
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handlePointerDown('up');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    handlePointerUp('up');
                  }}
                  onPointerLeave={() => {
                    if (activeDirectionRef.current === 'up') handlePointerUp('up');
                  }}
                  onPointerCancel={() => {
                    if (activeDirectionRef.current === 'up') handlePointerUp('up');
                  }}
                  className={`rounded-lg p-1 text-sm font-bold transition-all border cursor-pointer select-none touch-none flex items-center justify-center shadow-xs ${
                    activeHighlight === 'up'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 shadow-inner'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 shadow-inner animate-pulse'
                        : 'bg-[#840038] text-white border-[#840038] scale-95 shadow-inner'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick UP (Click, Hold or Release — ArrowUp)"
                >
                  ▲
                </button>
                <div />

                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handlePointerDown('left');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    handlePointerUp('left');
                  }}
                  onPointerLeave={() => {
                    if (activeDirectionRef.current === 'left') handlePointerUp('left');
                  }}
                  onPointerCancel={() => {
                    if (activeDirectionRef.current === 'left') handlePointerUp('left');
                  }}
                  className={`rounded-lg p-1 text-sm font-bold transition-all border cursor-pointer select-none touch-none flex items-center justify-center shadow-xs ${
                    activeHighlight === 'left'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 shadow-inner'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 shadow-inner animate-pulse'
                        : 'bg-[#840038] text-white border-[#840038] scale-95 shadow-inner'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick LEFT (Click, Hold or Release — ArrowLeft)"
                >
                  ◀
                </button>

                {/* MIDDLE BUTTON */}
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handlePointerDown('middle');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    handlePointerUp('middle');
                  }}
                  onPointerLeave={() => {
                    if (activeDirectionRef.current === 'middle') handlePointerUp('middle');
                  }}
                  onPointerCancel={() => {
                    if (activeDirectionRef.current === 'middle') handlePointerUp('middle');
                  }}
                  className={`rounded-lg p-1 text-xs font-bold transition-all border cursor-pointer select-none touch-none flex flex-col items-center justify-center shadow-xs ${
                    activeHighlight === 'middle' || activeHighlight === 'centre'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 ring-2 ring-rose-300'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 ring-2 ring-amber-300 animate-pulse'
                        : 'bg-emerald-600 text-white border-emerald-700 scale-95 ring-2 ring-emerald-300'
                      : 'bg-amber-100/90 text-amber-950 border-amber-300 hover:bg-amber-200 active:scale-95'
                  }`}
                  title="Joystick MIDDLE PRESS (Click, Hold or Release — Enter / Space / M)"
                >
                  <span className="text-[11px] font-bold">
                    {activeHighlight === 'middle' && activeActionState === 'hold'
                      ? 'HOLD'
                      : activeHighlight === 'middle' && activeActionState === 'release'
                      ? 'RELEASE'
                      : 'MIDDLE'}
                  </span>
                  <span className="text-[9px] opacity-75 font-mono">
                    {activeHighlight === 'middle' ? '● ACT' : '● OK'}
                  </span>
                </button>

                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handlePointerDown('right');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    handlePointerUp('right');
                  }}
                  onPointerLeave={() => {
                    if (activeDirectionRef.current === 'right') handlePointerUp('right');
                  }}
                  onPointerCancel={() => {
                    if (activeDirectionRef.current === 'right') handlePointerUp('right');
                  }}
                  className={`rounded-lg p-1 text-sm font-bold transition-all border cursor-pointer select-none touch-none flex items-center justify-center shadow-xs ${
                    activeHighlight === 'right'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 shadow-inner'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 shadow-inner animate-pulse'
                        : 'bg-[#840038] text-white border-[#840038] scale-95 shadow-inner'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick RIGHT (Click, Hold or Release — ArrowRight)"
                >
                  ▶
                </button>

                <div />
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handlePointerDown('down');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    handlePointerUp('down');
                  }}
                  onPointerLeave={() => {
                    if (activeDirectionRef.current === 'down') handlePointerUp('down');
                  }}
                  onPointerCancel={() => {
                    if (activeDirectionRef.current === 'down') handlePointerUp('down');
                  }}
                  className={`rounded-lg p-1 text-sm font-bold transition-all border cursor-pointer select-none touch-none flex items-center justify-center shadow-xs ${
                    activeHighlight === 'down'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 shadow-inner'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 shadow-inner animate-pulse'
                        : 'bg-[#840038] text-white border-[#840038] scale-95 shadow-inner'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick DOWN (Click, Hold or Release — ArrowDown)"
                >
                  ▼
                </button>
                <div />
              </div>
            </div>
          </div>

          {/* Environmental Sensor Telemetry Readouts */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Temperature Readout (Ambient Calibrated) */}
            <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Thermometer className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ambient Temp</span>
                </span>
                {sensors.rawTemperature && sensors.rawTemperature > 38 && (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200" title="Sense HAT sits directly over the BCM2711 SoC on Raspberry Pi 4. Uncalibrated hardware heats to ~55°C (~132°F); the system calibrates this to realistic ambient laboratory temperature.">
                    SoC Calibrated
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {sensors.temperature.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500">°C</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono leading-tight">
                {((sensors.temperature * 9) / 5 + 32).toFixed(1)}°F (Ambient)
                {sensors.rawTemperature && sensors.rawTemperature > 38 && (
                  <span className="block text-[9px] text-amber-700/80 mt-0.5" title="Sense HAT raw sensor sits directly above the warm BCM2711 SoC processor on Raspberry Pi 4. The raw sensor is heated to ~55°C (~132°F); our software calibrates this to true ambient laboratory room temperature.">
                    Uncalibrated SoC: {sensors.rawTemperature.toFixed(1)}°C / {((sensors.rawTemperature * 9) / 5 + 32).toFixed(0)}°F
                  </span>
                )}
              </div>
            </div>

            {/* Humidity */}
            <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Wind className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Humidity</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {sensors.humidity.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500">%</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {sensors.isSimulated ? 'Simulated' : 'HTS221'}
              </div>
            </div>

            {/* Pressure */}
            <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Gauge className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pressure</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {sensors.pressure.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500">hPa</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {sensors.isSimulated ? 'Simulated' : 'LPS25H'}
              </div>
            </div>
          </div>

          {/* IMU Motion Telemetry */}
          <div className="p-3 bg-white border border-slate-200/90 rounded-xl text-xs font-mono text-slate-700 shadow-2xs">
            <div className="flex items-center justify-between mb-2 text-slate-600">
              <span className="flex items-center gap-1.5 font-semibold">
                <Activity className="w-3.5 h-3.5 text-[#840038]" />
                <span>9-DOF IMU ({sensors.isSimulated ? 'Simulated' : 'LSM9DS1 HW'})</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>Heading: {sensors.compassHeading.toFixed(1)}°</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block mb-0.5">
                  Accelerometer (g):
                </span>
                <div className="text-slate-900 font-bold">
                  {`X: ${sensors.accelerometer.x.toFixed(2)} Y: ${sensors.accelerometer.y.toFixed(2)} Z: ${sensors.accelerometer.z.toFixed(2)}`}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">
                  Gyroscope (°/s):
                </span>
                <div className="text-slate-900 font-bold">
                  {`X: ${sensors.gyroscope.x.toFixed(1)} Y: ${sensors.gyroscope.y.toFixed(1)} Z: ${sensors.gyroscope.z.toFixed(1)}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
