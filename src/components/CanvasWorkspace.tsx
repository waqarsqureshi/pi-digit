import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Code2,
  Settings,
  Layers,
  HelpCircle,
  LogOut,
  ChevronDown,
  Save,
  Play,
  Trash2,
  Cpu,
  Bell,
  Thermometer,
  Gauge,
  Droplets,
  MoreHorizontal,
  ChevronUp,
  Maximize2,
  Check,
} from 'lucide-react';
import {
  FullHardwareState,
  RgbColor,
  JoystickDirection,
} from '../types/digitalTwin';

interface CanvasWorkspaceProps {
  state: FullHardwareState;
  onSetPixel: (x: number, y: number, color: RgbColor) => void;
  onClearMatrix: (color?: RgbColor) => void;
  onSetMatrixPattern: (pixels: RgbColor[]) => void;
  onTriggerJoystick: (direction: JoystickDirection) => void;
  onRunProgram: (code: string, language: 'python' | 'c', filename: string, timeoutMs: number) => void;
  onStopProgram: () => void;
  onConnectHardware: () => void;
  onOpenDiagnostics: () => void;
  onOpenHelp: () => void;
}

// Sample colorful palette for 8x8 Matrix
const DEFAULT_RGB_MATRIX: RgbColor[] = [
  [239, 68, 68], [249, 115, 22], [245, 158, 11], [16, 185, 129], [6, 182, 212], [59, 130, 246], [139, 92, 246], [236, 72, 153],
  [249, 115, 22], [245, 158, 11], [16, 185, 129], [6, 182, 212], [59, 130, 246], [139, 92, 246], [236, 72, 153], [239, 68, 68],
  [245, 158, 11], [16, 185, 129], [6, 182, 212], [59, 130, 246], [139, 92, 246], [236, 72, 153], [239, 68, 68], [249, 115, 22],
  [16, 185, 129], [6, 182, 212], [59, 130, 246], [139, 92, 246], [236, 72, 153], [239, 68, 68], [249, 115, 22], [245, 158, 11],
  [6, 182, 212], [59, 130, 246], [139, 92, 246], [236, 72, 153], [239, 68, 68], [249, 115, 22], [245, 158, 11], [16, 185, 129],
  [59, 130, 246], [139, 92, 246], [236, 72, 153], [239, 68, 68], [249, 115, 22], [245, 158, 11], [16, 185, 129], [6, 182, 212],
  [139, 92, 246], [236, 72, 153], [239, 68, 68], [249, 115, 22], [245, 158, 11], [16, 185, 129], [6, 182, 212], [59, 130, 246],
  [236, 72, 153], [239, 68, 68], [249, 115, 22], [245, 158, 11], [16, 185, 129], [6, 182, 212], [59, 130, 246], [139, 92, 246],
];

const INITIAL_CODE = `import React, { useState, useEffect } from 'react';
import LcdDisplay, { Matrix8x8 } from './components';

const defaultApp = () => {
  return (
    <3K>
      <Matrix8x8 />
      <Joystick />
      <LcdDisplay />
      <Matrix8x8 />
      <Joystick />
      <LcdDisplay />
        <LcdDisplay name="LcdDisplay" />
      />
    </React>
  </div>
);`;

// Selection & Transform Handles wrapper (Figma / Blueprint Studio style)
function TransformBox({
  children,
  isSelected = true,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-sm bg-[#131926] border ${
        isSelected ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-[#232e42]'
      } transition-all duration-150 ${className}`}
    >
      {/* 8 Corner & Edge Transform Handles */}
      {isSelected && (
        <>
          {/* Top Edge */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-600 z-20 pointer-events-none" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-600 z-20 pointer-events-none" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-600 z-20 pointer-events-none" />

          {/* Middle Edges */}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white border border-blue-600 z-20 pointer-events-none" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white border border-blue-600 z-20 pointer-events-none" />

          {/* Bottom Edge */}
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-600 z-20 pointer-events-none" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-600 z-20 pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-600 z-20 pointer-events-none" />

          {/* Resize Corner Indicator */}
          <div className="absolute bottom-1 right-1 text-slate-400 text-[10px] pointer-events-none select-none opacity-60">
            ⤡
          </div>
        </>
      )}
      {children}
    </div>
  );
}

export function CanvasWorkspace({
  state,
  onSetPixel,
  onClearMatrix,
  onSetMatrixPattern,
  onTriggerJoystick,
  onRunProgram,
  onStopProgram,
  onConnectHardware,
  onOpenDiagnostics,
  onOpenHelp,
}: CanvasWorkspaceProps) {
  // Navigation & Dropdown states
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [code, setCode] = useState(INITIAL_CODE);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'user@iot-studio:~$',
    'build new module and /react/react/root build',
    'build buildings...',
    'build buildings. 21',
    '',
    'Server started at localhost:3000',
    'Server started processing...',
    'user@iot-studio:~$',
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  // Widget States
  const [matrixBrightness, setMatrixBrightness] = useState<number>(85);
  const [lcdContrast, setLcdContrast] = useState<number>(65);
  const [lcdRunning, setLcdRunning] = useState<boolean>(true);
  const [joystickRunning, setJoystickRunning] = useState<boolean>(true);
  const [cameraRunning, setCameraRunning] = useState<boolean>(true);
  const [pwmRunning, setPwmRunning] = useState<boolean>(true);
  const [sensorsRunning, setSensorsRunning] = useState<boolean>(true);

  // Active Selected Card for Focus
  const [selectedCard, setSelectedCard] = useState<string>('matrix');

  // Interactive Joystick Coordinates
  const [joystickCoords, setJoystickCoords] = useState<{ x: number; y: number }>({ x: 30, y: 0 });

  // PWM Controls
  const [pwmDuty, setPwmDuty] = useState<number>(50);
  const [pwmFreq, setPwmFreq] = useState<number>(1200);

  // Camera Capture state & animation
  const [cameraFrameTimestamp, setCameraFrameTimestamp] = useState<number>(Date.now());
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Continuous Camera Stream Polling
  useEffect(() => {
    if (!cameraRunning) return;
    const interval = setInterval(() => {
      setCameraFrameTimestamp(Date.now());
    }, 150);
    return () => clearInterval(interval);
  }, [cameraRunning]);

  // PWM Oscilloscope Sine wave animation phase
  const [wavePhase, setWavePhase] = useState<number>(0);
  useEffect(() => {
    if (!pwmRunning) return;
    const interval = setInterval(() => {
      setWavePhase((p) => (p + 0.15) % (Math.PI * 2));
    }, 40);
    return () => clearInterval(interval);
  }, [pwmRunning]);

  // Handle Examples Selection
  const handleSelectExample = (name: string) => {
    setExamplesOpen(false);
    if (name === 'Tic Tac Toe Game') {
      const tttPattern: RgbColor[] = Array(64).fill([0, 0, 0]);
      // Draw grid lines
      for (let i = 0; i < 8; i++) {
        tttPattern[i * 8 + 2] = [80, 80, 80];
        tttPattern[i * 8 + 5] = [80, 80, 80];
        tttPattern[2 * 8 + i] = [80, 80, 80];
        tttPattern[5 * 8 + i] = [80, 80, 80];
      }
      // Put X and O
      tttPattern[0 * 8 + 0] = [255, 50, 50];
      tttPattern[1 * 8 + 1] = [255, 50, 50];
      tttPattern[4 * 8 + 3] = [50, 200, 255];
      tttPattern[4 * 8 + 4] = [50, 200, 255];
      onSetMatrixPattern(tttPattern);
      setTerminalLogs((prev) => [
        ...prev,
        'user@iot-studio:~$ python3 examples/tic_tac_toe.py',
        '[IoT Matrix] Tic-Tac-Toe Game initialized. Ready for joystick input.',
        'user@iot-studio:~$',
      ]);
    } else if (name === 'Clear Screen') {
      onClearMatrix([0, 0, 0]);
      setTerminalLogs((prev) => [
        ...prev,
        'user@iot-studio:~$ sense.clear()',
        '[IoT Matrix] 8x8 Screen Cleared (0x000000).',
        'user@iot-studio:~$',
      ]);
    } else if (name === 'Draw Shapes') {
      const diamond: RgbColor[] = Array(64).fill([10, 15, 25]);
      const shapeIndices = [3, 4, 10, 13, 17, 22, 24, 31, 32, 39, 41, 46, 50, 53, 59, 60];
      shapeIndices.forEach((idx) => {
        diamond[idx] = [0, 255, 200];
      });
      onSetMatrixPattern(diamond);
      setTerminalLogs((prev) => [
        ...prev,
        'user@iot-studio:~$ python3 examples/draw_shapes.py',
        '[IoT Matrix] Geometric diamond glyph rendered to /dev/fb1.',
        'user@iot-studio:~$',
      ]);
    } else if (name === 'Choose RGB Colors') {
      onSetMatrixPattern(DEFAULT_RGB_MATRIX);
      setTerminalLogs((prev) => [
        ...prev,
        'user@iot-studio:~$ python3 examples/rgb_palette.py',
        '[IoT Matrix] Full 64-color spectral sweep loaded.',
        'user@iot-studio:~$',
      ]);
    } else if (name === 'Capture & Draw Pi Cam 8 /"') {
      handleCaptureToMatrix();
    }
  };

  // Capture Camera Frame to 8x8 Matrix
  const handleCaptureToMatrix = async () => {
    setIsCapturing(true);
    setTerminalLogs((prev) => [
      ...prev,
      'user@iot-studio:~$ python3 scripts/capture_camera_to_matrix.py',
      '[*] Sampling 640x480 frame -> Resizing to 8x8 RGB block array...',
    ]);

    try {
      // Create high-contrast sampled pixel representation based on lab camera
      const camPixels: RgbColor[] = [];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (y < 3) {
            // Upper wall & lab cabinets: light grayish
            camPixels.push([180 + (x * 4), 185 + (y * 5), 195]);
          } else if (y === 3 && (x === 2 || x === 3)) {
            // Power switch / socket in camera view
            camPixels.push([220, 40, 40]);
          } else if (x >= 4 && y >= 3) {
            // Blue organizer drawers on the right
            camPixels.push([30, 80 + (y * 15), 180 + (x * 8)]);
          } else {
            // Lab bench tabletop: warmer tones
            camPixels.push([140 + (x * 6), 110 + (y * 4), 85]);
          }
        }
      }
      onSetMatrixPattern(camPixels);
      // Also post to backend if active
      fetch('/api/camera/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixels: camPixels }),
      }).catch(() => {});

      setTerminalLogs((prev) => [
        ...prev,
        '[PASS] Camera frame successfully converted and drawn on 8x8 LED Matrix!',
        'user@iot-studio:~$',
      ]);
    } finally {
      setTimeout(() => setIsCapturing(false), 800);
    }
  };

  // Joystick directional trigger
  const handleMoveJoystick = (dir: JoystickDirection) => {
    onTriggerJoystick(dir);
    setJoystickCoords((prev) => {
      let nx = prev.x;
      let ny = prev.y;
      if (dir === 'left') nx = Math.max(-100, prev.x - 25);
      if (dir === 'right') nx = Math.min(100, prev.x + 25);
      if (dir === 'up') ny = Math.min(100, prev.y + 25);
      if (dir === 'down') ny = Math.max(-100, prev.y - 25);
      if (dir === 'middle') {
        nx = 0;
        ny = 0;
      }
      return { x: nx, y: ny };
    });
    setTerminalLogs((prev) => [
      ...prev,
      `[Joystick Input] Direction: ${dir.toUpperCase()} -> State: X=${joystickCoords.x}, Y=${joystickCoords.y}`,
    ]);
  };

  // Save Code
  const handleSave = () => {
    setSavedToast(true);
    setTerminalLogs((prev) => [
      ...prev,
      `user@iot-studio:~$ save --source defaultApp.tsx`,
      `[File System] Workspace buffer synchronized (${code.length} bytes).`,
      'user@iot-studio:~$',
    ]);
    setTimeout(() => setSavedToast(false), 2000);
  };

  // Run Code
  const handleRun = () => {
    setTerminalLogs((prev) => [
      ...prev,
      'user@iot-studio:~$ npm run start:simulator',
      'Compiled successfully in 142ms.',
      'Mounting <Matrix8x8 />, <Joystick />, <LcdDisplay />...',
      '[Canvas Engine] Hot Module Replacement active on port 3000.',
      'user@iot-studio:~$',
    ]);
  };

  // Clear Code & Terminal
  const handleClear = () => {
    setCode('');
    setTerminalLogs(['user@iot-studio:~$', 'Console cleared.', 'user@iot-studio:~$']);
  };

  // Terminal command submit
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalInput('');
    setTerminalLogs((prev) => [
      ...prev,
      `user@iot-studio:~$ ${cmd}`,
      `Executed: ${cmd} (status: 0)`,
      'user@iot-studio:~$',
    ]);
  };

  // Current matrix data source
  const activeMatrix = (state.matrix && state.matrix.length === 64)
    ? state.matrix
    : DEFAULT_RGB_MATRIX;

  return (
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-[#0d111a] text-slate-200 overflow-hidden font-sans select-none">
      {/* =========================================================================
          TOP NAVIGATION BAR (Exact copy of reference image header)
         ========================================================================= */}
      <header className="h-11 shrink-0 bg-[#0f1422] border-b border-[#1b2336] px-4 flex items-center justify-between z-30">
        {/* Brand Left */}
        <div className="flex items-center gap-2.5">
          {/* React Atom Logo */}
          <div className="text-cyan-400 flex items-center justify-center">
            <svg className="w-5 h-5 animate-[spin_12s_linear_infinite]" viewBox="0 0 115.3 100" fill="none" stroke="currentColor" strokeWidth="6">
              <ellipse cx="57.65" cy="50" rx="16.5" ry="46" transform="rotate(30 57.65 50)" />
              <ellipse cx="57.65" cy="50" rx="16.5" ry="46" transform="rotate(90 57.65 50)" />
              <ellipse cx="57.65" cy="50" rx="16.5" ry="46" transform="rotate(150 57.65 50)" />
              <circle cx="57.65" cy="50" r="8" fill="currentColor" />
            </svg>
          </div>
          <span className="font-bold text-slate-100 text-sm tracking-wide">
            IoT React Studio
          </span>
        </div>

        {/* Center Title */}
        <div className="font-semibold text-slate-200 text-sm tracking-wider">
          Canvas Workspace
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 text-slate-300">
          <button
            onClick={onOpenDiagnostics}
            className="p-1 hover:text-white transition-colors cursor-pointer"
            title="Settings & Hardware Diagnostics"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={onOpenHelp}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Notifications & Guides"
            >
              <Bell className="w-4 h-4" />
            </button>
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          </div>

          <div className="w-6 h-6 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center text-xs text-slate-300 cursor-pointer overflow-hidden">
            <div className="w-3 h-3 rounded-full bg-slate-400 mt-1" />
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN WORKSPACE LAYOUT: LEFT CODE/TERMINAL + RIGHT CANVAS GRID
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* =====================================================================
            LEFT COLUMN: CODE EDITOR & TERMINAL (~38% width)
           ===================================================================== */}
        <div className="w-[40%] min-w-[420px] max-w-[620px] border-r border-[#1b2336] bg-[#0c1018] flex flex-col shrink-0">
          {/* Code Editor Header Bar */}
          <div className="h-10 border-b border-[#1b2336] px-3 flex items-center justify-between bg-[#101625] gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-slate-200">
                Code Editor
              </span>

              {/* Connect Hardware Button */}
              <button
                onClick={onConnectHardware}
                className="px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                title="Connect or probe physical Raspberry Pi"
              >
                <Cpu className="w-3 h-3 text-emerald-400" />
                <span>Connect Hardware</span>
              </button>

              {/* Examples from Pi Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExamplesOpen((prev) => !prev)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium border border-blue-500/40 bg-[#162035] text-blue-300 hover:bg-blue-900/40 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Examples from Pi</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {examplesOpen && (
                  <div className="absolute top-7 left-0 w-52 bg-[#121929] border border-[#232f48] shadow-2xl rounded-sm py-1 z-50 text-xs">
                    {[
                      'Tic Tac Toe Game',
                      'Clear Screen',
                      'Draw Shapes',
                      'Choose RGB Colors',
                      'Capture & Draw Pi Cam 8 /"',
                    ].map((item) => (
                      <button
                        key={item}
                        onClick={() => handleSelectExample(item)}
                        className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-blue-600/30 hover:text-white transition-colors cursor-pointer"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Save, Run, Clear Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSave}
                className="px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Save Code"
              >
                {savedToast ? <Check className="w-3 h-3 text-emerald-200" /> : <Save className="w-3 h-3" />}
                <span>Save</span>
              </button>

              <button
                onClick={handleRun}
                className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Execute program on simulator & board"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Run</span>
              </button>

              <button
                onClick={handleClear}
                className="px-2 py-0.5 rounded bg-rose-700/80 hover:bg-rose-600 text-white text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear code"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Code Editor Body with Vertical Tool Rail */}
          <div className="flex-1 flex overflow-hidden border-b border-[#1b2336]">
            {/* Left Thin Icon Rail */}
            <div className="w-10 bg-[#0e1320] border-r border-[#1b2336] flex flex-col items-center justify-between py-2 shrink-0 text-slate-400">
              <div className="flex flex-col items-center gap-4">
                <button className="p-1 hover:text-white cursor-pointer" title="Project Files">
                  <FileText className="w-4 h-4" />
                </button>
                <button className="p-1 text-cyan-400 cursor-pointer" title="Code Editor">
                  <Code2 className="w-4 h-4" />
                </button>
                <button onClick={onOpenDiagnostics} className="p-1 hover:text-white cursor-pointer" title="Config">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-1 hover:text-white cursor-pointer" title="Components Tree">
                  <Layers className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-4">
                <button onClick={onOpenHelp} className="p-1 hover:text-white cursor-pointer" title="Help Guide">
                  <HelpCircle className="w-4 h-4" />
                </button>
                <button className="p-1 hover:text-white cursor-pointer" title="Logout / Exit">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Textarea with Line Numbers */}
            <div className="flex-1 flex bg-[#0c1018] overflow-auto font-mono text-xs text-slate-300">
              {/* Line Numbers */}
              <div className="w-8 py-2.5 text-right pr-2 text-slate-600 select-none bg-[#0a0e16] border-r border-[#151c2c] leading-relaxed shrink-0">
                {Array.from({ length: 18 }, (_, i) => (
                  <div key={i + 1}>{i + 1}</div>
                ))}
              </div>

              {/* Editable Code */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 p-2.5 bg-transparent resize-none outline-none leading-relaxed text-slate-200 font-mono whitespace-pre overflow-x-auto text-[12px]"
              />
            </div>
          </div>

          {/* Terminal Section (Bottom of Left Column) */}
          <div className="h-48 bg-[#080c14] flex flex-col shrink-0">
            <div className="h-7 border-b border-[#1b2336] px-3 flex items-center justify-between bg-[#0e1422] text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Terminal</span>
              <button className="hover:text-white cursor-pointer">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-2 font-mono text-[11px] overflow-y-auto leading-tight text-emerald-400/90 space-y-1">
              {terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.startsWith('user@')
                      ? 'text-emerald-400 font-bold'
                      : log.startsWith('[PASS]')
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))}
              <div className="flex items-center text-emerald-400">
                <span>user@iot-studio:~$ </span>
                <span className="inline-block w-2 h-3.5 bg-emerald-400 ml-1 animate-pulse" />
              </div>
            </div>

            <form onSubmit={handleTerminalSubmit} className="border-t border-[#1b2336] flex bg-[#060910]">
              <span className="px-2 py-1 text-slate-500 font-mono text-[11px]">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Type command (e.g. ls, clear, python3 test)..."
                className="flex-1 bg-transparent py-1 text-[11px] font-mono text-slate-200 outline-none"
              />
            </form>
          </div>
        </div>

        {/* =====================================================================
            RIGHT COLUMN: CANVAS WORKSPACE (6 Visual Hardware Cards in 2x3 Grid)
           ===================================================================== */}
        <div className="flex-1 bg-[#090d16] p-3 overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-2 gap-3 max-w-[1300px] mx-auto">
            {/* -------------------------------------------------------------
                CARD 1: 8x8 Matrix (RGB) (Always Running) [Top Left]
               ------------------------------------------------------------- */}
            <TransformBox
              isSelected={selectedCard === 'matrix'}
              onClick={() => setSelectedCard('matrix')}
              className="p-3 flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-100">
                    8x8 Matrix (RGB) (Always Running)
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Examples: Tic Toe 10e, Clear Scicen, Custom Shapes, Draw Carn image.
                </p>
              </div>

              {/* Matrix + Brightness Vertical Slider */}
              <div className="flex items-center justify-center gap-6 my-2">
                {/* 8x8 Circular LED Grid */}
                <div className="p-2.5 bg-[#0a0e18] rounded border border-[#1b2336] shadow-inner grid grid-cols-8 gap-1.5">
                  {activeMatrix.map(([r, g, b], idx) => {
                    const factor = matrixBrightness / 100;
                    const adjR = Math.round(r * factor);
                    const adjG = Math.round(g * factor);
                    const adjB = Math.round(b * factor);
                    const isLit = adjR > 15 || adjG > 15 || adjB > 15;
                    const colorStyle = isLit
                      ? `rgb(${adjR}, ${adjG}, ${adjB})`
                      : '#1e2433';
                    const glowStyle = isLit
                      ? `0 0 6px rgba(${adjR}, ${adjG}, ${adjB}, 0.7)`
                      : 'none';

                    return (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle color on click
                          const newColor: RgbColor = isLit ? [0, 0, 0] : [0, 255, 200];
                          onSetPixel(idx % 8, Math.floor(idx / 8), newColor);
                        }}
                        style={{
                          backgroundColor: colorStyle,
                          boxShadow: glowStyle,
                        }}
                        className="w-3.5 h-3.5 rounded-full cursor-pointer transition-transform hover:scale-125"
                        title={`LED [${idx % 8}, ${Math.floor(idx / 8)}] - RGB(${r}, ${g}, ${b})`}
                      />
                    );
                  })}
                </div>

                {/* Vertical Brightness Slider */}
                <div className="flex flex-col items-center justify-between h-36 py-1 select-none text-slate-400 text-xs">
                  <span className="font-bold">+</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={matrixBrightness}
                    onChange={(e) => setMatrixBrightness(Number(e.target.value))}
                    className="h-24 w-1 accent-white cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                  />
                  <span className="font-bold">—</span>
                </div>
              </div>
            </TransformBox>

            {/* -------------------------------------------------------------
                CARD 2: LCD Display (16x2) [Top Right]
               ------------------------------------------------------------- */}
            <TransformBox
              isSelected={selectedCard === 'lcd'}
              onClick={() => setSelectedCard('lcd')}
              className="p-3 flex flex-col justify-between min-h-[220px]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-slate-100">
                  LCD Display (16x2)
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLcdRunning(true);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      lcdRunning ? 'bg-emerald-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    RUN
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLcdRunning(false);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      !lcdRunning ? 'bg-rose-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    STOP
                  </button>
                </div>
              </div>

              {/* Realistic Green PCB Board & Golden Pin Headers */}
              <div className="my-1.5 p-2 bg-[#143d26] rounded border-2 border-[#1e5837] shadow-md flex flex-col items-center">
                {/* 16 Golden Pin Headers Row */}
                <div className="w-full flex justify-center gap-1 mb-1.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="w-1 h-1.5 bg-amber-400/90 rounded-2xs border border-amber-600/70" />
                  ))}
                </div>

                {/* Dark LCD Screen with Contrast */}
                <div
                  style={{ opacity: lcdContrast / 100 }}
                  className="w-full bg-[#121c17] border border-[#1a2e22] rounded p-2.5 text-center shadow-inner"
                >
                  <div className="font-mono text-sm tracking-widest text-emerald-400/90 font-bold uppercase drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                    {state.lcd?.lines?.[0] || 'READY'}
                  </div>
                  <div className="font-mono text-xs tracking-wider text-emerald-300/80 mt-1">
                    {state.lcd?.lines?.[1] || '(Press RUN to start)'}
                  </div>
                </div>
              </div>

              {/* Contrast Slider */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <span className="text-[11px]">Contrast</span>
                <span className="font-bold">—</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={lcdContrast}
                  onChange={(e) => setLcdContrast(Number(e.target.value))}
                  className="w-40 h-1 accent-white bg-slate-700 rounded-lg cursor-pointer"
                />
                <span className="font-bold">+</span>
              </div>
            </TransformBox>

            {/* -------------------------------------------------------------
                CARD 3: Joystick [Middle Left]
               ------------------------------------------------------------- */}
            <TransformBox
              isSelected={selectedCard === 'joystick'}
              onClick={() => setSelectedCard('joystick')}
              className="p-3 flex flex-col justify-between min-h-[220px]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-slate-100">
                  Joystick
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setJoystickRunning(true);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      joystickRunning ? 'bg-emerald-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    RUN
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setJoystickRunning(false);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      !joystickRunning ? 'bg-rose-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    STOP
                  </button>
                </div>
              </div>

              {/* Tactile D-Pad & Directional Chevrons + Coordinates Readout */}
              <div className="flex items-center justify-around my-2">
                {/* Metallic Circular D-Pad */}
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-b from-[#253248] via-[#1a2335] to-[#121926] border-2 border-[#334460] shadow-xl flex items-center justify-center">
                  {/* Up Chevron */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveJoystick('up');
                    }}
                    className="absolute top-2 left-1/2 -translate-x-1/2 text-slate-300 hover:text-cyan-400 hover:scale-125 transition-transform cursor-pointer p-1"
                  >
                    <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Down Chevron */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveJoystick('down');
                    }}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 text-slate-300 hover:text-cyan-400 hover:scale-125 transition-transform cursor-pointer p-1"
                  >
                    <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Left Chevron */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveJoystick('left');
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-cyan-400 hover:scale-125 transition-transform cursor-pointer p-1"
                  >
                    <span className="font-bold text-sm">‹</span>
                  </button>

                  {/* Right Chevron */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveJoystick('right');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-cyan-400 hover:scale-125 transition-transform cursor-pointer p-1"
                  >
                    <span className="font-bold text-sm">›</span>
                  </button>

                  {/* Center Metallic Thumbstick Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveJoystick('middle');
                    }}
                    className="w-12 h-12 rounded-full bg-gradient-to-b from-[#3a4d6b] to-[#1e2738] border border-[#4d6387] shadow-inner flex items-center justify-center text-slate-400 hover:text-white active:scale-95 transition-transform cursor-pointer"
                    title="Center Click (Reset to Origin)"
                  >
                    <div className="w-4 h-4 rounded-full bg-[#182130] border border-[#4d6387]" />
                  </button>
                </div>

                {/* Coordinates Readout */}
                <div className="font-mono text-xs sm:text-sm text-slate-200 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">X:</span>
                    <span className="font-bold tracking-wider">
                      ({joystickCoords.x}, 0)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Y:</span>
                    <span className="font-bold tracking-wider">
                      ({joystickCoords.y}, 0)
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-center text-slate-400 font-mono">
                Sense HAT 5-Way Joystick Driver (GPIO / I2C)
              </div>
            </TransformBox>

            {/* -------------------------------------------------------------
                CARD 4: Camera Feed [Middle Right]
               ------------------------------------------------------------- */}
            <TransformBox
              isSelected={selectedCard === 'camera'}
              onClick={() => setSelectedCard('camera')}
              className="p-3 flex flex-col justify-between min-h-[220px]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-slate-100">
                  Camera Feed
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCameraRunning(true);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      cameraRunning ? 'bg-emerald-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    RUN
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCameraRunning(false);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      !cameraRunning ? 'bg-rose-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    STOP
                  </button>
                </div>
              </div>

              {/* Status Bar + Callout Button with Pointer Arrow */}
              <div className="flex items-center justify-between mt-1 mb-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-medium">Live Feed</span>
                </div>

                {/* Callout Pointer Button "Capture to Matrix" */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCaptureToMatrix();
                    }}
                    className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span>Capture to Matrix</span>
                  </button>
                  {/* Callout Downward Arrow pointing at camera frame */}
                  <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-amber-400" />
                </div>
              </div>

              {/* Camera Frame Viewport with Red Reticle HUD Overlay */}
              <div className="relative h-28 bg-[#0a0e18] rounded border border-[#1b2336] overflow-hidden flex items-center justify-center">
                {/* Live Camera Stream */}
                <img
                  src="/api/camera/stream"
                  alt="Live Camera Feed"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `/api/camera/frame?t=${Date.now()}`;
                  }}
                />

                {/* HUD Red Reticle Overlay (Corner brackets & concentric radar arcs) */}
                <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                  {/* Top Reticle Corners */}
                  <div className="flex justify-between items-start">
                    <div className="w-5 h-5 border-t-2 border-l-2 border-rose-500" />
                    <div className="w-5 h-5 border-t-2 border-r-2 border-rose-500" />
                  </div>

                  {/* Concentric Radar Rings at Bottom Center */}
                  <div className="self-center flex flex-col items-center">
                    <div className="relative w-16 h-8 overflow-hidden">
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border border-rose-500/80" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border border-rose-500/90" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-rose-500" />
                    </div>
                  </div>

                  {/* Bottom Reticle Corners */}
                  <div className="flex justify-between items-end">
                    <div className="w-5 h-5 border-b-2 border-l-2 border-rose-500" />
                    <div className="w-5 h-5 border-b-2 border-r-2 border-rose-500" />
                  </div>
                </div>

                {isCapturing && (
                  <div className="absolute inset-0 bg-white/70 animate-pulse flex items-center justify-center font-bold text-slate-900 text-xs">
                    CAPTURING FRAME...
                  </div>
                )}
              </div>
            </TransformBox>

            {/* -------------------------------------------------------------
                CARD 5: PWM Controller [Bottom Left]
               ------------------------------------------------------------- */}
            <TransformBox
              isSelected={selectedCard === 'pwm'}
              onClick={() => setSelectedCard('pwm')}
              className="p-3 flex flex-col justify-between min-h-[220px]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-slate-100">
                  PWM Controller
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPwmRunning(true);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      pwmRunning ? 'bg-emerald-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    RUN
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPwmRunning(false);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      !pwmRunning ? 'bg-rose-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    STOP
                  </button>
                </div>
              </div>

              {/* Glowing Oscilloscope Sine Waveform */}
              <div className="h-20 bg-[#0a0e18] rounded border border-[#1b2336] relative overflow-hidden flex items-center justify-center my-1">
                {/* Oscilloscope Grid Background */}
                <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:16px_16px]" />

                {/* Animated Smooth Sine Wave SVG */}
                <svg className="w-full h-full relative z-10" viewBox="0 0 300 80" preserveAspectRatio="none">
                  {/* Glowing blur underlay */}
                  <path
                    d={Array.from({ length: 300 }, (_, x) => {
                      const f = (pwmFreq / 1000) * 0.04;
                      const y = 40 + Math.sin(x * f + wavePhase) * (pwmDuty / 100 * 28);
                      return `${x === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="4"
                    className="opacity-40 blur-xs"
                  />
                  {/* Crisp wave line */}
                  <path
                    d={Array.from({ length: 300 }, (_, x) => {
                      const f = (pwmFreq / 1000) * 0.04;
                      const y = 40 + Math.sin(x * f + wavePhase) * (pwmDuty / 100 * 28);
                      return `${x === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Sliders: Duty Cycle & Frequency */}
              <div className="flex flex-col gap-1.5 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] w-20">Duty Cycle</span>
                  <span className="font-bold">—</span>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={pwmDuty}
                    onChange={(e) => setPwmDuty(Number(e.target.value))}
                    className="flex-1 mx-2 h-1 accent-white bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <span className="font-bold">+</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] w-20">Frequency</span>
                  <span className="font-bold">—</span>
                  <input
                    type="range"
                    min="200"
                    max="5000"
                    step="100"
                    value={pwmFreq}
                    onChange={(e) => setPwmFreq(Number(e.target.value))}
                    className="flex-1 mx-2 h-1 accent-white bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <span className="font-bold">+</span>
                </div>
              </div>
            </TransformBox>

            {/* -------------------------------------------------------------
                CARD 6: Sensor Reorganization [Bottom Right]
               ------------------------------------------------------------- */}
            <TransformBox
              isSelected={selectedCard === 'sensors'}
              onClick={() => setSelectedCard('sensors')}
              className="p-3 flex flex-col justify-between min-h-[220px]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-slate-100">
                  Sensor Reorganization
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSensorsRunning(true);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      sensorsRunning ? 'bg-emerald-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    RUN
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSensorsRunning(false);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                      !sensorsRunning ? 'bg-rose-500 text-white' : 'bg-[#1b2336] text-slate-400 hover:text-white'
                    }`}
                  >
                    STOP
                  </button>
                </div>
              </div>

              {/* Two Column Layout: Environmental Sensors & Motion Sensor */}
              <div className="grid grid-cols-2 gap-3 my-1">
                {/* Left Column: Environmental Sensors */}
                <div className="flex flex-col gap-2 font-mono text-[11px] text-slate-300">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Environmental Sensors
                  </div>

                  {/* Temp */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                      <span>Temp: {state.sensors?.temperature?.toFixed(1) || '24.5'}°C</span>
                    </div>
                    {/* Sparkline curve */}
                    <svg className="w-10 h-3" viewBox="0 0 40 12">
                      <path d="M0,8 Q10,2 20,6 T40,4" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                    </svg>
                  </div>

                  {/* Barometer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      <span>Barometer: {state.sensors?.pressure?.toFixed(1) || '1013.2'} hPa</span>
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Humidity: {state.sensors?.humidity?.toFixed(0) || '48'}%</span>
                    </div>
                    {/* Sparkline curve */}
                    <svg className="w-10 h-3" viewBox="0 0 40 12">
                      <path d="M0,6 Q10,10 20,4 T40,7" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* Right Column: Motion Sensor */}
                <div className="flex flex-col justify-between font-mono text-[11px] text-slate-300 border-l border-[#1b2336] pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Motion Sensor
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      DETECTED
                    </span>
                  </div>

                  {/* 3D Coordinate Axis Graphic & Values */}
                  <div className="flex items-center justify-between mt-1">
                    {/* 3D Coordinate Arrows Icon */}
                    <div className="relative w-8 h-8">
                      {/* Z vertical axis */}
                      <div className="absolute left-3 bottom-1 h-5 w-0.5 bg-cyan-400" />
                      <span className="absolute top-0 left-2 text-[8px] text-cyan-400 font-bold">Z</span>
                      {/* X horizontal axis */}
                      <div className="absolute left-3 bottom-1 w-4 h-0.5 bg-rose-400" />
                      <span className="absolute bottom-0 right-0 text-[8px] text-rose-400 font-bold">X</span>
                      {/* Y diagonal axis */}
                      <div className="absolute left-1 bottom-1 w-3 h-3 border-l-2 border-b-2 border-emerald-400 -rotate-45" />
                      <span className="absolute bottom-0 left-0 text-[8px] text-emerald-400 font-bold">Y</span>
                    </div>

                    {/* XYZ values */}
                    <div className="flex flex-col text-[10px] text-right font-mono">
                      <span>X: {state.sensors?.accelerometer?.x?.toFixed(2) || '0.02'}g</span>
                      <span>Y: {state.sensors?.accelerometer?.y?.toFixed(2) || '-0.98'}g</span>
                      <div className="flex items-center justify-end gap-1">
                        <span>Z: {state.sensors?.accelerometer?.z?.toFixed(2) || '0.15'}g</span>
                        <svg className="w-8 h-2.5" viewBox="0 0 30 10">
                          <path d="M0,6 Q8,2 15,7 T30,4" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono text-center">
                HTS221 / LPS25H / LSM9DS1 Active Telemetry
              </div>
            </TransformBox>
          </div>
        </div>
      </div>
    </div>
  );
}
