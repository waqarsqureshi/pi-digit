import React, { useState, useEffect, useRef, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import {
  FileText,
  Code2,
  Settings,
  HelpCircle,
  Save,
  Play,
  Trash2,
  Cpu,
  Thermometer,
  Gauge,
  Droplets,
  Maximize2,
  Minimize2,
  X,
  RotateCcw,
  Search,
  Camera,
  Activity,
  Grid,
  Sliders,
  Compass,
  Check,
  Zap,
  GripHorizontal,
  Square,
  BookOpen,
  ChevronDown,
  Palette,
  StopCircle,
  LayoutGrid,
  Layers,
  Undo2,
  Plus,
  Eye,
  EyeOff,
  Move,
  Columns,
  Terminal as TerminalIcon,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Gamepad2,
  Download,
  ExternalLink,
  PowerOff,
  Power,
  Navigation,
} from 'lucide-react';
import {
  FullHardwareState,
  RgbColor,
  JoystickDirection,
  JoystickAction,
  ProgramLanguage,
  TerminalOutput,
} from '../types/digitalTwin';
import { CURRICULUM_EXAMPLES } from '../data/curriculumExamples';

interface UnifiedWorkspaceProps {
  state: FullHardwareState;
  terminalOutputs: TerminalOutput[];
  layoutMode?: 'grid' | 'floating' | 'studio-focus' | 'bench';
  onSelectLayout?: (layout: 'grid' | 'floating' | 'studio-focus' | 'bench') => void;
  onSetPixel: (x: number, y: number, color: RgbColor) => void;
  onClearMatrix: (color?: RgbColor) => void;
  onSetMatrixPattern: (pixels: RgbColor[]) => void;
  onTriggerJoystick: (direction: JoystickDirection, action?: JoystickAction) => void;
  onRunProgram: (code: string, language: ProgramLanguage, filename: string, timeoutMs: number) => void;
  onStopProgram: () => void;
  onClearTerminal: () => void;
  onExecBashCommand?: (cmd: string) => Promise<string>;
  onConnectHardware: () => void;
  onOpenDiagnostics: () => void;
  onOpenHelp: () => void;
  isProbingHardware?: boolean;
  isWikiOpen?: boolean;
  setIsWikiOpen?: (open: boolean) => void;
  onRestoreDefaultView?: () => void;
}

type AppletId = 'matrix' | 'joystick' | 'environment' | 'motion' | 'gpio' | 'pwm' | 'monitor' | 'camera';

interface AppletConfig {
  id: AppletId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultColSpan: 1 | 2;
  enabled: boolean;
  minimized: boolean;
  maximized: boolean;
}

export const DEFAULT_APPLETS: AppletConfig[] = [
  { id: 'matrix', title: '8x8 LED Matrix', icon: Grid, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'joystick', title: 'Sense HAT 5-Way Joystick', icon: Compass, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'environment', title: 'Environmental Sensors (HTS221 / LPS25H)', icon: Thermometer, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'motion', title: 'Motion & Orientation IMU (LSM9DS1)', icon: Activity, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'gpio', title: '40-Pin GPIO Header Twin', icon: Zap, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'pwm', title: 'Hardware PWM Generator', icon: Activity, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'monitor', title: 'System & Bus Link Monitor', icon: Cpu, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'camera', title: 'Pi Camera Stream (Optional)', icon: Camera, defaultColSpan: 1, enabled: false, minimized: false, maximized: false },
];

export const APPLET_DESCRIPTIONS: Record<AppletId, string> = {
  matrix: 'Sense HAT 8x8 RGB LED matrix display with palette editor & presets',
  joystick: 'Sense HAT 5-Way Directional Stick with keycode diagnostics & coordinates',
  environment: 'Sense HAT HTS221 (Temp/Humidity) & LPS25H (Barometric Pressure/Dew Point)',
  motion: 'Sense HAT LSM9DS1 9-DOF (3-Axis Accel, 3-Axis Gyro, Magnetometer & Compass)',
  gpio: 'Raspberry Pi 4 40-Pin GPIO Header Twin with digital pin controls',
  pwm: 'Raspberry Pi Hardware PWM0 3.3V digital square wave oscilloscope',
  monitor: 'Real-time CPU core temp, PMIC throttling & I2C/SPI bus link health',
  camera: 'Live Pi Camera /dev/video0 stream (isolated to Pi Camera tab by default)',
};

// Preset color palette for 8x8 LED Matrix painting
const PALETTE_COLORS: { name: string; color: RgbColor; hex: string }[] = [
  { name: 'Red', color: [239, 68, 68], hex: '#ef4444' },
  { name: 'Orange', color: [249, 115, 22], hex: '#f97316' },
  { name: 'Yellow', color: [234, 179, 8], hex: '#eab308' },
  { name: 'Green', color: [16, 185, 129], hex: '#10b981' },
  { name: 'Cyan', color: [6, 182, 212], hex: '#06b6d4' },
  { name: 'Blue', color: [59, 130, 246], hex: '#3b82f6' },
  { name: 'Purple', color: [139, 92, 246], hex: '#8b5cf6' },
  { name: 'Pink', color: [236, 72, 153], hex: '#ec4899' },
  { name: 'White', color: [255, 255, 255], hex: '#ffffff' },
  { name: 'Off', color: [0, 0, 0], hex: '#000000' },
];

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

const INITIAL_FILES = [
  {
    name: '12_tictactoe.py',
    lang: 'python' as ProgramLanguage,
    code: `#!/usr/bin/env python3
"""
12. Sense HAT Tic-Tac-Toe Game with 5-Way Joystick
Navigate with Joystick UP/DOWN/LEFT/RIGHT, place X with MIDDLE press (or Enter/Space).
Plays against smart computer AI (O) on the Sense HAT 8x8 RGB LED Matrix!
"""
from sense_hat import SenseHat
import time
import random

sense = SenseHat()
sense.clear()

print("=" * 60)
print("  Sense HAT Tic-Tac-Toe Game (Interactive 5-Way Joystick)")
print("=" * 60)
print("Controls:")
print("  - Move Cursor   : Joystick UP / DOWN / LEFT / RIGHT")
print("  - Place Mark (X): Joystick MIDDLE press (or Enter / Space)")
print("  - AI Opponent   : Plays O automatically")
print("=" * 60)

# Colors
GRID_COLOR = [30, 45, 60]       # Divider grid
P1_COLOR   = [0, 220, 255]      # Player 1 (X) - Cyan
P2_COLOR   = [255, 140, 0]      # AI (O) - Amber Gold
CURSOR_ON  = [255, 255, 255]    # White blinking cursor
EMPTY      = [0, 0, 0]

CELL_COORDS = [
    [(0,0),(1,0),(0,1),(1,1)], [(3,0),(4,0),(3,1),(4,1)], [(6,0),(7,0),(6,1),(7,1)],
    [(0,3),(1,3),(0,4),(1,4)], [(3,3),(4,3),(3,4),(4,4)], [(6,3),(7,3),(6,4),(7,4)],
    [(0,6),(1,6),(0,7),(1,7)], [(3,6),(4,6),(3,7),(4,7)], [(6,6),(7,6),(6,7),(7,7)]
]

board = [0] * 9  # 0=empty, 1=Player (X), 2=AI (O)
cur_r, cur_c = 1, 1

def check_winner(b):
    lines = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
    for p in (1, 2):
        for line in lines:
            if b[line[0]] == p and b[line[1]] == p and b[line[2]] == p:
                return p, line
    if all(x != 0 for x in b): return 3, None
    return 0, None

def draw_board(cursor_blink=True):
    pixels = [EMPTY for _ in range(64)]
    # Draw dividers
    for i in range(8):
        pixels[i * 8 + 2] = GRID_COLOR
        pixels[i * 8 + 5] = GRID_COLOR
        pixels[2 * 8 + i] = GRID_COLOR
        pixels[5 * 8 + i] = GRID_COLOR
    # Draw cells
    for idx, val in enumerate(board):
        c = P1_COLOR if val == 1 else (P2_COLOR if val == 2 else None)
        if c:
            for (cx, cy) in CELL_COORDS[idx]: pixels[cy * 8 + cx] = c
    # Draw cursor
    cur_idx = cur_r * 3 + cur_c
    if cursor_blink and board[cur_idx] == 0:
        for (cx, cy) in CELL_COORDS[cur_idx]: pixels[cy * 8 + cx] = CURSOR_ON
    sense.set_pixels(pixels)

def ai_move():
    # 1. Win if possible
    for i in range(9):
        if board[i] == 0:
            board[i] = 2
            w, _ = check_winner(board)
            if w == 2: return i
            board[i] = 0
    # 2. Block player win
    for i in range(9):
        if board[i] == 0:
            board[i] = 1
            w, _ = check_winner(board)
            if w == 1:
                board[i] = 2
                return i
            board[i] = 0
    # 3. Take center or random
    if board[4] == 0:
        board[4] = 2
        return 4
    empty = [i for i in range(9) if board[i] == 0]
    if empty:
        chosen = random.choice(empty)
        board[chosen] = 2
        return chosen
    return None

draw_board(True)
last_blink = time.time()
blink_state = True
game_over = False

print("Game loop running! Use joystick to move and middle press to select.")

while not game_over:
    now = time.time()
    if now - last_blink > 0.25:
        blink_state = not blink_state
        last_blink = now
        draw_board(blink_state)

    for ev in sense.stick.get_events():
        act = str(ev.action).lower()
        if act in ('pressed', 'press'):
            d = str(ev.direction).lower()
            if d in ('up', 'u'):
                cur_r = max(0, cur_r - 1)
                print(f"Cursor -> Row {cur_r}, Col {cur_c}")
                draw_board(True)
            elif d in ('down', 'd'):
                cur_r = min(2, cur_r + 1)
                print(f"Cursor -> Row {cur_r}, Col {cur_c}")
                draw_board(True)
            elif d in ('left', 'l'):
                cur_c = max(0, cur_c - 1)
                print(f"Cursor -> Row {cur_r}, Col {cur_c}")
                draw_board(True)
            elif d in ('right', 'r'):
                cur_c = min(2, cur_c + 1)
                print(f"Cursor -> Row {cur_r}, Col {cur_c}")
                draw_board(True)
            elif d in ('middle', 'centre', 'center', 'enter', 'select', 'ok', 'space'):
                target_idx = cur_r * 3 + cur_c
                if board[target_idx] == 0:
                    board[target_idx] = 1
                    print(f"-> Player placed X at cell ({cur_r}, {cur_c})")
                    draw_board(False)
                    w, line = check_winner(board)
                    if w == 1:
                        print("*** YOU WIN! Congratulations! ***")
                        sense.show_message("WIN!", text_colour=[0, 255, 120])
                        game_over = True
                        break
                    elif w == 3:
                        print("*** GAME DRAW / TIE ***")
                        sense.show_message("TIE!")
                        game_over = True
                        break

                    time.sleep(0.3)
                    ai_c = ai_move()
                    if ai_c is not None:
                        print(f"-> Computer AI placed O at cell ({ai_c // 3}, {ai_c % 3})")
                        draw_board(True)
                    w, line = check_winner(board)
                    if w == 2:
                        print("*** AI WINS! Better luck next time! ***")
                        sense.show_message("AI!", text_colour=[255, 60, 60])
                        game_over = True
                        break
                    elif w == 3:
                        print("*** GAME DRAW / TIE ***")
                        sense.show_message("TIE!")
                        game_over = True
                        break

    time.sleep(0.04)

print("Game match ended.")
sense.clear()
`,
  },
  {
    name: 'sensor_logger.py',
    lang: 'python' as ProgramLanguage,
    code: `# Sense HAT Telemetry Collector & Calibration
from sense_hat import SenseHat
import time

sense = SenseHat()
print("=== Sense HAT Live Telemetry Polling ===")
for i in range(1, 10):
    t = sense.get_temperature()
    h = sense.get_humidity()
    p = sense.get_pressure()
    print(f"Sample #{i}: Temp={t:.1f}°C | Hum={h:.1f}% | Press={p:.1f}hPa")
    time.sleep(0.5)
print("Telemetry collection nominal.")
`,
  },
  {
    name: 'motion_imu.py',
    lang: 'python' as ProgramLanguage,
    code: `# Sense HAT 9-DOF Motion & IMU Telemetry (LSM9DS1)
from sense_hat import SenseHat
import time

sense = SenseHat()
print("=== Sense HAT LSM9DS1 9-DOF Motion & Orientation ===")
for i in range(1, 8):
    accel = sense.get_accelerometer_raw()
    gyro = sense.get_gyroscope_raw()
    orient = sense.get_orientation_degrees()
    print(f"Sample #{i}: Accel=({accel['x']:.2f}g, {accel['y']:.2f}g, {accel['z']:.2f}g) | Roll={orient['roll']:.1f}° Pitch={orient['pitch']:.1f}° Yaw={orient['yaw']:.1f}°")
    time.sleep(0.4)
print("Motion telemetry collection complete.")
`,
  },
  {
    name: 'pwm_signal.py',
    lang: 'python' as ProgramLanguage,
    code: `# Hardware PWM Signal Generator on GPIO 18 (BCM)
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(18, GPIO.OUT)

# 1000 Hz, 50% duty cycle
pwm = GPIO.PWM(18, 1000)
pwm.start(50)
print("[PWM] Generating 1000Hz 50% square wave on Pin 18...")
time.sleep(2)
pwm.stop()
GPIO.cleanup()
print("[PWM] Signal generator complete.")
`,
  },
];

// Simple, robust syntax highlighting tokenizer for code view
function highlightSyntax(code: string): React.ReactNode[] {
  return code.split('\n').map((line, lineIdx) => {
    // Comment
    if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
      return (
        <div key={lineIdx} className="leading-relaxed">
          <span className="text-emerald-500/80 italic">{line}</span>
        </div>
      );
    }

    // Token regex for strings, numbers, keywords, and symbols
    const tokens = line.split(/(".*?"|'.*?'|\b(?:import|from|def|class|return|if|else|elif|for|while|in|try|except|print|time|sleep|True|False|None)\b|\b\d+(?:\.\d+)?\b|\b(?:SenseHat|GPIO|BCM|OUT|IN|PWM)\b)/g);

    return (
      <div key={lineIdx} className="leading-relaxed whitespace-pre">
        {tokens.map((token, tIdx) => {
          if (!token) return null;
          if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
            return <span key={tIdx} className="text-amber-300">{token}</span>;
          }
          if (/^\d+(?:\.\d+)?$/.test(token)) {
            return <span key={tIdx} className="text-cyan-300 font-semibold">{token}</span>;
          }
          if (/^(?:import|from|def|class|return|if|else|elif|for|while|in|try|except|True|False|None)$/.test(token)) {
            return <span key={tIdx} className="text-purple-400 font-bold">{token}</span>;
          }
          if (/^(?:SenseHat|GPIO|BCM|OUT|IN|PWM)$/.test(token)) {
            return <span key={tIdx} className="text-cyan-400 font-bold">{token}</span>;
          }
          if (/^(?:print|time|sleep)$/.test(token)) {
            return <span key={tIdx} className="text-blue-300">{token}</span>;
          }
          return <span key={tIdx} className="text-slate-200">{token}</span>;
        })}
      </div>
    );
  });
}

// Applet Container with CAD Blueprint Selection Handles & Floating Window Capabilities
function AppletCard({
  id,
  title,
  icon: Icon,
  isSelected,
  isMinimized,
  isMaximized,
  showBlueprintHandles,
  onSelect,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  runStatus,
  onRunToggle,
  children,
  className = '',
  isFloating = false,
  floatingPos,
  onHeaderPointerDown,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isSelected: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  showBlueprintHandles: boolean;
  onSelect: () => void;
  onToggleMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  runStatus?: boolean;
  onRunToggle?: (running: boolean) => void;
  children: React.ReactNode;
  className?: string;
  isFloating?: boolean;
  floatingPos?: { x: number; y: number; zIndex: number; width?: number };
  onHeaderPointerDown?: (e: React.PointerEvent) => void;
}) {
  const floatingStyle: React.CSSProperties = isFloating
    ? isMaximized
      ? {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 999,
        }
      : {
          position: 'absolute',
          left: `${floatingPos?.x ?? 20}px`,
          top: `${floatingPos?.y ?? 20}px`,
          zIndex: floatingPos?.zIndex ?? 10,
          width: `${floatingPos?.width ?? 440}px`,
          maxWidth: '96vw',
        }
    : {};

  return (
    <div
      onClick={onSelect}
      style={floatingStyle}
      className={`relative rounded-xl bg-[var(--theme-bg-card)] border transition-all duration-150 flex flex-col shadow-md ${
        isSelected
          ? 'border-[var(--theme-accent)] shadow-lg ring-1 ring-[var(--theme-accent)]/20'
          : 'border-[var(--theme-border)] hover:border-[var(--theme-border-hover)]'
      } ${!isFloating && isMaximized ? 'col-span-full' : ''} ${className}`}
    >
      {/* CAD Blueprint Selection Handles */}
      {showBlueprintHandles && isSelected && !isMinimized && !isMaximized && (
        <>
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-[#860038] z-30 pointer-events-none rounded-2xs" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border border-[#860038] z-30 pointer-events-none rounded-2xs" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-[#860038] z-30 pointer-events-none rounded-2xs" />

          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-[#860038] z-30 pointer-events-none rounded-2xs" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-[#860038] z-30 pointer-events-none rounded-2xs" />

          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-[#860038] z-30 pointer-events-none rounded-2xs" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border border-[#860038] z-30 pointer-events-none rounded-2xs" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-[#860038] z-30 pointer-events-none rounded-2xs" />
        </>
      )}

      {/* Header Bar - Draggable in Floating Mode */}
      <div
        onPointerDown={(e) => {
          onSelect();
          onHeaderPointerDown?.(e);
        }}
        className={`h-11 rounded-t-xl bg-[var(--theme-bg-subtle)] border-b border-[var(--theme-border)] px-4 flex items-center justify-between gap-2 select-none shrink-0 ${
          isFloating ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-4 h-4 text-[var(--theme-text-muted)] shrink-0" />
          <Icon className="w-4 h-4 text-[#860038] dark:text-[#f39200] shrink-0" />
          <span className="font-bold text-sm text-[var(--theme-text-main)] truncate font-sans">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onRunToggle && (
            <div className="flex items-center gap-1 mr-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRunToggle(true);
                }}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider transition-colors cursor-pointer ${
                  runStatus ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                }`}
                title="Run Subsystem"
              >
                RUN
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRunToggle(false);
                }}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider transition-colors cursor-pointer ${
                  !runStatus ? 'bg-rose-600 text-white shadow-2xs' : 'bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                }`}
                title="Stop Subsystem"
              >
                STOP
              </button>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize();
            }}
            className="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] rounded hover:bg-[var(--theme-border)]/60 cursor-pointer transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
            className="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] rounded hover:bg-[var(--theme-border)]/60 cursor-pointer transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 text-[var(--theme-text-muted)] hover:text-rose-600 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
            title="Close Applet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className="relative rounded-b-xl p-4 flex-1 flex flex-col justify-between overflow-auto bg-[var(--theme-bg-card)] text-[var(--theme-text-main)]">
          {runStatus !== undefined && !runStatus && (
            <div className="absolute inset-0 bg-[#080d1a]/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center select-none">
              <div className="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center mb-2 shadow-inner">
                <PowerOff className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-0.5">
                Subsystem Powered Off
              </div>
              <div className="text-[11px] font-mono text-slate-400 mb-3 max-w-xs leading-tight">
                Hardware I/O & bus polling suspended. Press RUN to power on.
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRunToggle?.(true);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded cursor-pointer transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Subsystem</span>
              </button>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

export function UnifiedWorkspace({
  state,
  terminalOutputs,
  layoutMode: parentLayoutMode = 'grid',
  onSelectLayout,
  onSetPixel,
  onClearMatrix,
  onSetMatrixPattern,
  onTriggerJoystick,
  onRunProgram,
  onStopProgram,
  onClearTerminal,
  onExecBashCommand,
  onConnectHardware,
  onOpenDiagnostics,
  onOpenHelp,
  isProbingHardware = false,
  setIsWikiOpen,
}: UnifiedWorkspaceProps) {
  // Applet Configurations with LocalStorage Persistence
  const [applets, setApplets] = useState<AppletConfig[]>(() => {
    const saved = localStorage.getItem('iot-workspace-applets-v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return DEFAULT_APPLETS.map((def) => {
            const found = parsed.find((p: any) => p && p.id === def.id);
            return found
              ? {
                  ...def,
                  enabled: typeof found.enabled === 'boolean' ? found.enabled : true,
                  minimized: typeof found.minimized === 'boolean' ? found.minimized : false,
                  maximized: typeof found.maximized === 'boolean' ? found.maximized : false,
                }
              : def;
          });
        }
      } catch (e) {}
    }
    return DEFAULT_APPLETS;
  });

  useEffect(() => {
    localStorage.setItem('iot-workspace-applets-v4', JSON.stringify(applets));
  }, [applets]);

  // Applet Side Menu & Recently Closed Undo Toast State
  const [isAppletMenuOpen, setIsAppletMenuOpen] = useState(false);
  const [recentlyClosedApplet, setRecentlyClosedApplet] = useState<AppletConfig | null>(null);

  // Auto-dismiss undo notification toast after 6 seconds
  useEffect(() => {
    if (!recentlyClosedApplet) return;
    const timer = setTimeout(() => {
      setRecentlyClosedApplet(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [recentlyClosedApplet]);

  // Applet Action Handlers
  const closeApplet = (id: AppletId) => {
    const target = applets.find((a) => a.id === id);
    setApplets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: false } : a))
    );
    if (target) {
      setRecentlyClosedApplet(target);
    }
  };

  const openApplet = (id: AppletId) => {
    setApplets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: true, minimized: false } : a))
    );
    setSelectedAppletId(id);
    if (recentlyClosedApplet?.id === id) {
      setRecentlyClosedApplet(null);
    }
  };

  const toggleApplet = (id: AppletId) => {
    const target = applets.find((a) => a.id === id);
    if (target?.enabled) {
      closeApplet(id);
    } else {
      openApplet(id);
    }
  };

  const toggleAppletMinimize = (id: AppletId) => {
    setApplets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, minimized: !a.minimized } : a))
    );
  };

  const toggleAppletMaximize = (id: AppletId) => {
    setApplets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, maximized: !a.maximized } : a))
    );
  };

  const restoreDefaultLayout = () => {
    localStorage.removeItem('iot-workspace-applets-v4');
    setApplets(DEFAULT_APPLETS);
    setRecentlyClosedApplet(null);
  };

  const showAllApplets = () => {
    setApplets((prev) =>
      prev.map((a) => ({ ...a, enabled: true, minimized: false, maximized: false }))
    );
    setRecentlyClosedApplet(null);
  };

  // Drawer Refs & Outside Click Listener (User Requirement: Hide with a mouse click)
  const appletDrawerRef = useRef<HTMLDivElement>(null);
  const appletToggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isAppletMenuOpen &&
        appletDrawerRef.current &&
        !appletDrawerRef.current.contains(event.target as Node) &&
        appletToggleBtnRef.current &&
        !appletToggleBtnRef.current.contains(event.target as Node)
      ) {
        setIsAppletMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAppletMenuOpen]);

  // Press ESC to close Applet side menu
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isAppletMenuOpen) {
        setIsAppletMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAppletMenuOpen]);

  // Listen for top bar events (Restore Default View & Open Wiki)
  useEffect(() => {
    const handleRestore = () => {
      restoreDefaultLayout();
    };
    const handleWiki = () => {
      if (setIsWikiOpen) {
        setIsWikiOpen(true);
      } else {
        window.open('/wiki.html', '_blank');
      }
    };
    window.addEventListener('restore-default-applets', handleRestore);
    window.addEventListener('open-emulator-wiki', handleWiki);
    return () => {
      window.removeEventListener('restore-default-applets', handleRestore);
      window.removeEventListener('open-emulator-wiki', handleWiki);
    };
  }, []);

  // Derived Applet Collections
  const closedApplets = applets.filter((a) => !a.enabled);
  const enabledApplets = applets.filter((a) => a.enabled);

  // View Settings
  const [showBlueprintHandles, setShowBlueprintHandles] = useState(true);
  const [selectedAppletId, setSelectedAppletId] = useState<AppletId>('matrix');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save Code Action (Persists file in state & localStorage)
  const handleSaveCode = () => {
    setFiles((prev) =>
      prev.map((f, i) => (i === activeFileIndex ? { ...f, code: currentFile.code } : f))
    );
    try {
      localStorage.setItem(`pi_code_${currentFile.name}`, currentFile.code);
    } catch {}
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  // Download Code to local machine
  const handleDownloadCode = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  // Open file from local computer
  const handleOpenFileFromDisk = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === 'string') {
        const lang: ProgramLanguage = file.name.endsWith('.c') || file.name.endsWith('.h') ? 'c' : 'python';
        const existingIdx = files.findIndex((f) => f.name === file.name);
        if (existingIdx >= 0) {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === existingIdx ? { ...f, code: content } : f))
          );
          setActiveFileIndex(existingIdx);
        } else {
          setFiles((prev) => [...prev, { name: file.name, lang, code: content }]);
          setActiveFileIndex(files.length);
        }
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // VS Code Tabs & Files
  const [files, setFiles] = useState(INITIAL_FILES);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const currentFile = files[activeFileIndex] || files[0];
  const [savedToast, setSavedToast] = useState(false);
  const [examplesMenuOpen, setExamplesMenuOpen] = useState(false);
  const [exampleSearch, setExampleSearch] = useState('');
  const [exampleFilter, setExampleFilter] = useState<'all' | 'python' | 'c'>('all');
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'output' | 'telemetry'>('terminal');

  // Hardware Subsystem Run/Standby States (All OFF by default per user requirement)
  const [subsystemStatus, setSubsystemStatus] = useState<Record<string, boolean>>({
    matrix: false,
    joystick: false,
    environment: false,
    motion: false,
    gpio: false,
    pwm: false,
    monitor: false,
    camera: false,
  });

  // Matrix Interactive Controls & Sizing (User Requirement: 72px ultra large scale)
  const [matrixScale, setMatrixScale] = useState<'compact' | 'large' | 'ultra'>('large');
  const [selectedPaintColor, setSelectedPaintColor] = useState<RgbColor>([239, 68, 68]);
  const [customHex, setCustomHex] = useState('#ef4444');
  const [matrixBrightness, setMatrixBrightness] = useState<number>(100);
  const [envTempUnit, setEnvTempUnit] = useState<'C' | 'F'>('C');

  // Tic-Tac-Toe Interactive Game Mode on 8x8 Matrix
  const [isTttMode, setIsTttMode] = useState<boolean>(false);
  const [tttBoard, setTttBoard] = useState<number[]>(Array(9).fill(0));
  const [tttCursor, setTttCursor] = useState<{ r: number; c: number }>({ r: 1, c: 1 });
  const [tttGameOver, setTttGameOver] = useState<boolean>(false);
  const [tttStatus, setTttStatus] = useState<string>('Your Turn (X) — Use Joystick to move, OK to place');
  const [tttScores, setTttScores] = useState({ player: 0, ai: 0, ties: 0 });

  const TTT_CELLS = [
    [[0,0],[1,0],[0,1],[1,1]], [[3,0],[4,0],[3,1],[4,1]], [[6,0],[7,0],[6,1],[7,1]],
    [[0,3],[1,3],[0,4],[1,4]], [[3,3],[4,3],[3,4],[4,4]], [[6,3],[7,3],[6,4],[7,4]],
    [[0,6],[1,6],[0,7],[1,7]], [[3,6],[4,6],[3,7],[4,7]], [[6,6],[7,6],[6,7],[7,7]]
  ];

  const checkTttWinner = (b: number[]): { winner: number; line: number[] | null } => {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
    ];
    for (const p of [1, 2]) {
      for (const line of lines) {
        if (b[line[0]] === p && b[line[1]] === p && b[line[2]] === p) {
          return { winner: p, line };
        }
      }
    }
    if (b.every((x) => x !== 0)) return { winner: 3, line: null };
    return { winner: 0, line: null };
  };

  const renderTttMatrix = (boardState: number[], cursor: { r: number; c: number }) => {
    const gridColor: RgbColor = [30, 45, 60];
    const p1Color: RgbColor = [0, 220, 255]; // Cyan X
    const p2Color: RgbColor = [255, 140, 0]; // Amber O
    const cursorColor: RgbColor = [255, 255, 255];

    const p: RgbColor[] = Array(64).fill([0, 0, 0]);

    for (let i = 0; i < 8; i++) {
      p[i * 8 + 2] = gridColor;
      p[i * 8 + 5] = gridColor;
      p[2 * 8 + i] = gridColor;
      p[5 * 8 + i] = gridColor;
    }

    boardState.forEach((val, idx) => {
      const c = val === 1 ? p1Color : (val === 2 ? p2Color : null);
      if (c) {
        for (const [cx, cy] of TTT_CELLS[idx]) {
          p[cy * 8 + cx] = c;
        }
      }
    });

    const cIdx = cursor.r * 3 + cursor.c;
    for (const [cx, cy] of TTT_CELLS[cIdx]) {
      if (boardState[cIdx] === 0) {
        p[cy * 8 + cx] = cursorColor;
      }
    }
    if (onSetMatrixPattern) onSetMatrixPattern(p);
  };

  const handleTttJoystickInput = (dir: JoystickDirection) => {
    if (tttGameOver) return;
    if (dir === 'up') {
      const nextR = Math.max(0, tttCursor.r - 1);
      setTttCursor((prev) => ({ ...prev, r: nextR }));
      renderTttMatrix(tttBoard, { r: nextR, c: tttCursor.c });
    } else if (dir === 'down') {
      const nextR = Math.min(2, tttCursor.r + 1);
      setTttCursor((prev) => ({ ...prev, r: nextR }));
      renderTttMatrix(tttBoard, { r: nextR, c: tttCursor.c });
    } else if (dir === 'left') {
      const nextC = Math.max(0, tttCursor.c - 1);
      setTttCursor((prev) => ({ ...prev, c: nextC }));
      renderTttMatrix(tttBoard, { r: tttCursor.r, c: nextC });
    } else if (dir === 'right') {
      const nextC = Math.min(2, tttCursor.c + 1);
      setTttCursor((prev) => ({ ...prev, c: nextC }));
      renderTttMatrix(tttBoard, { r: tttCursor.r, c: nextC });
    } else if (dir === 'middle' || dir === 'centre') {
      const targetIdx = tttCursor.r * 3 + tttCursor.c;
      if (tttBoard[targetIdx] === 0) {
        const nextBoard = [...tttBoard];
        nextBoard[targetIdx] = 1; // Player mark X
        setTttBoard(nextBoard);
        renderTttMatrix(nextBoard, tttCursor);

        const res = checkTttWinner(nextBoard);
        if (res.winner === 1) {
          setTttScores((prev) => ({ ...prev, player: prev.player + 1 }));
          setTttStatus('🎉 YOU WIN! Awesome match!');
          setTttGameOver(true);
          return;
        } else if (res.winner === 3) {
          setTttScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
          setTttStatus('🤝 Game Over: It is a Tie!');
          setTttGameOver(true);
          return;
        }

        setTttStatus('AI Thinking (O)...');
        setTimeout(() => {
          const empty = nextBoard.map((v, i) => (v === 0 ? i : -1)).filter((i) => i !== -1);
          if (empty.length > 0) {
            let aiPick = -1;
            for (const cell of empty) {
              const testB = [...nextBoard];
              testB[cell] = 2;
              if (checkTttWinner(testB).winner === 2) {
                aiPick = cell;
                break;
              }
            }
            if (aiPick === -1) {
              for (const cell of empty) {
                const testB = [...nextBoard];
                testB[cell] = 1;
                if (checkTttWinner(testB).winner === 1) {
                  aiPick = cell;
                  break;
                }
              }
            }
            if (aiPick === -1 && nextBoard[4] === 0) aiPick = 4;
            if (aiPick === -1) aiPick = empty[Math.floor(Math.random() * empty.length)];

            nextBoard[aiPick] = 2;
            setTttBoard(nextBoard);
            renderTttMatrix(nextBoard, tttCursor);

            const aiRes = checkTttWinner(nextBoard);
            if (aiRes.winner === 2) {
              setTttScores((prev) => ({ ...prev, ai: prev.ai + 1 }));
              setTttStatus('🤖 AI Wins! Play again to beat the machine!');
              setTttGameOver(true);
            } else if (aiRes.winner === 3) {
              setTttScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
              setTttStatus('🤝 Game Over: It is a Tie!');
              setTttGameOver(true);
            } else {
              setTttStatus('Your Turn (X) — Move cursor & press OK');
            }
          }
        }, 300);
      }
    }
  };

  const handleStartTtt = () => {
    setIsTttMode(true);
    const clean = Array(9).fill(0);
    setTttBoard(clean);
    setTttCursor({ r: 1, c: 1 });
    setTttGameOver(false);
    setTttStatus('Your Turn (X) — Use Joystick, Press OK to Place');
    renderTttMatrix(clean, { r: 1, c: 1 });
  };

  const handleResetTtt = () => {
    const clean = Array(9).fill(0);
    setTttBoard(clean);
    setTttCursor({ r: 1, c: 1 });
    setTttGameOver(false);
    setTttStatus('Your Turn (X) — Use Joystick, Press OK to Place');
    renderTttMatrix(clean, { r: 1, c: 1 });
  };

  const handleExitTtt = () => {
    setIsTttMode(false);
    onClearMatrix([0, 0, 0]);
  };

  const hslToRgb = (h: number, s: number, l: number): RgbColor => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  };

  const loadPresetPattern = (type: 'raspberry' | 'smiley' | 'rainbow') => {
    if (isTttMode) setIsTttMode(false);
    if (type === 'raspberry') {
      const p: RgbColor[] = Array(64).fill([0, 0, 0]);
      const r: RgbColor = [200, 20, 60];
      const g: RgbColor = [40, 160, 40];
      [2, 5, 10, 13].forEach((i) => (p[i] = g));
      [18, 19, 20, 21, 26, 27, 28, 29, 34, 35, 36, 37, 43, 44, 51, 52].forEach((i) => (p[i] = r));
      if (onSetMatrixPattern) onSetMatrixPattern(p);
    } else if (type === 'smiley') {
      const p: RgbColor[] = Array(64).fill([0, 0, 0]);
      const y: RgbColor = [255, 200, 0];
      const b: RgbColor = [0, 0, 0];
      for (let i = 0; i < 64; i++) p[i] = y;
      p[18] = b;
      p[21] = b;
      [41, 46, 50, 51, 52, 53].forEach((i) => (p[i] = b));
      if (onSetMatrixPattern) onSetMatrixPattern(p);
    } else if (type === 'rainbow') {
      const p: RgbColor[] = [];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const hue = ((x + y) / 14) * 360;
          p.push(hslToRgb(hue, 100, 50));
        }
      }
      if (onSetMatrixPattern) onSetMatrixPattern(p);
    }
  };


  // Joystick Coords, Full Press/Release Action State Machine & evdev Diagnostics
  const [joystickCoords, setJoystickCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickHistory, setJoystickHistory] = useState<Array<{
    timestamp: number;
    dir: JoystickDirection;
    action: JoystickAction;
    keycode: number;
  }>>([
    { timestamp: Date.now() - 4000, dir: 'middle', action: 'release', keycode: 28 },
    { timestamp: Date.now() - 3900, dir: 'middle', action: 'press', keycode: 28 },
  ]);
  const [pulseTestResult, setPulseTestResult] = useState<string | null>(null);
  const activeJoyDirRef = useRef<JoystickDirection | null>(null);
  const joyHoldTimerRef = useRef<NodeJS.Timeout | null>(null);

  const DIR_TO_KEYCODE: Record<JoystickDirection, number> = {
    up: 103,
    down: 108,
    left: 105,
    right: 106,
    middle: 28,
    centre: 28,
  };

  const handleJoystickDown = (dir: JoystickDirection, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    activeJoyDirRef.current = dir;
    const deltas: Record<JoystickDirection, { x: number; y: number }> = {
      up: { x: 0, y: -20 },
      down: { x: 0, y: 20 },
      left: { x: -20, y: 0 },
      right: { x: 20, y: 0 },
      middle: { x: 0, y: 0 },
      centre: { x: 0, y: 0 },
    };
    setJoystickCoords(deltas[dir] || { x: 0, y: 0 });

    // 1. Emit press action to physical Pi & digital twin
    onTriggerJoystick(dir, 'press');

    // 2. Add to live evdev monitor
    setJoystickHistory((prev) => [
      { timestamp: Date.now(), dir, action: 'press', keycode: DIR_TO_KEYCODE[dir] || 28 },
      ...prev.slice(0, 5),
    ]);

    // 3. Forward to Tic-Tac-Toe if active!
    if (isTttMode && !tttGameOver) {
      handleTttJoystickInput(dir);
    }

    // 4. Hold state timer
    if (joyHoldTimerRef.current) clearTimeout(joyHoldTimerRef.current);
    joyHoldTimerRef.current = setTimeout(() => {
      if (activeJoyDirRef.current === dir) {
        onTriggerJoystick(dir, 'hold');
        setJoystickHistory((prev) => [
          { timestamp: Date.now(), dir, action: 'hold', keycode: DIR_TO_KEYCODE[dir] || 28 },
          ...prev.slice(0, 5),
        ]);
      }
    }, 350);
  };

  const handleJoystickUp = (dir: JoystickDirection, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (joyHoldTimerRef.current) {
      clearTimeout(joyHoldTimerRef.current);
      joyHoldTimerRef.current = null;
    }
    activeJoyDirRef.current = null;
    setJoystickCoords({ x: 0, y: 0 });

    // Emit release action to physical Pi & digital twin
    onTriggerJoystick(dir, 'release');

    setJoystickHistory((prev) => [
      { timestamp: Date.now(), dir, action: 'release', keycode: DIR_TO_KEYCODE[dir] || 28 },
      ...prev.slice(0, 5),
    ]);
  };

  // Backward compatibility alias for single click
  const handleMoveJoystick = (dir: JoystickDirection) => {
    handleJoystickDown(dir);
    setTimeout(() => handleJoystickUp(dir), 120);
  };

  // Keyboard navigation support for Sense HAT joystick
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.repeat) return;
      if (e.key === 'ArrowUp') handleJoystickDown('up');
      else if (e.key === 'ArrowDown') handleJoystickDown('down');
      else if (e.key === 'ArrowLeft') handleJoystickDown('left');
      else if (e.key === 'ArrowRight') handleJoystickDown('right');
      else if (e.key === 'Enter' || e.key === ' ') handleJoystickDown('middle');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowUp') handleJoystickUp('up');
      else if (e.key === 'ArrowDown') handleJoystickUp('down');
      else if (e.key === 'ArrowLeft') handleJoystickUp('left');
      else if (e.key === 'ArrowRight') handleJoystickUp('right');
      else if (e.key === 'Enter' || e.key === ' ') handleJoystickUp('middle');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTttMode, tttGameOver, tttCursor, tttBoard]);

  // Synchronize incoming hardware joystick events (evdev / physical Sense HAT or Python)
  const lastProcessedJoyTsRef = useRef<number>(0);
  useEffect(() => {
    if (!state.lastJoystickEvent) return;
    const { direction, action, timestamp, source } = state.lastJoystickEvent;
    if (timestamp && timestamp <= lastProcessedJoyTsRef.current) return;
    lastProcessedJoyTsRef.current = timestamp || Date.now();

    const deltas: Record<JoystickDirection, { x: number; y: number }> = {
      up: { x: 0, y: -20 },
      down: { x: 0, y: 20 },
      left: { x: -20, y: 0 },
      right: { x: 20, y: 0 },
      middle: { x: 0, y: 0 },
      centre: { x: 0, y: 0 },
    };

    if (action === 'press') {
      setJoystickCoords(deltas[direction] || { x: 0, y: 0 });
      setJoystickHistory((prev) => [
        { timestamp: timestamp || Date.now(), dir: direction, action: 'press', keycode: DIR_TO_KEYCODE[direction] || 28 },
        ...prev.slice(0, 5),
      ]);
      // If event came from physical hardware, also advance interactive Tic-Tac-Toe
      if (source === 'hardware' && isTttMode && !tttGameOver) {
        handleTttJoystickInput(direction);
      }
    } else if (action === 'release') {
      setJoystickCoords({ x: 0, y: 0 });
      setJoystickHistory((prev) => [
        { timestamp: timestamp || Date.now(), dir: direction, action: 'release', keycode: DIR_TO_KEYCODE[direction] || 28 },
        ...prev.slice(0, 5),
      ]);
    } else if (action === 'hold') {
      setJoystickHistory((prev) => [
        { timestamp: timestamp || Date.now(), dir: direction, action: 'hold', keycode: DIR_TO_KEYCODE[direction] || 28 },
        ...prev.slice(0, 5),
      ]);
    }
  }, [state.lastJoystickEvent, isTttMode, tttGameOver]);

  // Interactive Test Pulse / Loopback Test
  const handleJoystickTestPulse = async () => {
    setPulseTestResult('Testing...');
    const tStart = performance.now();
    handleJoystickDown('middle');
    await new Promise((r) => setTimeout(r, 90));
    handleJoystickUp('middle');
    const elapsed = Math.round(performance.now() - tStart);
    setPulseTestResult(`✓ Loopback OK (${elapsed}ms)`);
    setTimeout(() => setPulseTestResult(null), 3000);
  };

  // Camera Capture State
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCaptureToMatrix = async () => {
    setIsCapturing(true);
    try {
      const res = await fetch('/api/camera/capture-to-matrix', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.pixels && onSetMatrixPattern) {
          onSetMatrixPattern(data.pixels);
        }
      }
    } catch {}
    setTimeout(() => setIsCapturing(false), 600);
  };

  // PWM Controller Waveform State (Synchronized from Code and Oscilloscope Visualizer)
  const [pwmDuty, setPwmDuty] = useState<number>(50);
  const [pwmFreq, setPwmFreq] = useState<number>(1000);
  const [pwmPhase, setPwmPhase] = useState<number>(0);
  const [pwmActive, setPwmActive] = useState<boolean>(true);
  const [isPwmCodeDriven, setIsPwmCodeDriven] = useState<boolean>(false);
  const [isSweepingPwm, setIsSweepingPwm] = useState<boolean>(false);

  // Synchronize with state.pwm when student code runs
  useEffect(() => {
    if (state.pwm) {
      if (typeof state.pwm.duty === 'number') {
        setPwmDuty(Math.round(state.pwm.duty));
      }
      if (typeof state.pwm.freq === 'number') {
        setPwmFreq(Math.round(state.pwm.freq));
      }
      if (typeof state.pwm.active === 'boolean') {
        // Keep active if duty > 0 or if explicitly flagged
        setPwmActive(state.pwm.active || (state.pwm.duty > 0));
      }
      if (state.program?.status === 'running' || state.pwm.active) {
        setIsPwmCodeDriven(true);
      }
    }
  }, [state.pwm, state.program?.status]);

  useEffect(() => {
    if (!pwmActive) return;
    const intervalMs = Math.max(20, Math.min(80, Math.round(20000 / (pwmFreq || 1000))));
    const pwmInterval = setInterval(() => {
      setPwmPhase((prev) => (prev + 0.08) % 1);
    }, intervalMs);
    return () => clearInterval(pwmInterval);
  }, [pwmActive, pwmFreq]);

  // Demo sweep generator for oscilloscope verification
  const handlePwmSweep = async () => {
    setIsSweepingPwm(true);
    setIsPwmCodeDriven(false);
    setPwmActive(true);
    const testSteps = [
      { d: 15, f: 500 },
      { d: 35, f: 1000 },
      { d: 50, f: 1500 },
      { d: 75, f: 2000 },
      { d: 90, f: 3000 },
      { d: 50, f: 1000 },
    ];
    for (const step of testSteps) {
      setPwmDuty(step.d);
      setPwmFreq(step.f);
      await new Promise((r) => setTimeout(r, 450));
    }
    setIsSweepingPwm(false);
  };

  // Program Execution & Termination
  const handleRunCurrentCode = () => {
    if (!currentFile) return;
    onRunProgram(currentFile.code, currentFile.lang, currentFile.name, 30000);
    setTerminalLogs((prev) => [
      ...prev,
      `pi@raspberrypi:~$ python3 ${currentFile.name}`,
      `[Execution Engine: Started ${currentFile.name} on Raspberry Pi]`,
    ]);
  };

  const handleTerminateProgram = () => {
    onStopProgram();
    setTerminalLogs((prev) => [
      ...prev,
      `^C`,
      `[Execution Terminated: Program execution aborted by user]`,
      `pi@raspberrypi:~$ `,
    ]);
  };

  // Code Studio Panel Resizing & Layout (User Requirement: Wider Code Studio)
  const [studioWidth, setStudioWidth] = useState<number>(52); // default 52% wide
  const [isStudioExpanded, setIsStudioExpanded] = useState<boolean>(false);
  const isResizingSplitterRef = useRef<boolean>(false);

  const handleSplitterPointerDown = (e: React.PointerEvent) => {
    isResizingSplitterRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSplitterPointerMove = (e: React.PointerEvent) => {
    if (!isResizingSplitterRef.current) return;
    const pct = Math.min(80, Math.max(30, (e.clientX / window.innerWidth) * 100));
    setStudioWidth(Math.round(pct));
  };

  const handleSplitterPointerUp = (e: React.PointerEvent) => {
    if (isResizingSplitterRef.current) {
      isResizingSplitterRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Code Editor Syntax Highlighting & Synchronized Scrolling (User Requirement: Python & C Syntax)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleEditorScroll = () => {
    if (textareaRef.current) {
      const top = textareaRef.current.scrollTop;
      const left = textareaRef.current.scrollLeft;
      if (preRef.current) {
        preRef.current.scrollTop = top;
        preRef.current.scrollLeft = left;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = top;
      }
    }
  };

  const highlightedCode = useMemo(() => {
    const lang = currentFile.lang === 'c' ? 'c' : 'python';
    const grammar = Prism.languages[lang] || Prism.languages.python;
    return Prism.highlight(currentFile.code, grammar, lang);
  }, [currentFile.code, currentFile.lang]);

  // Curriculum Examples Filter (User Requirement: Show all examples from src in dropdown)
  const filteredCurriculumExamples = useMemo(() => {
    return CURRICULUM_EXAMPLES.filter((ex) => {
      if (exampleFilter !== 'all' && ex.language !== exampleFilter) return false;
      if (exampleSearch.trim()) {
        const q = exampleSearch.toLowerCase();
        return (
          ex.title.toLowerCase().includes(q) ||
          ex.filename.toLowerCase().includes(q) ||
          ex.category.toLowerCase().includes(q) ||
          ex.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [exampleFilter, exampleSearch]);

  const handleLoadCurriculumExample = (ex: typeof CURRICULUM_EXAMPLES[0]) => {
    setExamplesMenuOpen(false);
    const existingIdx = files.findIndex((f) => f.name === ex.filename);
    if (existingIdx !== -1) {
      setActiveFileIndex(existingIdx);
    } else {
      const newFile = {
        name: ex.filename,
        lang: ex.language as ProgramLanguage,
        code: ex.code,
      };
      setFiles((prev) => [...prev, newFile]);
      setActiveFileIndex(files.length);
    }
    setTerminalLogs((prev) => [
      ...prev,
      `pi@raspberrypi:~$ # Loaded example: ${ex.filename} [${ex.language.toUpperCase()}] into Code Studio`,
      'pi@raspberrypi:~$ ',
    ]);
  };

  // Floating Applets Manager State (User Requirement: Applets should be floating not fixed)
  const [layoutMode, setLayoutMode] = useState<'floating' | 'grid'>(
    parentLayoutMode === 'floating' ? 'floating' : 'grid'
  );

  useEffect(() => {
    if (parentLayoutMode) {
      setLayoutMode(parentLayoutMode === 'floating' ? 'floating' : 'grid');
      if (parentLayoutMode === 'studio-focus') {
        setIsStudioExpanded(true);
      } else if (parentLayoutMode === 'bench') {
        setIsStudioExpanded(false);
      }
    }
  }, [parentLayoutMode]);

  const DEFAULT_FLOATING_POSITIONS: Record<AppletId, { x: number; y: number; zIndex: number; width?: number }> = {
    matrix: { x: 20, y: 20, zIndex: 10, width: 480 },
    joystick: { x: 20, y: 520, zIndex: 11, width: 480 },
    environment: { x: 520, y: 20, zIndex: 12, width: 480 },
    motion: { x: 520, y: 380, zIndex: 13, width: 480 },
    gpio: { x: 20, y: 920, zIndex: 14, width: 580 },
    pwm: { x: 620, y: 920, zIndex: 15, width: 500 },
    monitor: { x: 20, y: 1340, zIndex: 16, width: 580 },
    camera: { x: 620, y: 1340, zIndex: 17, width: 500 },
  };

  const [floatingPositions, setFloatingPositions] = useState(DEFAULT_FLOATING_POSITIONS);
  const [highestZIndex, setHighestZIndex] = useState<number>(20);

  const activeDragRef = useRef<{
    appletId: AppletId;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const handleHeaderPointerDown = (id: AppletId, e: React.PointerEvent) => {
    if (layoutMode !== 'floating') return;
    const nextZ = highestZIndex + 1;
    setHighestZIndex(nextZ);
    setFloatingPositions((prev) => ({
      ...prev,
      [id]: { ...prev[id], zIndex: nextZ },
    }));

    const curPos = floatingPositions[id] || { x: 20, y: 20 };
    activeDragRef.current = {
      appletId: id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: curPos.x,
      initialY: curPos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!activeDragRef.current) return;
    const { appletId, startX, startY, initialX, initialY } = activeDragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const nx = Math.max(0, initialX + dx);
    const ny = Math.max(0, initialY + dy);
    setFloatingPositions((prev) => ({
      ...prev,
      [appletId]: { ...prev[appletId], x: nx, y: ny },
    }));
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (activeDragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      activeDragRef.current = null;
    }
  };

  const cascadeApplets = () => {
    const nextZ = highestZIndex + 1;
    setFloatingPositions((prev) => {
      const updated = { ...prev };
      enabledApplets.forEach((app, idx) => {
        updated[app.id] = {
          ...updated[app.id],
          x: 20 + idx * 35,
          y: 20 + idx * 35,
          zIndex: nextZ + idx,
        };
      });
      return updated;
    });
    setHighestZIndex(nextZ + enabledApplets.length);
  };

  const tileApplets = () => {
    const colWidth = 470;
    const gap = 20;
    setFloatingPositions((prev) => {
      const updated = { ...prev };
      enabledApplets.forEach((app, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        updated[app.id] = {
          ...updated[app.id],
          x: 20 + col * (colWidth + gap),
          y: 20 + row * 430,
        };
      });
      return updated;
    });
  };

  const resetFloatingPositions = () => {
    setFloatingPositions(DEFAULT_FLOATING_POSITIONS);
  };

  // Connected Raspberry Pi Bash Terminal State (User Requirement: Connected to bash terminal of Pi)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Linux raspberrypi 6.6.20+rpt-rpi-v8 #1 SMP PREEMPT Debian 12 (bookworm) aarch64',
    'Raspberry Pi 4 Model B Rev 1.4 · 4GB RAM · BCM2711 Quad-Core',
    'Raspberry Pi 4 Physical Computing & Digital Twin Lab',
    'Interactive Bash Terminal: ACTIVE · Host: 127.0.0.1:3000',
    "Type 'help' for lab commands or run any bash command (ls, cat, python3, gcc).",
    'pi@raspberrypi:~$ ',
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  // Sync terminal with live terminalOutputs from digital twin / program execution
  useEffect(() => {
    if (terminalOutputs && terminalOutputs.length > 0) {
      const lastOutput = terminalOutputs[terminalOutputs.length - 1];
      if (lastOutput?.text) {
        const lines = lastOutput.text.split('\n').filter((l) => l.trim().length > 0);
        setTerminalLogs((prev) => [...prev, ...lines]);
      }
    }
  }, [terminalOutputs]);

  // Auto-scroll terminal smoothly on new output
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Terminal ArrowUp / ArrowDown History Navigation
  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setTerminalInput(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setTerminalInput('');
      } else {
        setHistoryIndex(nextIdx);
        setTerminalInput(commandHistory[nextIdx]);
      }
    }
  };

  // Terminal Command Submit - Sends directly to Raspberry Pi bash execution engine
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalInput('');
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    if (cmd === 'clear') {
      setTerminalLogs([]);
      return;
    }

    if (cmd === 'help') {
      setTerminalLogs((prev) => [
        ...prev,
        `pi@raspberrypi:~$ ${cmd}`,
        'Raspberry Pi 4 Bash Terminal Commands:',
        '  • python3 <script.py>     - Execute Python script (e.g. python3 01_hello.py)',
        '  • gcc <script.c> -o out   - Compile C source file',
        '  • ls -la                  - List directory files & examples',
        '  • cat <filename>          - Display file contents',
        '  • pinout                  - Display Raspberry Pi 40-pin GPIO pinout layout',
        '  • diagnose                - Run full hardware diagnostics',
        '  • blink-test              - Flash 8x8 LED matrix test pattern',
        '  • status                  - Display subsystem health report',
        '  • whoami                  - Display current logged in user (pi)',
        '  • clear                   - Clear terminal display buffer',
        'pi@raspberrypi:~$ ',
      ]);
      return;
    }

    setTerminalLogs((prev) => [...prev, `pi@raspberrypi:~$ ${cmd}`]);

    if (onExecBashCommand) {
      try {
        const res = await onExecBashCommand(cmd);
        setTerminalLogs((prev) => [...prev, res || '(command completed with no output)', 'pi@raspberrypi:~$ ']);
      } catch {
        setTerminalLogs((prev) => [...prev, `bash: ${cmd}: command execution failed`, 'pi@raspberrypi:~$ ']);
      }
    } else {
      setTerminalLogs((prev) => [...prev, `[Executed ${cmd} on Raspberry Pi]`, 'pi@raspberrypi:~$ ']);
    }
  };


  // Generate Digital Square Wave Path for PWM
  const generatePwmSquareWavePath = () => {
    if (!pwmActive || pwmDuty <= 0) return 'M 0 62 L 300 62';
    if (pwmDuty >= 100) return 'M 0 16 L 300 16';
    const width = 300;
    const highY = 16;  // 3.3V HIGH
    const lowY = 62;   // 0.0V LOW
    const period = Math.max(20, Math.min(80, Math.round(5000 / (pwmFreq || 1000) * 8)));
    const dutyFrac = Math.max(0.05, Math.min(0.95, pwmDuty / 100));
    const points: string[] = [];

    let currentX = 0;
    const startOffset = Math.round(pwmPhase * period);

    while (currentX < width) {
      const highWidth = Math.round(period * dutyFrac);
      const lowWidth = period - highWidth;

      // Start of HIGH pulse
      const x1 = Math.max(0, currentX - startOffset);
      const x2 = Math.min(width, x1 + highWidth);
      const x3 = Math.min(width, x2 + lowWidth);

      if (points.length === 0) {
        points.push(`M ${x1} ${highY}`);
      } else {
        points.push(`L ${x1} ${highY}`);
      }

      points.push(`L ${x2} ${highY}`);
      points.push(`L ${x2} ${lowY}`);
      points.push(`L ${x3} ${lowY}`);
      points.push(`L ${x3} ${highY}`);

      currentX += period;
    }
    return points.join(' ');
  };

  const activeMatrix = state.matrix?.length === 64 ? state.matrix : DEFAULT_RGB_MATRIX;

  return (
    <div className="relative flex h-[calc(100vh-3.75rem)] w-full flex-col overflow-hidden bg-[var(--theme-bg-app)] font-sans text-[var(--theme-text-main)] transition-colors duration-150 select-none max-md:h-auto max-md:min-h-[calc(100vh-4rem)] max-md:overflow-visible">
      {/* =========================================================================
          MAIN LAYOUT: CODE STUDIO (LEFT) + APPLETS (RIGHT)
         ========================================================================= */}
      <div className="flex flex-1 overflow-hidden max-md:flex-col max-md:overflow-visible">
        {/* =====================================================================
            LEFT COLUMN: VS CODE PROGRAMMING ENVIRONMENT
           ===================================================================== */}
        <div
          style={{ width: isStudioExpanded ? '74%' : `${studioWidth}%` }}
          className="relative flex shrink-0 flex-col border-r border-[var(--theme-border)] bg-[var(--theme-bg-card)] transition-all duration-150 max-md:!w-full max-md:min-w-0 max-md:max-w-full max-md:min-h-[70vh] max-md:border-r-0 max-md:border-b"
        >
          {/* Top Bar with Examples Dropdown, Open, Save, Run, Abort, and Expand */}
          <div className="h-10 border-b border-[var(--theme-border)] px-3 flex items-center justify-between bg-[var(--theme-bg-subtle)] gap-2 shrink-0">
            {/* Hidden local file input for opening custom files */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleOpenFileFromDisk}
              accept=".py,.c,.h,.sh,.txt,.json"
              className="hidden"
            />

            <div className="flex items-center gap-2">
              {/* Examples from Pi / Folder Example Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExamplesMenuOpen((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded text-xs font-mono font-bold border border-[#860038]/40 bg-[#860038]/10 text-[#860038] dark:text-[#f39200] hover:bg-[#860038]/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Open code examples from the examples/ folder"
                >
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span>Open Example ({CURRICULUM_EXAMPLES.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${examplesMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Backdrop to close Examples dropdown on outside click */}
                {examplesMenuOpen && (
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setExamplesMenuOpen(false)}
                  />
                )}

                {examplesMenuOpen && (
                  <div
                    className="absolute top-10 left-0 w-84 sm:w-96 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] shadow-2xl rounded p-2 z-50 text-xs font-mono max-h-[520px] flex flex-col animate-in fade-in-50 zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header & Search */}
                    <div className="pb-2 border-b border-[var(--theme-border)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[var(--theme-text-main)] font-sans">
                          Curriculum Library ({CURRICULUM_EXAMPLES.length})
                        </span>
                        <span className="text-[11px] text-[var(--theme-text-muted)]">
                          Python & C Examples
                        </span>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[var(--theme-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={exampleSearch}
                          onChange={(e) => setExampleSearch(e.target.value)}
                          placeholder="Search examples by name, category, or code..."
                          className="w-full bg-[var(--theme-bg-subtle)] border border-[var(--theme-border)] rounded py-1 pl-8 pr-2.5 text-xs text-[var(--theme-text-main)] outline-none focus:border-[#860038]"
                        />
                      </div>

                      {/* Language Filter Pills */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          onClick={() => setExampleFilter('all')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                            exampleFilter === 'all'
                              ? 'bg-[#860038] text-white'
                              : 'bg-[var(--theme-bg-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                          }`}
                        >
                          All ({CURRICULUM_EXAMPLES.length})
                        </button>
                        <button
                          onClick={() => setExampleFilter('python')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                            exampleFilter === 'python'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[var(--theme-bg-subtle)] text-emerald-600 dark:text-emerald-400 hover:opacity-80'
                          }`}
                        >
                          Python (17)
                        </button>
                        <button
                          onClick={() => setExampleFilter('c')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                            exampleFilter === 'c'
                              ? 'bg-sky-600 text-white'
                              : 'bg-[var(--theme-bg-subtle)] text-sky-600 dark:text-sky-400 hover:opacity-80'
                          }`}
                        >
                          C Language (11)
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Examples List */}
                    <div className="overflow-y-auto max-h-80 divide-y divide-[var(--theme-border)]/50 pt-1">
                      {filteredCurriculumExamples.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[var(--theme-text-muted)]">
                          No examples match "{exampleSearch}"
                        </div>
                      ) : (
                        filteredCurriculumExamples.map((ex) => (
                          <button
                            key={ex.id}
                            onClick={() => handleLoadCurriculumExample(ex)}
                            className="w-full text-left px-2 py-2 hover:bg-[var(--theme-bg-subtle)] transition-colors cursor-pointer group flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-xs text-[var(--theme-text-main)] group-hover:text-[#860038] dark:group-hover:text-[#f39200] truncate">
                                {ex.title}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold shrink-0 ${
                                  ex.language === 'python'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                                }`}
                              >
                                {ex.language === 'python' ? 'PY' : 'C'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-muted)]">
                              <span className="truncate">{ex.category} · <code className="text-amber-600 dark:text-amber-400">{ex.filename}</code></span>
                              <span className="text-[#860038] dark:text-[#f39200] opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                Load →
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Open File, Save, Download, Run, Abort (Ctrl+X), and Expand */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] text-[var(--theme-text-main)] border border-[var(--theme-border)] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Open a .py or .c file from your local disk"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">Open File</span>
              </button>

              <button
                onClick={handleSaveCode}
                className="px-2.5 py-1 rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] text-[var(--theme-text-main)] border border-[var(--theme-border)] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Save Code"
              >
                {savedToast ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5 text-blue-500" />}
                <span className="hidden sm:inline">Save</span>
              </button>

              <button
                onClick={handleDownloadCode}
                className="px-2 py-1 rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] border border-[var(--theme-border)] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Download current file to computer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Download</span>
              </button>

              <button
                onClick={handleRunCurrentCode}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Execute program on Raspberry Pi"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
              </button>

              <button
                onClick={handleTerminateProgram}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Abort & terminate running script (Ctrl+X / Ctrl+C)"
              >
                <StopCircle className="w-3.5 h-3.5 text-rose-100" />
                <span>Stop ^X</span>
              </button>

              <button
                onClick={() => setIsStudioExpanded((prev) => !prev)}
                className="p-1 rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] cursor-pointer transition-colors"
                title={isStudioExpanded ? 'Restore Code Studio width' : 'Expand Code Studio wide'}
              >
                {isStudioExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* VS Code Tabs Bar */}
          <div className="h-8 bg-[var(--theme-bg-subtle)] border-b border-[var(--theme-border)] flex items-center px-2 gap-1 overflow-x-auto shrink-0">
            {files.map((file, idx) => (
              <button
                key={file.name}
                onClick={() => setActiveFileIndex(idx)}
                className={`px-3 py-1 text-xs font-mono flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  activeFileIndex === idx
                    ? 'bg-[var(--theme-bg-card)] text-[var(--theme-text-main)] border-[#860038] font-bold shadow-2xs'
                    : 'bg-transparent text-[var(--theme-text-muted)] border-transparent hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-border)]/30'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-[#860038] dark:text-[#f39200]" />
                <span>{file.name}</span>
              </button>
            ))}
          </div>

          {/* Code Editor Body with Syntax Highlighted Area */}
          <div className="flex-1 flex overflow-hidden border-b border-[var(--theme-border)] relative">
            {/* Left Thin Activity Rail */}
            <div className="w-10 bg-[var(--theme-bg-subtle)] border-r border-[var(--theme-border)] flex flex-col items-center justify-between py-2.5 text-[var(--theme-text-muted)] shrink-0 z-10">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setIsAppletMenuOpen(false)}
                  className={`p-1.5 cursor-pointer rounded transition-colors ${!isAppletMenuOpen ? 'text-[#860038] dark:text-[#f39200] bg-[var(--theme-bg-card)] shadow-2xs' : 'hover:text-[var(--theme-text-main)]'}`}
                  title="Code Editor"
                >
                  <Code2 className="w-4 h-4" />
                </button>

                {/* Dedicated Applets Side Menu Button with Closed Count Badge */}
                <button
                  ref={appletToggleBtnRef}
                  onClick={() => setIsAppletMenuOpen((prev) => !prev)}
                  className={`p-1.5 cursor-pointer transition-colors relative rounded ${
                    isAppletMenuOpen
                      ? 'text-[#860038] dark:text-[#f39200] bg-[var(--theme-bg-card)] shadow-2xs'
                      : closedApplets.length > 0
                      ? 'text-[#f39200] hover:text-[#860038]'
                      : 'hover:text-[var(--theme-text-main)]'
                  }`}
                  title={`Applet Manager (${enabledApplets.length}/${applets.length} active${closedApplets.length > 0 ? `, ${closedApplets.length} closed` : ''})`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  {closedApplets.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#f39200] text-black text-[9px] font-bold font-mono flex items-center justify-center shadow-xs">
                      {closedApplets.length}
                    </span>
                  )}
                </button>

                <button onClick={onOpenDiagnostics} className="p-1.5 hover:text-[var(--theme-text-main)] cursor-pointer" title="Diagnostics">
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={restoreDefaultLayout}
                  className="p-1.5 text-[var(--theme-text-muted)] hover:text-emerald-600 transition-colors cursor-pointer"
                  title="Restore Default Workspace Layout (Show All Applets)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <a
                  href="/wiki.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-[var(--theme-text-muted)] hover:text-[#860038] dark:hover:text-[#f39200] transition-colors cursor-pointer flex items-center justify-center"
                  title="Official Documentation & Architecture Wiki (/wiki.html)"
                >
                  <BookOpen className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Backdrop: Clicking anywhere outside hides the Applet Menu */}
            {isAppletMenuOpen && (
              <div
                className="fixed inset-0 z-20 cursor-default bg-black/15 backdrop-blur-[0.5px]"
                onClick={() => setIsAppletMenuOpen(false)}
              />
            )}

            {/* EXPANDABLE APPLETS SIDE MENU DRAWER (User Requirement: Outside click dismisses it) */}
            {isAppletMenuOpen && (
              <div
                ref={appletDrawerRef}
                className="w-80 bg-[var(--theme-bg-card)] border-r border-[var(--theme-border)] flex flex-col shrink-0 text-[var(--theme-text-main)] overflow-hidden font-mono text-xs z-30 shadow-2xl animate-in slide-in-from-left-2 duration-150 absolute top-0 left-10 bottom-0 h-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="h-10 px-3 bg-[var(--theme-bg-subtle)] border-b border-[var(--theme-border)] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />
                    <span className="font-bold text-[var(--theme-text-main)] tracking-wide text-xs">
                      WORKSPACE APPLET MANAGER
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAppletMenuOpen(false)}
                    className="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] rounded cursor-pointer"
                    title="Close Side Menu (Esc or click outside)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status & Quick Actions Bar */}
                <div className="p-3 bg-[var(--theme-bg-subtle)] border-b border-[var(--theme-border)] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--theme-text-muted)]">
                      Active: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{enabledApplets.length}</strong> / {applets.length}
                    </span>
                    {closedApplets.length > 0 ? (
                      <span className="text-[#860038] dark:text-[#f39200] font-bold bg-[#f39200]/20 px-2 py-0.5 rounded border border-[#f39200]/40 text-xs">
                        {closedApplets.length} Closed
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        All Active
                      </span>
                    )}
                  </div>

                  {/* Primary "Restore Default View" action */}
                  <button
                    onClick={restoreDefaultLayout}
                    className="w-full py-1.5 px-3 rounded bg-[#860038] hover:bg-[#9e0e47] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors active:scale-98"
                    title="Restore default layout with native hardware applets"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Default View</span>
                  </button>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={showAllApplets}
                      className="flex-1 py-1 px-2 text-center rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] text-[var(--theme-text-main)] border border-[var(--theme-border)] cursor-pointer transition-colors font-medium"
                      title="Make all applets visible"
                    >
                      Show All ({applets.length})
                    </button>
                    <button
                      onClick={() => setApplets((prev) => prev.map((a) => ({ ...a, minimized: false })))}
                      className="flex-1 py-1 px-2 text-center rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] border border-[var(--theme-border)] cursor-pointer transition-colors font-medium"
                      title="Expand any minimized applets"
                    >
                      Expand All
                    </button>
                  </div>
                </div>

                {/* Applet List with Quick "Put Back / Hide" Controls */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-[var(--theme-bg-app)]">
                  {applets.map((app) => {
                    const Icon = app.icon;
                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedAppletId(app.id)}
                        className={`p-2.5 rounded border transition-all ${
                          app.enabled
                            ? 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] hover:border-[#860038]'
                            : 'bg-[var(--theme-bg-subtle)] border-dashed border-[#f39200]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${app.enabled ? 'text-[#860038] dark:text-[#f39200]' : 'text-[var(--theme-text-muted)]'}`} />
                            <span className={`font-bold text-xs truncate ${app.enabled ? 'text-[var(--theme-text-main)]' : 'text-[var(--theme-text-muted)] line-through'}`}>
                              {app.title}
                            </span>
                          </div>

                          {/* Quick Toggle / Put Back Button */}
                          {app.enabled ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                closeApplet(app.id);
                              }}
                              className="px-2 py-0.5 rounded text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 cursor-pointer transition-colors font-medium"
                              title="Close / Hide Applet"
                            >
                              Hide
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openApplet(app.id);
                              }}
                              className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                              title="Put Applet back into workspace"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Put Back</span>
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-[var(--theme-text-muted)] leading-tight mb-2">
                          {APPLET_DESCRIPTIONS[app.id]}
                        </p>

                        <div className="flex items-center justify-between text-xs text-[var(--theme-text-muted)] pt-1.5 border-t border-[var(--theme-border)]">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${app.enabled ? 'bg-emerald-500' : 'bg-[#f39200]'}`} />
                            <span className={app.enabled ? 'text-[var(--theme-text-main)] font-medium' : 'text-[#f39200] font-bold'}>
                              {app.enabled ? (app.minimized ? 'Minimized' : 'Online') : 'Closed'}
                            </span>
                          </span>

                          {app.enabled && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAppletMinimize(app.id);
                              }}
                              className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] cursor-pointer"
                            >
                              {app.minimized ? 'Expand ▾' : 'Minimize ▴'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Helpful footer */}
                <div className="p-2.5 border-t border-[var(--theme-border)] bg-[var(--theme-bg-subtle)] text-xs text-[var(--theme-text-muted)] leading-tight">
                  <span>💡 Tip: Click <strong>Put Back</strong> anytime to bring any closed widget back to the canvas.</span>
                </div>
              </div>
            )}

            {/* SYNTAX HIGHLIGHTED CODE EDITOR (Python & C Syntax Highlighting with Prism.js) */}
            <div className="flex-1 flex bg-[var(--terminal-bg)] overflow-hidden font-mono text-[14px]">
              {/* Synchronized Line Numbers Gutter */}
              <div
                ref={lineNumbersRef}
                className="w-12 py-3 pr-3 text-right text-slate-500 select-none bg-[var(--theme-bg-subtle)] border-r border-[var(--theme-border)] shrink-0 overflow-hidden text-[14px] leading-[1.65]"
              >
                {currentFile.code.split('\n').map((_, i) => (
                  <div key={i + 1}>{i + 1}</div>
                ))}
              </div>

              {/* Code Area with Synchronized Overlay */}
              <div className="relative flex-1 h-full overflow-hidden">
                {/* Syntax Highlighted Pre Layer (Prism Tokens) */}
                <pre
                  ref={preRef}
                  aria-hidden="true"
                  className="absolute inset-0 p-3 m-0 overflow-auto font-mono text-[14px] leading-[1.65] pointer-events-none whitespace-pre select-none text-slate-100 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
                />

                {/* Transparent Interactive Textarea (User edits directly here with 4-space Tab support) */}
                <textarea
                  ref={textareaRef}
                  value={currentFile.code}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setFiles((prev) =>
                      prev.map((f, idx) => (idx === activeFileIndex ? { ...f, code: newCode } : f))
                    );
                  }}
                  onScroll={handleEditorScroll}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const start = e.currentTarget.selectionStart;
                      const end = e.currentTarget.selectionEnd;
                      const val = currentFile.code;
                      const newVal = val.substring(0, start) + '    ' + val.substring(end);
                      setFiles((prev) =>
                        prev.map((f, idx) => (idx === activeFileIndex ? { ...f, code: newVal } : f))
                      );
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                        }
                      }, 0);
                    }
                  }}
                  spellCheck={false}
                  className="absolute inset-0 p-3 m-0 overflow-auto font-mono text-[14px] leading-[1.65] bg-transparent text-transparent caret-emerald-400 dark:caret-[#f39200] resize-none outline-none whitespace-pre"
                />
              </div>
            </div>
          </div>

          {/* INTEGRATED RASPBERRY PI BASH TERMINAL (User Requirement: Connected to bash terminal of Pi) */}
          <div className="h-52 bg-[var(--terminal-bg)] flex flex-col shrink-0 border-t border-[var(--theme-border)]">
            {/* Terminal Header */}
            <div className="h-8 border-b border-[var(--theme-border)] px-3 flex items-center justify-between bg-[var(--theme-bg-subtle)] text-xs text-[var(--theme-text-muted)]">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[var(--theme-text-main)] font-bold flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>BASH TERMINAL (pi@raspberrypi)</span>
                </span>
                <span className="text-[11px] text-[var(--theme-text-muted)] font-mono hidden sm:inline">
                  (Press <strong className="text-rose-500">Ctrl+X</strong> to abort)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTerminateProgram}
                  className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-mono font-bold hover:bg-rose-500/25 cursor-pointer transition-colors"
                  title="Interrupt running script (Ctrl+X / Ctrl+C)"
                >
                  Stop ^C
                </button>
                <button
                  onClick={onClearTerminal}
                  className="p-1 hover:text-[var(--theme-text-main)] text-[var(--theme-text-muted)] cursor-pointer rounded transition-colors"
                  title="Clear terminal buffer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Terminal Output Log with Auto-Scroll */}
            <div
              ref={terminalScrollRef}
              className="flex-1 p-3 font-mono text-[13px] overflow-y-auto leading-relaxed text-slate-200 space-y-1 select-text"
            >
              {terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.startsWith('pi@raspberrypi')
                      ? 'text-emerald-400 font-bold'
                      : log.startsWith('^C') || log.startsWith('^X') || log.startsWith('bash:')
                      ? 'text-rose-400 font-bold'
                      : log.startsWith('[PASS]') || log.startsWith('[Execution Engine]')
                      ? 'text-emerald-300 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Interactive Bash Shell Input with History Navigation */}
            <form onSubmit={handleTerminalSubmit} className="border-t border-[var(--theme-border)] flex items-center bg-[var(--theme-bg-subtle)] px-2">
              <span className="text-emerald-500 font-mono text-xs font-bold px-1 select-none">
                pi@raspberrypi:~$
              </span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleTerminalKeyDown}
                placeholder="Type command (e.g. ls -la, python3 01_hello.py, gcc, pinout, clear)..."
                className="flex-1 bg-transparent py-2 px-1 text-[13.5px] font-mono text-[var(--theme-text-main)] outline-none"
              />
            </form>
          </div>
        </div>

        {/* DRAGGABLE VERTICAL SPLITTER HANDLE (User can drag horizontally to make Code Studio as wide as desired) */}
        <div
          onPointerDown={handleSplitterPointerDown}
          onPointerMove={handleSplitterPointerMove}
          onPointerUp={handleSplitterPointerUp}
          className="w-1.5 hover:w-2.5 bg-[var(--theme-border)] hover:bg-[#860038] cursor-col-resize transition-all shrink-0 z-30 flex items-center justify-center group select-none shadow-xs"
          title="Drag to resize Code Studio panel width"
        >
          <div className="w-0.5 h-8 bg-[var(--theme-text-muted)] group-hover:bg-white rounded-full transition-colors" />
        </div>

        {/* =====================================================================
            RIGHT COLUMN: MOVABLE, RESIZABLE APPLETS
           ===================================================================== */}
        {/* =====================================================================
            RIGHT COLUMN: MOVABLE, RESIZABLE APPLETS
           ===================================================================== */}
        <div className="relative flex-1 flex flex-col overflow-x-hidden overflow-y-auto bg-[var(--theme-bg-app)] p-4 text-[var(--theme-text-main)] max-md:min-h-[70vh] max-md:overflow-visible">
          {/* Smart Notification Banner when one or more applets are closed */}
          {closedApplets.length > 0 && enabledApplets.length > 0 && (
            <div className="w-full mb-3 px-3.5 py-2.5 rounded bg-[var(--theme-bg-subtle)] border border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#860038] dark:text-[#f39200] shrink-0" />
                <span className="text-[var(--theme-text-main)]">
                  <strong className="text-[#f39200] font-bold">{closedApplets.length}</strong> applet{closedApplets.length > 1 ? 's' : ''} currently closed:{' '}
                  <span className="text-[var(--theme-text-muted)] font-semibold">
                    {closedApplets.map((a) => a.title.split(' ')[0]).join(', ')}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {closedApplets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openApplet(a.id)}
                    className="px-2.5 py-1 rounded bg-[#860038]/10 hover:bg-[#860038]/20 border border-[#860038]/30 text-[#860038] dark:text-[#f39200] text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                    title={`Put ${a.title} back on screen`}
                  >
                    <Plus className="w-3 h-3 text-[#f39200]" />
                    <span>+ Put Back {a.title.split(' ')[0]}</span>
                  </button>
                ))}
                <button
                  onClick={restoreDefaultLayout}
                  className="px-3 py-1 rounded bg-[#860038] hover:bg-[#9e0e47] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs ml-1"
                  title="Restore Default Layout (Show All Applets)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Default View</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty state when all applets are closed */}
          {enabledApplets.length === 0 ? (
            <div className="max-w-xl mx-auto my-auto py-12 px-6 bg-[var(--theme-bg-card)] rounded border border-dashed border-[var(--theme-border)] text-center flex flex-col items-center shadow-md">
              <Layers className="w-12 h-12 text-[#860038] dark:text-[#f39200] mb-3 opacity-60" />
              <h3 className="text-base font-bold text-[var(--theme-text-main)] mb-1">
                All Workspace Applets are Closed
              </h3>
              <p className="text-xs text-[var(--theme-text-muted)] max-w-md mb-5 leading-relaxed">
                You have closed all widgets. You can restore the full default engineering layout with one click, or select individual applets below to put them back into your studio workspace.
              </p>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={restoreDefaultLayout}
                  className="px-4 py-2 rounded bg-[#860038] hover:bg-[#9e0e47] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restore Default Workspace View</span>
                </button>
                <button
                  onClick={() => setIsAppletMenuOpen(true)}
                  className="px-3.5 py-2 rounded bg-[var(--theme-bg-subtle)] hover:bg-[var(--theme-border)] text-[var(--theme-text-main)] border border-[var(--theme-border)] text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <LayoutGrid className="w-4 h-4 text-[#f39200]" />
                  <span>Open Applets Side Menu</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-xl">
                {applets.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      onClick={() => openApplet(app.id)}
                      className="p-3 rounded bg-[var(--theme-bg-subtle)] hover:bg-[var(--theme-border)] border border-[var(--theme-border)] hover:border-[#860038] text-[var(--theme-text-main)] text-xs font-mono flex flex-col items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Icon className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />
                      <span className="truncate w-full text-center font-medium">{app.title.split(' ')[0]}</span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">+ Put Back</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Canvas Mode & Arrangement Control Toolbar */}
              <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg-card)] px-4 py-3 text-sm shadow-sm select-none">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center rounded border border-[var(--theme-border)] bg-[var(--theme-bg-subtle)] px-2.5 py-1 text-xs font-mono text-[var(--theme-text-muted)]">
                    Layout: <strong className="ml-1 text-[var(--theme-text-main)]">{layoutMode === 'floating' ? 'Floating' : 'Grid'}</strong>
                  </span>
                  <span className="text-xs text-[var(--theme-text-muted)] font-mono hidden sm:inline">
                    {layoutMode === 'floating' ? 'Drag applet headers to reposition windows' : 'Applets are arranged in a fixed multi-column grid'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {layoutMode === 'floating' && (
                    <>
                      <button
                        onClick={cascadeApplets}
                        className="px-2.5 py-1 rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] border border-[var(--theme-border)] text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                        title="Cascade open windows diagonally"
                      >
                        <Layers className="w-3.5 h-3.5 text-[#f39200]" />
                        <span>Cascade</span>
                      </button>

                      <button
                        onClick={tileApplets}
                        className="px-2.5 py-1 rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] border border-[var(--theme-border)] text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                        title="Auto-arrange open windows side by side"
                      >
                        <Columns className="w-3.5 h-3.5 text-blue-500" />
                        <span>Auto-Tile</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={resetFloatingPositions}
                    className="px-2.5 py-1 rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] border border-[var(--theme-border)] text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                    title="Reset floating positions"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Positions</span>
                  </button>
                </div>
              </div>

              {/* Canvas Container: Floating Area vs Responsive Grid */}
              <div
                onPointerMove={layoutMode === 'floating' ? handleCanvasPointerMove : undefined}
                onPointerUp={layoutMode === 'floating' ? handleCanvasPointerUp : undefined}
                className={
                  layoutMode === 'floating'
                    ? 'relative flex-1 min-h-[1750px] w-full pb-24 overflow-visible'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-4 w-full'
                }
              >
              {/* -------------------------------------------------------------
                  APPLET 1: 8x8 Matrix (RGB) [With Color Change Menu & Compact Height]
                 ------------------------------------------------------------- */}
              {/* -------------------------------------------------------------
                  APPLET 1: 8x8 Matrix (RGB) [With Ultra 72px Scaling & Tic-Tac-Toe Arena]
                 ------------------------------------------------------------- */}
              {applets.find((a) => a.id === 'matrix')?.enabled && (
                <AppletCard
                  id="matrix"
                  title={isTttMode ? '8x8 Matrix · Tic-Tac-Toe Arena' : `8x8 Matrix (RGB) · ${matrixScale.toUpperCase()}`}
                  icon={isTttMode ? Gamepad2 : Grid}
                  isSelected={selectedAppletId === 'matrix'}
                  isMinimized={applets.find((a) => a.id === 'matrix')!.minimized}
                  isMaximized={applets.find((a) => a.id === 'matrix')!.maximized}
                  showBlueprintHandles={showBlueprintHandles}
                  onSelect={() => setSelectedAppletId('matrix')}
                  onToggleMinimize={() => toggleAppletMinimize('matrix')}
                  onToggleMaximize={() => toggleAppletMaximize('matrix')}
                  onClose={() => closeApplet('matrix')}
                  runStatus={subsystemStatus.matrix}
                  onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, matrix: r }))}
                  isFloating={layoutMode === 'floating'}
                  floatingPos={floatingPositions.matrix}
                  onHeaderPointerDown={(e) => handleHeaderPointerDown('matrix', e)}
                  className={matrixScale === 'ultra' ? 'col-span-full' : 'col-span-1'}
                >
                  {/* Top Bar: Tic-Tac-Toe Toggle + Scale Selector + Palette */}
                  <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-[#1b253b] gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Tic-Tac-Toe Game Mode Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isTttMode) handleExitTtt();
                          else handleStartTtt();
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border ${
                          isTttMode
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'
                        }`}
                        title="Play interactive Tic-Tac-Toe against AI on the 8x8 matrix"
                      >
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>{isTttMode ? 'Exit Game' : '🎮 Tic-Tac-Toe'}</span>
                      </button>

                      {/* Pixel Scale Selector (User Requirement: 72px ultra large scale) */}
                      <div className="flex items-center bg-[var(--theme-bg-subtle)] p-0.5 rounded border border-[var(--theme-border)] text-[11px] font-mono">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMatrixScale('compact');
                          }}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            matrixScale === 'compact'
                              ? 'bg-[#860038] text-white font-bold'
                              : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                          }`}
                          title="Compact size (20px per pixel)"
                        >
                          20px
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMatrixScale('large');
                          }}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            matrixScale === 'large'
                              ? 'bg-[#860038] text-white font-bold'
                              : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                          }`}
                          title="Large size (36px per pixel)"
                        >
                          36px
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMatrixScale('ultra');
                          }}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            matrixScale === 'ultra'
                              ? 'bg-[#860038] text-white font-bold shadow-xs'
                              : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                          }`}
                          title="Ultra large view (72px per pixel with LED diodes and glow)"
                        >
                          72px Ultra
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Presets & Compact Palette */}
                      {!isTttMode && (
                        <div className="flex items-center gap-1.5">
                          {/* Pre-programmed Patterns */}
                          <div className="flex items-center bg-[var(--theme-bg-subtle)] p-0.5 rounded border border-[var(--theme-border)] text-[10px] font-mono">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadPresetPattern('raspberry');
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-500 hover:text-white hover:bg-rose-900/60 cursor-pointer transition-colors"
                              title="Raspberry Pi Logo Preset"
                            >
                              Pi
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadPresetPattern('rainbow');
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-500 hover:text-white hover:bg-amber-900/60 cursor-pointer transition-colors"
                              title="Rainbow Spectrum Preset"
                            >
                              Rainbow
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadPresetPattern('smiley');
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-500 hover:text-white hover:bg-emerald-900/60 cursor-pointer transition-colors"
                              title="Smiley Face Preset"
                            >
                              Smile
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {PALETTE_COLORS.slice(0, 5).map((p) => (
                              <button
                                key={p.name}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPaintColor(p.color);
                                  setCustomHex(p.hex);
                                }}
                                style={{ backgroundColor: p.hex }}
                                className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                                  selectedPaintColor[0] === p.color[0] &&
                                  selectedPaintColor[1] === p.color[1] &&
                                  selectedPaintColor[2] === p.color[2]
                                    ? 'scale-125 border-white shadow-xs'
                                    : 'border-black/50 hover:scale-110'
                                }`}
                                title={`Select ${p.name}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isTttMode) handleResetTtt();
                          else onClearMatrix([0, 0, 0]);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                      >
                        {isTttMode ? 'Restart' : 'Clear ✕'}
                      </button>
                    </div>
                  </div>

                  {/* Tic-Tac-Toe Game Banner if active */}
                  {isTttMode && (
                    <div className="mb-2 p-2 rounded bg-indigo-950 text-indigo-100 border border-indigo-400 flex items-center justify-between text-xs font-mono shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">X (Cyan) vs O (Amber):</span>
                        <span className="text-cyan-300 font-medium">{tttStatus}</span>
                      </div>
                      <div className="text-[11px] font-bold px-2 py-0.5 bg-black/50 border border-indigo-400/50 text-white rounded">
                        Score: <span className="text-cyan-400">{tttScores.player}W</span> · <span className="text-amber-400">{tttScores.ai}L</span> · <span className="text-slate-300">{tttScores.ties}D</span>
                      </div>
                    </div>
                  )}

                  {/* 8x8 Circular LED Grid (Scaled dynamically up to 72px Ultra) */}
                  <div className="flex items-center justify-center gap-4 my-1 overflow-x-auto py-1">
                    <div className="flex flex-col items-center">
                      {/* Top X-Axis Coordinate Markers */}
                      <div className="grid grid-cols-8 gap-1.5 sm:gap-2 text-[10px] font-mono text-slate-500 font-bold mb-1 text-center select-none w-full">
                        {Array.from({ length: 8 }).map((_, colIdx) => (
                          <span key={colIdx}>{colIdx}</span>
                        ))}
                      </div>

                      <div
                        className={`bg-[#080c14] rounded-xl border-2 border-[#1c263c] shadow-2xl grid grid-cols-8 p-3 select-none ${
                          matrixScale === 'ultra'
                            ? 'gap-2.5 sm:gap-3.5 max-w-[660px]'
                            : matrixScale === 'large'
                            ? 'gap-1.5 max-w-[360px]'
                            : 'gap-1 max-w-[220px]'
                        }`}
                      >
                        {activeMatrix.map(([r, g, b], idx) => {
                          const x = idx % 8;
                          const y = Math.floor(idx / 8);
                          const factor = matrixBrightness / 100;
                          const adjR = Math.round(r * factor);
                          const adjG = Math.round(g * factor);
                          const adjB = Math.round(b * factor);
                          const isLit = adjR > 15 || adjG > 15 || adjB > 15;
                          const colorStyle = isLit ? `rgb(${adjR}, ${adjG}, ${adjB})` : '#121824';
                          const glowStyle = isLit
                            ? matrixScale === 'ultra'
                              ? `0 0 16px rgba(${adjR}, ${adjG}, ${adjB}, 0.85), inset 0 0 8px rgba(255, 255, 255, 0.4)`
                              : `0 0 8px rgba(${adjR}, ${adjG}, ${adjB}, 0.7)`
                            : 'inset 0 1px 3px rgba(0, 0, 0, 0.6)';

                          return (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isTttMode) {
                                  // Map click to 3x3 tic tac toe cell
                                  const cellR = y < 2 ? 0 : y < 5 ? 1 : 2;
                                  const cellC = x < 2 ? 0 : x < 5 ? 1 : 2;
                                  setTttCursor({ r: cellR, c: cellC });
                                  handleTttJoystickInput('middle');
                                } else {
                                  onSetPixel(x, y, selectedPaintColor);
                                }
                              }}
                              style={{ backgroundColor: colorStyle, boxShadow: glowStyle }}
                              className={`cursor-pointer transition-all duration-150 flex items-center justify-center relative ${
                                matrixScale === 'ultra'
                                  ? 'w-12 h-12 sm:w-[68px] sm:h-[68px] rounded-xl border border-white/20 hover:scale-105'
                                  : matrixScale === 'large'
                                  ? 'w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-black/40 hover:scale-115'
                                  : 'w-4 h-4 sm:w-5 sm:h-5 rounded-full hover:scale-125'
                              }`}
                              title={`Pixel [X: ${x}, Y: ${y}] · RGB(${adjR}, ${adjG}, ${adjB})`}
                            >
                              {/* Inner diode optics in ultra mode */}
                              {matrixScale === 'ultra' && (
                                <div
                                  className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full border ${
                                    isLit ? 'border-white/60 bg-white/30' : 'border-[#1e2738] bg-[#0c101a]'
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Vertical Brightness Slider */}
                    <div className="flex flex-col items-center justify-between h-36 py-1 select-none text-slate-400 text-[10px] font-mono">
                      <span className="font-bold">+</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={matrixBrightness}
                        onChange={(e) => setMatrixBrightness(Number(e.target.value))}
                        className="h-28 w-1.5 accent-white cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                        title="Matrix Brightness"
                      />
                      <span className="font-bold">—</span>
                    </div>
                  </div>
                </AppletCard>
              )}


              {/* -------------------------------------------------------------
                  APPLET 3: Camera Control & Vision (Col 1, Row 2)
                 ------------------------------------------------------------- */}
              {applets.find((a) => a.id === 'camera')?.enabled && (
                <AppletCard
                  id="camera"
                  title="Camera Control & Vision (240x480)"
                  icon={Camera}
                  isSelected={selectedAppletId === 'camera'}
                  isMinimized={applets.find((a) => a.id === 'camera')!.minimized}
                  isMaximized={applets.find((a) => a.id === 'camera')!.maximized}
                  showBlueprintHandles={showBlueprintHandles}
                  onSelect={() => setSelectedAppletId('camera')}
                  onToggleMinimize={() => toggleAppletMinimize('camera')}
                  onToggleMaximize={() => toggleAppletMaximize('camera')}
                  onClose={() => closeApplet('camera')}
                  runStatus={subsystemStatus.camera}
                  onRunToggle={(r) => {
                    setSubsystemStatus((p) => ({ ...p, camera: r }));
                    if (r) fetch('/api/camera/start', { method: 'POST' }).catch(() => {});
                    else fetch('/api/camera/stop', { method: 'POST' }).catch(() => {});
                  }}
                  isFloating={layoutMode === 'floating'}
                  floatingPos={floatingPositions.camera}
                  onHeaderPointerDown={(e) => handleHeaderPointerDown('camera', e)}
                  className={applets.find((a) => a.id === 'camera')!.maximized ? 'col-span-full' : 'col-span-1'}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--theme-text-main)]">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold font-mono">Live V4L2 Stream (25 FPS, 640x480)</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCaptureToMatrix();
                      }}
                      className="px-3 py-1 rounded bg-[#860038] hover:bg-[#9e0e47] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Capture to Matrix</span>
                    </button>
                  </div>

                  <div
                    className={`relative bg-[#0a0e18] rounded border border-[var(--theme-border)] overflow-hidden flex items-center justify-center transition-all duration-200 shadow-inner ${
                      applets.find((a) => a.id === 'camera')!.maximized
                        ? 'w-full flex-1 min-h-[480px]'
                        : 'w-full max-w-[480px] h-[240px] mx-auto'
                    }`}
                  >
                    <img
                      src="/api/camera/stream"
                      alt="Live Video Stream"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `/api/camera/frame?t=${Date.now()}`;
                      }}
                    />

                    {/* Red Reticle Lines */}
                    <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="w-5 h-5 border-t-2 border-l-2 border-rose-500" />
                        <div className="w-5 h-5 border-t-2 border-r-2 border-rose-500" />
                      </div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-60">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-rose-500" />
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-8 h-0.5 bg-rose-500" />
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="w-5 h-5 border-b-2 border-l-2 border-rose-500" />
                        <div className="w-5 h-5 border-b-2 border-r-2 border-rose-500" />
                      </div>
                    </div>

                    {isCapturing && (
                      <div className="absolute inset-0 bg-[#860038]/70 backdrop-blur-xs flex items-center justify-center font-bold text-white text-xs font-mono">
                        CAPTURING FRAME TO MATRIX...
                      </div>
                    )}
                  </div>
                </AppletCard>
              )}

              {/* -------------------------------------------------------------
                  APPLET 4: Sense HAT 5-Way Joystick (Col 2, Row 2 · DIRECTLY UNDER LCD DISPLAY!)
                 ------------------------------------------------------------- */}
              {applets.find((a) => a.id === 'joystick')?.enabled && (
                <AppletCard
                  id="joystick"
                  title="Sense HAT 5-Way Joystick"
                  icon={Compass}
                  isSelected={selectedAppletId === 'joystick'}
                  isMinimized={applets.find((a) => a.id === 'joystick')!.minimized}
                  isMaximized={applets.find((a) => a.id === 'joystick')!.maximized}
                  showBlueprintHandles={showBlueprintHandles}
                  onSelect={() => setSelectedAppletId('joystick')}
                  onToggleMinimize={() => toggleAppletMinimize('joystick')}
                  onToggleMaximize={() => toggleAppletMaximize('joystick')}
                  onClose={() => closeApplet('joystick')}
                  runStatus={subsystemStatus.joystick}
                  onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, joystick: r }))}
                  isFloating={layoutMode === 'floating'}
                  floatingPos={floatingPositions.joystick}
                  onHeaderPointerDown={(e) => handleHeaderPointerDown('joystick', e)}
                >
                  {/* Joystick Status Header & Loopback Test */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1b253b] text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${state.isSenseHatConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                      <span className="text-[11px] font-bold text-slate-300">
                        {state.isSenseHatConnected ? 'evdev: CONNECTED (/dev/input)' : 'Digital Twin: ACTIVE'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoystickTestPulse();
                      }}
                      className="px-2 py-0.5 rounded bg-[#860038]/80 hover:bg-[#860038] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Test round-trip loopback through the Sense HAT event queue"
                    >
                      <Zap className="w-3 h-3 text-amber-300" />
                      <span>{pulseTestResult || '⚡ Test Pulse'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-around my-1">
                    {/* Tactile D-Pad Controller with Full pointerdown (press) and pointerup (release) lifecycle */}
                    <div className="relative w-30 h-30 rounded-full bg-gradient-to-b from-[#243147] via-[#192336] to-[#111825] border-2 border-[#31425e] shadow-xl flex items-center justify-center select-none">
                      {/* UP BUTTON */}
                      <button
                        onPointerDown={(e) => handleJoystickDown('up', e)}
                        onPointerUp={(e) => handleJoystickUp('up', e)}
                        onPointerLeave={(e) => handleJoystickUp('up', e)}
                        onPointerCancel={(e) => handleJoystickUp('up', e)}
                        className="absolute top-1.5 left-1/2 -translate-x-1/2 text-slate-300 hover:text-cyan-400 active:scale-95 active:text-cyan-300 transition-all cursor-pointer p-1.5"
                        title="Joystick UP (KEY_UP 103)"
                      >
                        <ChevronDown className="w-4.5 h-4.5 rotate-180 stroke-[2.5]" />
                      </button>

                      {/* DOWN BUTTON */}
                      <button
                        onPointerDown={(e) => handleJoystickDown('down', e)}
                        onPointerUp={(e) => handleJoystickUp('down', e)}
                        onPointerLeave={(e) => handleJoystickUp('down', e)}
                        onPointerCancel={(e) => handleJoystickUp('down', e)}
                        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-slate-300 hover:text-cyan-400 active:scale-95 active:text-cyan-300 transition-all cursor-pointer p-1.5"
                        title="Joystick DOWN (KEY_DOWN 108)"
                      >
                        <ChevronDown className="w-4.5 h-4.5 stroke-[2.5]" />
                      </button>

                      {/* LEFT BUTTON */}
                      <button
                        onPointerDown={(e) => handleJoystickDown('left', e)}
                        onPointerUp={(e) => handleJoystickUp('left', e)}
                        onPointerLeave={(e) => handleJoystickUp('left', e)}
                        onPointerCancel={(e) => handleJoystickUp('left', e)}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-cyan-400 active:scale-95 active:text-cyan-300 transition-all cursor-pointer p-1.5"
                        title="Joystick LEFT (KEY_LEFT 105)"
                      >
                        <span className="font-bold text-base">‹</span>
                      </button>

                      {/* RIGHT BUTTON */}
                      <button
                        onPointerDown={(e) => handleJoystickDown('right', e)}
                        onPointerUp={(e) => handleJoystickUp('right', e)}
                        onPointerLeave={(e) => handleJoystickUp('right', e)}
                        onPointerCancel={(e) => handleJoystickUp('right', e)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-cyan-400 active:scale-95 active:text-cyan-300 transition-all cursor-pointer p-1.5"
                        title="Joystick RIGHT (KEY_RIGHT 106)"
                      >
                        <span className="font-bold text-base">›</span>
                      </button>

                      {/* MIDDLE / OK BUTTON */}
                      <button
                        onPointerDown={(e) => handleJoystickDown('middle', e)}
                        onPointerUp={(e) => handleJoystickUp('middle', e)}
                        onPointerLeave={(e) => handleJoystickUp('middle', e)}
                        onPointerCancel={(e) => handleJoystickUp('middle', e)}
                        className="w-11 h-11 rounded-full bg-gradient-to-b from-[#384b69] to-[#1c2536] border border-[#4a5f82] shadow-inner flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
                        title="Joystick MIDDLE / ENTER (KEY_ENTER 28)"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-[#161f2e] border border-[#4a5f82]" />
                      </button>
                    </div>

                    {/* Coordinates & Keyboard Notice */}
                    <div className="font-mono text-xs text-slate-200 flex flex-col gap-1.5">
                      <div>
                        <span className="text-slate-400">X-Delta:</span>{' '}
                        <span className="font-bold tracking-wider text-cyan-400">({joystickCoords.x}, 0)</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Y-Delta:</span>{' '}
                        <span className="font-bold tracking-wider text-cyan-400">({joystickCoords.y}, 0)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Arrow keys & Enter enabled
                      </span>
                    </div>
                  </div>

                  {/* Live evdev Keycode & Action Event Stream */}
                  <div className="mt-2 p-1.5 rounded bg-[#090d16] border border-[#1b2538] font-mono text-[10px] text-slate-300 select-none">
                    <div className="flex items-center justify-between text-slate-400 font-bold mb-1 border-b border-[#1b2538]/80 pb-0.5">
                      <span>Live evdev Event Monitor</span>
                      <span className="text-emerald-400 text-[9px]">PRESS / RELEASE / HOLD</span>
                    </div>
                    <div className="flex flex-col gap-0.5 max-h-16 overflow-y-auto">
                      {joystickHistory.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}.{String(item.timestamp % 1000).padStart(3, '0')}</span>
                          <span className="text-cyan-300 font-bold">{item.dir.toUpperCase()} ({item.keycode})</span>
                          <span className={`font-bold px-1 rounded ${
                            item.action === 'press' ? 'text-amber-300 bg-amber-950/60' : item.action === 'release' ? 'text-emerald-400 bg-emerald-950/60' : 'text-purple-300 bg-purple-950/60'
                          }`}>
                            {item.action.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AppletCard>
              )}

              {/* -------------------------------------------------------------
                  APPLET 5: PWM Controller (SYNCHRONIZED WITH CODE & OSCILLOSCOPE)
                 ------------------------------------------------------------- */}
              {applets.find((a) => a.id === 'pwm')?.enabled && (
                <AppletCard
                  id="pwm"
                  title="PWM Controller (Square Wave)"
                  icon={Activity}
                  isSelected={selectedAppletId === 'pwm'}
                  isMinimized={applets.find((a) => a.id === 'pwm')!.minimized}
                  isMaximized={applets.find((a) => a.id === 'pwm')!.maximized}
                  showBlueprintHandles={showBlueprintHandles}
                  onSelect={() => setSelectedAppletId('pwm')}
                  onToggleMinimize={() => toggleAppletMinimize('pwm')}
                  onToggleMaximize={() => toggleAppletMaximize('pwm')}
                  onClose={() => closeApplet('pwm')}
                  runStatus={subsystemStatus.pwm}
                  onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, pwm: r }))}
                  isFloating={layoutMode === 'floating'}
                  floatingPos={floatingPositions.pwm}
                  onHeaderPointerDown={(e) => handleHeaderPointerDown('pwm', e)}
                >
                  {/* Status Indicator & Controls */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1b253b] text-xs font-mono flex-wrap gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-300">
                        GPIO 18 / PWM0 (Pin 12)
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isPwmCodeDriven
                          ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 animate-pulse'
                          : 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/40'
                      }`}>
                        {isPwmCodeDriven ? '⚡ LIVE CODE STREAM' : '⚙ MANUAL BENCH'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePwmSweep();
                        }}
                        disabled={isSweepingPwm}
                        className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 text-[10px] font-bold cursor-pointer transition-colors"
                        title="Run an automated duty & frequency sweep on the oscilloscope"
                      >
                        {isSweepingPwm ? 'Sweeping...' : '⚡ Sweep Demo'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPwmActive((prev) => !prev);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer border ${
                          pwmActive
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title="Toggle PWM square wave generator on/off"
                      >
                        {pwmActive ? 'GEN: ON' : 'GEN: OFF'}
                      </button>
                    </div>
                  </div>

                  {/* Oscilloscope Grid with True Square Wave */}
                  <div className="h-24 bg-[#090d16] rounded border border-[#1b2336] relative overflow-hidden flex items-center justify-center my-0.5 shadow-inner">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:16px_16px]" />

                    {/* High/Low Voltage Level Labels */}
                    <div className="absolute left-2 top-1.5 text-[11px] font-mono text-cyan-400 font-bold z-20">
                      3.3V (HIGH)
                    </div>
                    <div className="absolute left-2 bottom-1.5 text-[11px] font-mono text-slate-400 font-bold z-20">
                      0.0V (LOW)
                    </div>

                    {/* Crisp Digital Square Wave Path */}
                    <svg className="w-full h-full relative z-10" viewBox="0 0 300 80" preserveAspectRatio="none">
                      <path
                        d={generatePwmSquareWavePath()}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3.5"
                        className="opacity-40 blur-xs"
                      />
                      <path
                        d={generatePwmSquareWavePath()}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>

                  {/* Calculated Electrical Metrics Bar */}
                  <div className="grid grid-cols-3 gap-1.5 my-1 p-1.5 rounded bg-[var(--theme-bg-subtle)] border border-[var(--theme-border)] text-[10px] font-mono text-center">
                    <div>
                      <div className="text-[var(--theme-text-muted)]">Avg Voltage</div>
                      <div className="font-bold text-cyan-400">{pwmActive ? (3.3 * (pwmDuty / 100)).toFixed(2) : '0.00'} V</div>
                    </div>
                    <div>
                      <div className="text-[var(--theme-text-muted)]">Period (T)</div>
                      <div className="font-bold text-emerald-400">{pwmActive ? (1000 / (pwmFreq || 1000)).toFixed(2) : '—'} ms</div>
                    </div>
                    <div>
                      <div className="text-[var(--theme-text-muted)]">Pulse Width</div>
                      <div className="font-bold text-blue-400">{pwmActive ? ((1000 / (pwmFreq || 1000)) * (pwmDuty / 100)).toFixed(2) : '—'} ms</div>
                    </div>
                  </div>

                  {/* Duty Cycle & Frequency Sliders & Telemetry */}
                  <div className="flex flex-col gap-1.5 text-xs text-slate-300 font-mono mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs w-32 font-medium">Duty Cycle: <strong className="text-cyan-400">{pwmDuty}%</strong></span>
                      <span className="font-bold text-slate-400">—</span>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={pwmDuty}
                        onChange={(e) => {
                          setPwmDuty(Number(e.target.value));
                          setPwmActive(true);
                          setIsPwmCodeDriven(false);
                        }}
                        className="flex-1 mx-2 h-1.5 accent-[#860038] dark:accent-[#f39200] bg-slate-700 rounded-lg cursor-pointer"
                      />
                      <span className="font-bold text-slate-400">+</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs w-32 font-medium">Frequency: <strong className="text-blue-400">{pwmFreq}Hz</strong></span>
                      <span className="font-bold text-slate-400">—</span>
                      <input
                        type="range"
                        min="100"
                        max="5000"
                        step="100"
                        value={pwmFreq}
                        onChange={(e) => {
                          setPwmFreq(Number(e.target.value));
                          setPwmActive(true);
                          setIsPwmCodeDriven(false);
                        }}
                        className="flex-1 mx-2 h-1.5 accent-[#860038] dark:accent-[#f39200] bg-slate-700 rounded-lg cursor-pointer"
                      />
                      <span className="font-bold text-slate-400">+</span>
                    </div>
                  </div>
                </AppletCard>
              )}

            {/* -------------------------------------------------------------
                APPLET 6: Environmental & Motion Sensors
               ------------------------------------------------------------- */}
            {/* -------------------------------------------------------------
                APPLET: Environmental Sensors (HTS221 / LPS25H)
               ------------------------------------------------------------- */}
            {applets.find((a) => a.id === 'environment')?.enabled && (
              <AppletCard
                id="environment"
                title="Environmental Sensors (HTS221 / LPS25H)"
                icon={Thermometer}
                isSelected={selectedAppletId === 'environment'}
                isMinimized={applets.find((a) => a.id === 'environment')!.minimized}
                isMaximized={applets.find((a) => a.id === 'environment')!.maximized}
                showBlueprintHandles={showBlueprintHandles}
                onSelect={() => setSelectedAppletId('environment')}
                onToggleMinimize={() => toggleAppletMinimize('environment')}
                onToggleMaximize={() => toggleAppletMaximize('environment')}
                onClose={() => closeApplet('environment')}
                runStatus={subsystemStatus.environment}
                onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, environment: r }))}
                isFloating={layoutMode === 'floating'}
                floatingPos={floatingPositions.environment}
                onHeaderPointerDown={(e) => handleHeaderPointerDown('environment', e)}
              >
                <div className="flex flex-col gap-2.5 font-mono text-xs">
                  {/* Header metrics & unit switch */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#1b253b] text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${subsystemStatus.environment ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        I2C-1 Bus · HTS221 & LPS25H
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#0e1320] px-1.5 py-0.5 rounded border border-[#1b253a]">
                      <span className="text-[10px] text-slate-400">Unit:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnvTempUnit(envTempUnit === 'C' ? 'F' : 'C');
                        }}
                        className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#860038] text-white hover:opacity-90 cursor-pointer"
                      >
                        °{envTempUnit}
                      </button>
                    </div>
                  </div>

                  {/* 3 Main Sensor Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Temperature (HTS221) */}
                    <div className="p-2 rounded bg-[#0e1320] border border-[#1b253a] flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                        <span>Temperature</span>
                        <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <div className="text-base sm:text-lg font-bold text-rose-400 my-0.5">
                        {envTempUnit === 'C'
                          ? `${(state.sensors?.temperature ?? 24.6).toFixed(1)}°C`
                          : `${(((state.sensors?.temperature ?? 24.6) * 9) / 5 + 32).toFixed(1)}°F`}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>HTS221</span>
                        <span className="text-emerald-400 font-semibold">Nominal</span>
                      </div>
                    </div>

                    {/* Relative Humidity (HTS221) */}
                    <div className="p-2 rounded bg-[#0e1320] border border-[#1b253a] flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                        <span>Humidity</span>
                        <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="text-base sm:text-lg font-bold text-cyan-400 my-0.5">
                        {(state.sensors?.humidity ?? 48.2).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>rH Level</span>
                        <span className="text-cyan-300 font-semibold">Comfort</span>
                      </div>
                    </div>

                    {/* Barometric Pressure (LPS25H) */}
                    <div className="p-2 rounded bg-[#0e1320] border border-[#1b253a] flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                        <span>Pressure</span>
                        <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="text-base sm:text-lg font-bold text-blue-400 my-0.5">
                        {(state.sensors?.pressure ?? 1013.25).toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>hPa / mbar</span>
                        <span className="text-blue-300 font-semibold">1.0 atm</span>
                      </div>
                    </div>
                  </div>

                  {/* Derived IoT Calculations Bar */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0e1320] p-2 rounded border border-[#1b253a]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Dew Point:</span>
                      <span className="text-emerald-400 font-bold">
                        {((state.sensors?.temperature ?? 24.6) - (100 - (state.sensors?.humidity ?? 48.2)) / 5).toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-l border-[#1b253a] pl-2">
                      <span className="text-slate-400">Est. Altitude:</span>
                      <span className="text-amber-400 font-bold">
                        {Math.max(0, Math.round(44330 * (1 - Math.pow((state.sensors?.pressure ?? 1013.25) / 1013.25, 1 / 5.255))))} m
                      </span>
                    </div>
                  </div>
                </div>
              </AppletCard>
            )}

            {/* -------------------------------------------------------------
                APPLET: Motion & Orientation IMU (LSM9DS1 9-DOF)
               ------------------------------------------------------------- */}
            {applets.find((a) => a.id === 'motion')?.enabled && (
              <AppletCard
                id="motion"
                title="Motion & Orientation IMU (LSM9DS1)"
                icon={Activity}
                isSelected={selectedAppletId === 'motion'}
                isMinimized={applets.find((a) => a.id === 'motion')!.minimized}
                isMaximized={applets.find((a) => a.id === 'motion')!.maximized}
                showBlueprintHandles={showBlueprintHandles}
                onSelect={() => setSelectedAppletId('motion')}
                onToggleMinimize={() => toggleAppletMinimize('motion')}
                onToggleMaximize={() => toggleAppletMaximize('motion')}
                onClose={() => closeApplet('motion')}
                runStatus={subsystemStatus.motion}
                onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, motion: r }))}
                isFloating={layoutMode === 'floating'}
                floatingPos={floatingPositions.motion}
                onHeaderPointerDown={(e) => handleHeaderPointerDown('motion', e)}
              >
                <div className="flex flex-col gap-2.5 font-mono text-xs">
                  {/* Header Status */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#1b253b] text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${subsystemStatus.motion ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        LSM9DS1 9-DOF Sensor Fusion
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {subsystemStatus.motion ? 'ACTIVE 100Hz' : 'STANDBY'}
                    </span>
                  </div>

                  {/* 3-Axis Accelerometer with Gravitational Progress Bars */}
                  <div className="p-2 rounded bg-[#0e1320] border border-[#1b253a] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span>3-Axis Accelerometer (g)</span>
                      <span className="text-slate-400 font-normal text-[10px]">Reference: 1.00g (Gravity)</span>
                    </div>
                    <div className="space-y-1">
                      {/* X-Axis */}
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-4 font-bold text-rose-400">X:</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden relative">
                          <div
                            className="h-full bg-rose-500 transition-all duration-150"
                            style={{ width: `${Math.min(100, Math.max(0, (((state.sensors?.accelerometer?.x ?? 0.02) + 2) / 4) * 100))}%` }}
                          />
                        </div>
                        <span className="w-14 text-right font-bold text-rose-400">
                          {(state.sensors?.accelerometer?.x ?? 0.02).toFixed(2)}g
                        </span>
                      </div>
                      {/* Y-Axis */}
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-4 font-bold text-emerald-400">Y:</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden relative">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-150"
                            style={{ width: `${Math.min(100, Math.max(0, (((state.sensors?.accelerometer?.y ?? -0.04) + 2) / 4) * 100))}%` }}
                          />
                        </div>
                        <span className="w-14 text-right font-bold text-emerald-400">
                          {(state.sensors?.accelerometer?.y ?? -0.04).toFixed(2)}g
                        </span>
                      </div>
                      {/* Z-Axis */}
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="w-4 font-bold text-cyan-400">Z:</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden relative">
                          <div
                            className="h-full bg-cyan-500 transition-all duration-150"
                            style={{ width: `${Math.min(100, Math.max(0, (((state.sensors?.accelerometer?.z ?? 0.98) + 2) / 4) * 100))}%` }}
                          />
                        </div>
                        <span className="w-14 text-right font-bold text-cyan-400">
                          {(state.sensors?.accelerometer?.z ?? 0.98).toFixed(2)}g
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gyroscope & Orientation / Compass Rose */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Gyroscope Rates */}
                    <div className="p-2 rounded bg-[#0e1320] border border-[#1b253a] flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">3-Axis Gyro (dps)</span>
                      <div className="space-y-0.5 my-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Roll (X):</span>
                          <span className="text-slate-100 font-bold">{(state.sensors?.gyroscope?.x ?? 0.1).toFixed(1)}°/s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pitch (Y):</span>
                          <span className="text-slate-100 font-bold">{(state.sensors?.gyroscope?.y ?? -0.2).toFixed(1)}°/s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Yaw (Z):</span>
                          <span className="text-slate-100 font-bold">{(state.sensors?.gyroscope?.z ?? 0.05).toFixed(1)}°/s</span>
                        </div>
                      </div>
                    </div>

                    {/* Compass Heading & Dial */}
                    <div className="p-2 rounded bg-[#0e1320] border border-[#1b253a] flex items-center justify-between">
                      <div className="flex flex-col justify-between h-full">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Compass</span>
                        <div className="text-sm font-bold text-amber-400">
                          {Math.round((((state.sensors?.gyroscope?.z ?? 0) * 15 + 45) % 360 + 360) % 360)}°
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">MAGNETIC NORTH</span>
                      </div>
                      {/* SVG Compass Dial */}
                      <div className="relative w-10 h-10 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center">
                        <span className="absolute top-0.5 text-[7px] font-bold text-rose-500">N</span>
                        <span className="absolute bottom-0.5 text-[7px] font-bold text-slate-500">S</span>
                        <span className="absolute left-0.5 text-[7px] font-bold text-slate-500">W</span>
                        <span className="absolute right-0.5 text-[7px] font-bold text-slate-500">E</span>
                        <div
                          className="w-0.5 h-6 bg-gradient-to-t from-slate-500 via-rose-500 to-rose-400 transition-transform duration-300"
                          style={{
                            transform: `rotate(${(((state.sensors?.gyroscope?.z ?? 0) * 15 + 45) % 360 + 360) % 360}deg)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </AppletCard>
            )}

            {/* -------------------------------------------------------------
                APPLET: 40-Pin GPIO Header Twin
               ------------------------------------------------------------- */}
            {applets.find((a) => a.id === 'gpio')?.enabled && (
              <AppletCard
                id="gpio"
                title="40-Pin GPIO Header Twin"
                icon={Zap}
                isSelected={selectedAppletId === 'gpio'}
                isMinimized={applets.find((a) => a.id === 'gpio')!.minimized}
                isMaximized={applets.find((a) => a.id === 'gpio')!.maximized}
                showBlueprintHandles={showBlueprintHandles}
                onSelect={() => setSelectedAppletId('gpio')}
                onToggleMinimize={() => toggleAppletMinimize('gpio')}
                onToggleMaximize={() => toggleAppletMaximize('gpio')}
                onClose={() => closeApplet('gpio')}
                runStatus={subsystemStatus.gpio}
                onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, gpio: r }))}
                isFloating={layoutMode === 'floating'}
                floatingPos={floatingPositions.gpio}
                onHeaderPointerDown={(e) => handleHeaderPointerDown('gpio', e)}
              >
                <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                  {state.gpio?.slice(0, 16).map((pin) => (
                    <div
                      key={pin.pin}
                      className={`p-1.5 rounded border flex items-center justify-between ${
                        pin.value === 1
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-[#0e1320] border-[#1c2538] text-slate-300'
                      }`}
                    >
                      <span className="font-bold text-[#860038] dark:text-[#f39200]">P{pin.pin}</span>
                      <span className="text-[11px] truncate max-w-[50px]">{pin.name.split(' ')[0]}</span>
                      <span className={`font-bold ${pin.value === 1 ? 'text-emerald-400' : 'text-slate-400'}`}>{pin.value}</span>
                    </div>
                  ))}
                </div>
              </AppletCard>
            )}

            {/* -------------------------------------------------------------
                APPLET: System & Bus Link Monitor
               ------------------------------------------------------------- */}
            {applets.find((a) => a.id === 'monitor')?.enabled && (
              <AppletCard
                id="monitor"
                title="System & Bus Link Monitor"
                icon={Cpu}
                isSelected={selectedAppletId === 'monitor'}
                isMinimized={applets.find((a) => a.id === 'monitor')!.minimized}
                isMaximized={applets.find((a) => a.id === 'monitor')!.maximized}
                showBlueprintHandles={showBlueprintHandles}
                onSelect={() => setSelectedAppletId('monitor')}
                onToggleMinimize={() => toggleAppletMinimize('monitor')}
                onToggleMaximize={() => toggleAppletMaximize('monitor')}
                onClose={() => closeApplet('monitor')}
                runStatus={subsystemStatus.monitor}
                onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, monitor: r }))}
                isFloating={layoutMode === 'floating'}
                floatingPos={floatingPositions.monitor}
                onHeaderPointerDown={(e) => handleHeaderPointerDown('monitor', e)}
              >
                <div className="space-y-1.5 font-mono text-xs text-slate-200">
                  <div className="flex items-center justify-between p-1.5 bg-[#0e1320] rounded border border-[#1b253a]">
                    <span className="text-slate-400">Host Target:</span>
                    <span className="text-emerald-400 font-bold">{state.system?.model || 'Raspberry Pi 4 Model B'}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-[#0e1320] rounded border border-[#1b253a]">
                    <span className="text-slate-400">Bus Link Level:</span>
                    <span className="text-emerald-400 font-bold uppercase">{state.hardwareLinkStatus || 'ONLINE (HTS221/LPS25H)'}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-[#0e1320] rounded border border-[#1b253a]">
                    <span className="text-slate-400">LED Framebuffer:</span>
                    <span className="text-cyan-400 font-bold">/dev/fb1 (Active)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-[#0e1320] rounded border border-[#1b253a]">
                    <span className="text-slate-400">Camera Device:</span>
                    <span className="text-cyan-400 font-bold">
                      {subsystemStatus.camera ? '/dev/video0 (Active V4L2)' : '/dev/video0 (Hardware Released)'}
                    </span>
                  </div>
                </div>
              </AppletCard>
            )}
          </div>
        </>
      )}

          {/* Floating Undo Notification Toast when an applet is closed */}
          {recentlyClosedApplet && (
            <div className="fixed bottom-6 right-6 z-40 bg-[var(--theme-bg-card)] border border-[#860038] text-[var(--theme-text-main)] px-4 py-3 rounded shadow-2xl flex items-center gap-3 text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong>{recentlyClosedApplet.title}</strong> closed.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openApplet(recentlyClosedApplet.id)}
                  className="px-3 py-1 rounded bg-[#860038] hover:bg-[#9e0e47] text-white font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo / Put Back</span>
                </button>
                <button
                  onClick={() => setRecentlyClosedApplet(null)}
                  className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] p-1 cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
