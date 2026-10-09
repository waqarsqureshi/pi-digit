import { useState } from 'react';
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
  PowerOff,
} from 'lucide-react';
import {
  RgbColor,
  SenseHatSensors,
  JoystickEvent,
  JoystickDirection,
} from '../types/digitalTwin';

interface SenseHatTwinProps {
  matrix: RgbColor[];
  sensors: SenseHatSensors;
  lastJoystick: JoystickEvent | null;
  isSenseHatConnected: boolean;
  selectedMode: 'simulation' | 'emulation';
  onSetPixel: (x: number, y: number, color: RgbColor) => void;
  onClearMatrix: (color?: RgbColor) => void;
  onSetMatrixPattern: (matrix: RgbColor[]) => void;
  onTriggerJoystick: (direction: JoystickDirection) => void;
  onInjectSensors: (values: Partial<SenseHatSensors>) => void;
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
  onSetPixel,
  onClearMatrix,
  onSetMatrixPattern,
  onTriggerJoystick,
  onInjectSensors,
}: SenseHatTwinProps) {
  const [selectedColor, setSelectedColor] = useState<RgbColor>([255, 0, 0]);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [tempInput, setTempInput] = useState(sensors.temperature);
  const [humidityInput, setHumidityInput] = useState(sensors.humidity);
  const [pressureInput, setPressureInput] = useState(sensors.pressure);

  // In emulation mode with physical board connected vs standalone
  const isPhysicalLinked = selectedMode === 'emulation' && isSenseHatConnected;
  const isEmulationDisconnected = selectedMode === 'emulation' && !isSenseHatConnected;

  const handlePixelClick = (x: number, y: number) => {
    // Both Mode 1 and Mode 2 support interactive pixel clicking, immediately updating UI and physical Sense HAT
    onSetPixel(x, y, selectedColor);
  };

  const loadPresetPattern = (type: 'raspberry' | 'smiley' | 'rainbow') => {
    const O: RgbColor = [0, 0, 0];
    const R: RgbColor = [255, 0, 0];
    const G: RgbColor = [34, 197, 94];
    const Y: RgbColor = [250, 204, 21];
    const B: RgbColor = [59, 130, 246];
    const W: RgbColor = [255, 255, 255];

    let pattern: RgbColor[] = [];
    if (type === 'raspberry') {
      pattern = [
        O, G, O, G, G, O, G, O,
        O, G, G, G, G, G, G, O,
        O, R, R, R, R, R, R, O,
        R, R, W, R, R, W, R, R,
        R, R, R, R, R, R, R, R,
        O, R, R, R, R, R, R, O,
        O, O, R, R, R, R, O, O,
        O, O, O, R, R, O, O, O,
      ];
    } else if (type === 'smiley') {
      pattern = [
        O, O, Y, Y, Y, Y, O, O,
        O, Y, Y, Y, Y, Y, Y, O,
        Y, Y, B, Y, Y, B, Y, Y,
        Y, Y, Y, Y, Y, Y, Y, Y,
        Y, R, Y, Y, Y, Y, R, Y,
        Y, Y, R, R, R, R, Y, Y,
        O, Y, Y, Y, Y, Y, Y, O,
        O, O, Y, Y, Y, Y, O, O,
      ];
    } else if (type === 'rainbow') {
      pattern = Array(64).fill(O).map((_, idx) => {
        const row = Math.floor(idx / 8);
        const col = idx % 8;
        const hue = ((row + col) * 45) % 360;
        return hslToRgb(hue, 100, 50);
      });
    }
    onSetMatrixPattern(pattern);
  };

  // Authoritative matrix state from digital twin
  const displayMatrix = matrix;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col gap-3 text-slate-800 min-w-0">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Sense HAT Twin
            </h2>
            {isPhysicalLinked ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>● LIVE HW LINK</span>
              </span>
            ) : selectedMode === 'emulation' ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <span>● EMULATOR ACTIVE</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-sky-100 text-sky-800 border border-sky-300">
                ● SIMULATED
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            8×8 RGB Matrix · 9-DOF Telemetry · 5-Way Joystick
          </span>
        </div>

        {selectedMode === 'simulation' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInjectModal(!showInjectModal)}
              className="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors flex items-center gap-1 shadow-xs"
              title="Inject simulated sensor values"
            >
              <Sliders className="w-3 h-3 text-amber-600" />
              <span>Perturb</span>
            </button>
          </div>
        )}
      </div>

      {/* Prominent warning when in Emulation mode and NOT connected */}
      {isEmulationDisconnected && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Sense HAT is NOT CONNECTED:</strong> Running in Emulation Mode without a physical Raspberry Pi Sense HAT board. No LEDs can be turned on and sensors are inactive (showing no data). Connect physical hardware to the Raspberry Pi 4 I2C bus or switch to <strong>Simulation Mode</strong>.
          </div>
        </div>
      )}

      {/* Sensor Perturbation Drawer for Teachers (Simulation mode only) */}
      {showInjectModal && selectedMode === 'simulation' && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-300 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between font-mono font-bold text-[#840038]">
            <span>Teacher Sensor Perturbation (Inject Test Values):</span>
            <button
              onClick={() => setShowInjectModal(false)}
              className="text-slate-500 hover:text-slate-800"
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
              className="px-3 py-1 bg-[#840038] hover:bg-[#6c002e] text-white rounded font-medium transition-colors shadow-sm"
            >
              Apply Injected Readings
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: 8x8 Matrix + Joystick & Gauges */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: 8x8 LED Matrix Canvas */}
        <div className="xl:col-span-7 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between w-full mb-2 text-xs font-mono text-slate-600 px-1">
            <span className="font-bold text-[11px]">8×8 RGB MATRIX</span>
            <span className="text-[#840038] font-semibold text-[11px]">
              {hoveredPixel
                ? `Pixel [${hoveredPixel.x}, ${hoveredPixel.y}]`
                : isPhysicalLinked
                ? 'Interactive (Hardware Synced)'
                : 'Interactive (Digital Twin)'}
            </span>
          </div>

          {/* Matrix Physical PCB */}
          <div className="relative p-2.5 bg-slate-900 border-2 border-slate-700 rounded-xl shadow-md">
            <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full border border-slate-600 bg-slate-950" />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full border border-slate-600 bg-slate-950" />
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full border border-slate-600 bg-slate-950" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-slate-600 bg-slate-950" />

            {/* 8x8 Grid */}
            <div className="grid grid-cols-8 gap-1 p-0.5 bg-black rounded-lg">
              {displayMatrix.map((color, idx) => {
                const x = idx % 8;
                const y = Math.floor(idx / 8);
                const isOff = color[0] === 0 && color[1] === 0 && color[2] === 0;
                const rgbString = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                const glowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.55)`;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePixelClick(x, y)}
                    onMouseEnter={() => setHoveredPixel({ x, y })}
                    onMouseLeave={() => setHoveredPixel(null)}
                    title={`Pixel (${x}, ${y}): RGB(${color.join(', ')})${isPhysicalLinked ? ' (Synced with Hardware)' : ''}`}
                    style={{
                      backgroundColor: isOff ? '#111827' : rgbString,
                      boxShadow: isOff ? 'none' : `0 0 8px ${glowColor}`,
                    }}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-[3px] border transition-transform flex items-center justify-center cursor-pointer ${
                      isOff
                        ? 'border-slate-800 hover:border-slate-500 hover:scale-105'
                        : 'border-white/20 hover:scale-110 active:scale-95'
                    }`}
                  >
                    <span className="sr-only">Pixel {x},{y}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette & Controls */}
          <div className="w-full mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-600 font-mono text-[10px]">Color:</span>
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
                          ? 'ring-2 ring-[#840038] ring-offset-1 ring-offset-white scale-110 border-white'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onClearMatrix()}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 flex items-center gap-1 transition-colors text-[10px] cursor-pointer"
                title="Clear matrix"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Clear</span>
              </button>

              <div className="flex items-center gap-1 text-[10px]">
                <button
                  onClick={() => loadPresetPattern('raspberry')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors cursor-pointer"
                  title="Pi Pattern"
                >
                  Pi
                </button>
                <button
                  onClick={() => loadPresetPattern('smiley')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors cursor-pointer"
                  title="Smiley Pattern"
                >
                  Smile
                </button>
                <button
                  onClick={() => loadPresetPattern('rainbow')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors cursor-pointer"
                  title="Rainbow Pattern"
                >
                  Color
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: 5-Way Joystick & Real-Time Sensors */}
        <div className="xl:col-span-5 flex flex-col gap-3">
          {/* Virtual 5-Way Joystick */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#840038]" />
                <span>5-WAY JOYSTICK EMULATOR</span>
              </span>
              <span className="text-xs font-mono text-slate-500">
                {isEmulationDisconnected
                  ? 'Inactive'
                  : lastJoystick
                  ? `Last: ${lastJoystick.direction.toUpperCase()} (${lastJoystick.action})`
                  : 'Idle'}
              </span>
            </div>

            <div className="flex items-center justify-center py-2">
              <div className="grid grid-cols-3 gap-1.5 w-36 h-36 p-1.5 bg-slate-200 border border-slate-300 rounded-xl relative shadow-inner">
                <div />
                <button
                  onClick={() => onTriggerJoystick('up')}
                  className={`rounded p-1 font-mono text-xs font-bold transition-all border cursor-pointer ${
                    lastJoystick?.direction === 'up'
                      ? 'bg-[#840038] text-white border-[#840038] shadow-md'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick UP"
                >
                  ▲
                </button>
                <div />

                <button
                  onClick={() => onTriggerJoystick('left')}
                  className={`rounded p-1 font-mono text-xs font-bold transition-all border cursor-pointer ${
                    lastJoystick?.direction === 'left'
                      ? 'bg-[#840038] text-white border-[#840038] shadow-md'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick LEFT"
                >
                  ◀
                </button>
                <button
                  onClick={() => onTriggerJoystick('centre')}
                  className={`rounded p-1 font-mono text-xs font-bold transition-all border cursor-pointer ${
                    lastJoystick?.direction === 'centre'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                      : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 active:scale-95'
                  }`}
                  title="Joystick CENTRE PRESS"
                >
                  ●
                </button>
                <button
                  onClick={() => onTriggerJoystick('right')}
                  className={`rounded p-1 font-mono text-xs font-bold transition-all border cursor-pointer ${
                    lastJoystick?.direction === 'right'
                      ? 'bg-[#840038] text-white border-[#840038] shadow-md'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick RIGHT"
                >
                  ▶
                </button>

                <div />
                <button
                  onClick={() => onTriggerJoystick('down')}
                  className={`rounded p-1 font-mono text-xs font-bold transition-all border cursor-pointer ${
                    lastJoystick?.direction === 'down'
                      ? 'bg-[#840038] text-white border-[#840038] shadow-md'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick DOWN"
                >
                  ▼
                </button>
                <div />
              </div>
            </div>
          </div>

          {/* Environmental Sensor Telemetry Readouts (shows nothing/dashes if disconnected in emulation) */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Temperature */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="flex items-center gap-1 font-mono">
                  <Thermometer className="w-3.5 h-3.5 text-rose-600" />
                  <span>TEMP</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {sensors.temperature.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500">°C</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {sensors.isSimulated ? 'Simulated' : 'HTS221 (HW)'} · {((sensors.temperature * 9) / 5 + 32).toFixed(1)}°F
              </div>
            </div>

            {/* Humidity */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="flex items-center gap-1 font-mono">
                  <Wind className="w-3.5 h-3.5 text-cyan-600" />
                  <span>HUMIDITY</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {sensors.humidity.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500">% rH</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {sensors.isSimulated ? 'Simulated' : 'HTS221 (HW)'}
              </div>
            </div>

            {/* Pressure */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="flex items-center gap-1 font-mono">
                  <Gauge className="w-3.5 h-3.5 text-amber-600" />
                  <span>PRESSURE</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {sensors.pressure.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500">hPa</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {sensors.isSimulated ? 'Simulated' : 'LPS25H (HW)'}
              </div>
            </div>
          </div>

          {/* IMU Motion Telemetry */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700">
            <div className="flex items-center justify-between mb-2 text-slate-600">
              <span className="flex items-center gap-1.5 font-bold">
                <Activity className="w-3.5 h-3.5 text-[#840038]" />
                <span>9-DOF IMU ({sensors.isSimulated ? 'Simulated' : 'LSM9DS1 HW'})</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>Heading: {sensors.compassHeading.toFixed(1)}°</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-0.5">
                  Accelerometer (g):
                </span>
                <div className="text-slate-800 font-bold">
                  {`X: ${sensors.accelerometer.x.toFixed(2)} Y: ${sensors.accelerometer.y.toFixed(2)} Z: ${sensors.accelerometer.z.toFixed(2)}`}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-0.5">
                  Gyroscope (°/s):
                </span>
                <div className="text-slate-800 font-bold">
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
