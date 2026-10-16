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
} from 'lucide-react';
import {
  FullHardwareState,
  RgbColor,
  JoystickDirection,
  ProgramLanguage,
  TerminalOutput,
} from '../types/digitalTwin';
import { CURRICULUM_EXAMPLES } from '../data/curriculumExamples';

interface UnifiedWorkspaceProps {
  state: FullHardwareState;
  terminalOutputs: TerminalOutput[];
  onSetPixel: (x: number, y: number, color: RgbColor) => void;
  onClearMatrix: (color?: RgbColor) => void;
  onSetMatrixPattern: (pixels: RgbColor[]) => void;
  onTriggerJoystick: (direction: JoystickDirection) => void;
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

type AppletId = 'matrix' | 'lcd' | 'joystick' | 'camera' | 'pwm' | 'sensors' | 'gpio' | 'monitor';

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
  { id: 'matrix', title: '8x8 Matrix (RGB)', icon: Grid, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'lcd', title: 'LCD Display (16x2)', icon: Sliders, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'joystick', title: 'Joystick Control', icon: Compass, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'camera', title: 'Camera Control & Vision', icon: Camera, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'pwm', title: 'PWM Controller (Square Wave)', icon: Activity, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'sensors', title: 'Environmental & Motion Sensors', icon: Thermometer, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'gpio', title: '40-Pin GPIO Header Twin', icon: Zap, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
  { id: 'monitor', title: 'System & Bus Link Monitor', icon: Cpu, defaultColSpan: 1, enabled: true, minimized: false, maximized: false },
];

export const APPLET_DESCRIPTIONS: Record<AppletId, string> = {
  matrix: 'Sense HAT 8x8 RGB LED matrix display with palette editor',
  lcd: '16x2 Character HD44780 / I2C LCD Display',
  joystick: '5-Way Analog/Digital Directional Stick & coordinates',
  camera: 'CSI/USB Camera video feed with Edge Detection & matrix capture',
  pwm: 'Hardware PWM0 3.3V digital square wave oscilloscope',
  sensors: 'HTS221 Temp/Humidity & LPS25H Barometer live telemetry',
  gpio: 'Raspberry Pi 4 40-Pin GPIO Header Twin with pin state indicators',
  monitor: 'Real-time CPU, RAM, I2C & SPI hardware bus link monitor',
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
    code: `# 12. Sense HAT Tic-Tac-Toe Game
from sense_hat import SenseHat
import time

sense = SenseHat()
sense.clear()
print("Starting Tic-Tac-Toe...")

# Color Palettes
O = [0, 0, 0]
R = [255, 0, 0]      # Player 1
B = [0, 100, 255]    # Player 2
G = [50, 50, 50]     # Grid Lines

grid = [
  O, O, G, O, O, G, O, O,
  O, O, G, O, O, G, O, O,
  G, G, G, G, G, G, G, G,
  O, O, G, O, O, G, O, O,
  O, O, G, O, O, G, O, O,
  G, G, G, G, G, G, G, G,
  O, O, G, O, O, G, O, O,
  O, O, G, O, O, G, O, O,
]

sense.set_pixels(grid)
print("Grid rendered. Use Joystick to select tiles.")
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
    name: 'camera_vision.py',
    lang: 'python' as ProgramLanguage,
    code: `# Pi Camera Module & Morphological Edge Detection
import time

print("[*] Acquiring video stream from /dev/video0...")
print("[*] Applying Canny & Sobel Edge Detection filters...")
time.sleep(0.5)
print("[PASS] Video frames successfully downsampled to 8x8 matrix.")
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
      className={`rounded bg-[var(--theme-bg-card)] border transition-all duration-150 flex flex-col shadow-sm ${
        isSelected
          ? 'border-[#860038] shadow-[0_0_14px_rgba(134,0,56,0.22)] ring-1 ring-[#860038]/30'
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
        className={`h-9 bg-[var(--theme-bg-subtle)] border-b border-[var(--theme-border)] px-3 flex items-center justify-between gap-2 select-none shrink-0 ${
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
        <div className="p-3.5 flex-1 flex flex-col justify-between overflow-auto bg-[var(--theme-bg-card)] text-[var(--theme-text-main)]">
          {children}
        </div>
      )}
    </div>
  );
}

export function UnifiedWorkspace({
  state,
  terminalOutputs,
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
}: UnifiedWorkspaceProps) {
  // Applet Configurations with LocalStorage Persistence
  const [applets, setApplets] = useState<AppletConfig[]>(() => {
    const saved = localStorage.getItem('iot-workspace-applets-v3');
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
    localStorage.setItem('iot-workspace-applets-v3', JSON.stringify(applets));
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
    localStorage.removeItem('iot-workspace-applets-v3');
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
      setIsWikiOpen(true);
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
  const [isWikiOpen, setIsWikiOpen] = useState(false);

  // Save Code Action
  const handleSaveCode = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
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

  // Hardware Subsystem Run/Standby States
  const [subsystemStatus, setSubsystemStatus] = useState<Record<string, boolean>>({
    matrix: true,
    lcd: true,
    joystick: true,
    camera: true,
    pwm: true,
    sensors: true,
  });

  // Matrix Interactive Controls
  const [selectedPaintColor, setSelectedPaintColor] = useState<RgbColor>([239, 68, 68]);
  const [customHex, setCustomHex] = useState('#ef4444');
  const [matrixBrightness, setMatrixBrightness] = useState<number>(100);

  // LCD Contrast State
  const [lcdContrast, setLcdContrast] = useState<number>(85);

  // Joystick Coords State
  const [joystickCoords, setJoystickCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMoveJoystick = (dir: JoystickDirection) => {
    onTriggerJoystick(dir);
    const deltas: Record<JoystickDirection, { x: number; y: number }> = {
      up: { x: 0, y: -18 },
      down: { x: 0, y: 18 },
      left: { x: -18, y: 0 },
      right: { x: 18, y: 0 },
      middle: { x: 0, y: 0 },
      centre: { x: 0, y: 0 },
    };
    setJoystickCoords(deltas[dir] || { x: 0, y: 0 });
    setTimeout(() => setJoystickCoords({ x: 0, y: 0 }), 300);
  };

  // Camera Capture and Frame Timestamp
  const [cameraFrameTimestamp, setCameraFrameTimestamp] = useState<number>(Date.now());
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCameraFrameTimestamp(Date.now());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

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

  // PWM Controller Waveform State
  const [pwmDuty, setPwmDuty] = useState<number>(50);
  const [pwmFreq, setPwmFreq] = useState<number>(1000);
  const [pwmPhase, setPwmPhase] = useState<number>(0);

  useEffect(() => {
    const pwmInterval = setInterval(() => {
      setPwmPhase((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(pwmInterval);
  }, []);

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
  const [layoutMode, setLayoutMode] = useState<'floating' | 'grid'>('floating');

  const DEFAULT_FLOATING_POSITIONS: Record<AppletId, { x: number; y: number; zIndex: number; width?: number }> = {
    matrix: { x: 20, y: 20, zIndex: 10, width: 440 },
    sensors: { x: 480, y: 20, zIndex: 11, width: 460 },
    camera: { x: 20, y: 460, zIndex: 12, width: 500 }, // User req: 240x480 widget, expands on maximize
    pwm: { x: 540, y: 460, zIndex: 13, width: 440 },
    lcd: { x: 20, y: 920, zIndex: 14, width: 440 },
    gpio: { x: 480, y: 920, zIndex: 15, width: 460 },
    joystick: { x: 20, y: 1380, zIndex: 16, width: 380 },
    monitor: { x: 420, y: 1380, zIndex: 17, width: 480 },
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
    'Physical Computing & Digital Twin Lab · University of Galway',
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
    const width = 300;
    const highY = 16;  // 3.3V HIGH
    const lowY = 62;   // 0.0V LOW
    const period = Math.max(20, Math.min(80, Math.round(5000 / pwmFreq * 8)));
    const dutyFrac = pwmDuty / 100;
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
    <div className="flex flex-col w-full h-[calc(100vh-3.75rem)] bg-[var(--theme-bg-app)] text-[var(--theme-text-main)] overflow-hidden font-sans select-none transition-colors duration-150 relative">
      {/* =========================================================================
          MAIN LAYOUT: CODE STUDIO (LEFT) + APPLETS (RIGHT)
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* =====================================================================
            LEFT COLUMN: VS CODE PROGRAMMING ENVIRONMENT
           ===================================================================== */}
        <div
          style={{ width: isStudioExpanded ? '74%' : `${studioWidth}%` }}
          className="min-w-[480px] max-w-[85vw] border-r border-[var(--theme-border)] bg-[var(--theme-bg-card)] flex flex-col shrink-0 transition-all duration-150 relative"
        >
          {/* Top Bar with Examples Dropdown, Save, Run, Abort, and Expand */}
          <div className="h-10 border-b border-[var(--theme-border)] px-3 flex items-center justify-between bg-[var(--theme-bg-subtle)] gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {/* Examples from Pi ▾ Dropdown (Full Curriculum from src/data/curriculumExamples.ts) */}
              <div className="relative">
                <button
                  onClick={() => setExamplesMenuOpen((prev) => !prev)}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold border border-[#860038]/40 bg-[#860038]/10 text-[#860038] dark:text-[#f39200] hover:bg-[#860038]/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Browse all 28 Python & C curriculum examples"
                >
                  <FolderOpen className="w-4 h-4 text-[#860038] dark:text-[#f39200]" />
                  <span>Examples from Pi ({CURRICULUM_EXAMPLES.length})</span>
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

            {/* Run, Abort (Ctrl+X), Save, and Expand Studio Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSaveCode}
                className="px-2.5 py-1 rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] text-[var(--theme-text-main)] border border-[var(--theme-border)] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Save Code"
              >
                {savedToast ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Save</span>
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

                <button onClick={() => setIsWikiOpen(true)} className="p-1.5 hover:text-[var(--theme-text-main)] cursor-pointer" title="Emulator Wiki">
                  <BookOpen className="w-4 h-4" />
                </button>
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
                        All 8 Active
                      </span>
                    )}
                  </div>

                  {/* Primary "Restore Default View" action */}
                  <button
                    onClick={restoreDefaultLayout}
                    className="w-full py-1.5 px-3 rounded bg-[#860038] hover:bg-[#9e0e47] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors active:scale-98"
                    title="Restore default layout with all 8 applets visible"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Default View</span>
                  </button>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={showAllApplets}
                      className="flex-1 py-1 px-2 text-center rounded bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border)] text-[var(--theme-text-main)] border border-[var(--theme-border)] cursor-pointer transition-colors font-medium"
                      title="Make all 8 applets visible"
                    >
                      Show All (8)
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
        <div className="flex-1 bg-[var(--theme-bg-app)] text-[var(--theme-text-main)] p-3 overflow-y-auto overflow-x-hidden relative flex flex-col">
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
              <div className="w-full mb-3 px-3.5 py-2 rounded bg-[var(--theme-bg-subtle)] border border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-3 text-sm shadow-xs shrink-0 select-none">
                <div className="flex items-center gap-2.5">
                  {/* Floating vs Grid Switcher */}
                  <div className="flex items-center bg-[var(--theme-bg-card)] p-0.5 rounded border border-[var(--theme-border)]">
                    <button
                      onClick={() => setLayoutMode('floating')}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        layoutMode === 'floating'
                          ? 'bg-[#860038] text-white shadow-xs font-bold'
                          : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                      }`}
                      title="Floating Windows: Drag, reposition, and layer applets freely"
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Floating Mode</span>
                    </button>

                    <button
                      onClick={() => setLayoutMode('grid')}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        layoutMode === 'grid'
                          ? 'bg-[#860038] text-white shadow-xs font-bold'
                          : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                      }`}
                      title="Tiled Grid: Standard multi-column docking grid"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Tiled Grid</span>
                    </button>
                  </div>

                  <span className="text-xs text-[var(--theme-text-muted)] font-mono hidden sm:inline">
                    {layoutMode === 'floating' ? 'Drag header to move freely · Click to bring to front' : 'Fixed multi-column layout'}
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
              {applets.find((a) => a.id === 'matrix')?.enabled && (
                <AppletCard
                  id="matrix"
                  title="8x8 Matrix (RGB) - Click to Paint"
                  icon={Grid}
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
                >
                {/* Compact Color Change Palette Menu */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1b253b]">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Palette:</span>
                    <div className="flex items-center gap-1">
                      {PALETTE_COLORS.map((p) => (
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

                  {/* Clear Matrix Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearMatrix([0, 0, 0]);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                  >
                    Clear ✕
                  </button>
                </div>

                {/* Compact 8x8 Circular LED Grid & Brightness Slider */}
                <div className="flex items-center justify-center gap-5 my-0.5">
                  <div className="p-2 bg-[#090d16] rounded border border-[#1b2438] shadow-inner grid grid-cols-8 gap-1">
                    {activeMatrix.map(([r, g, b], idx) => {
                      const factor = matrixBrightness / 100;
                      const adjR = Math.round(r * factor);
                      const adjG = Math.round(g * factor);
                      const adjB = Math.round(b * factor);
                      const isLit = adjR > 15 || adjG > 15 || adjB > 15;
                      const colorStyle = isLit ? `rgb(${adjR}, ${adjG}, ${adjB})` : '#182030';
                      const glowStyle = isLit ? `0 0 5px rgba(${adjR}, ${adjG}, ${adjB}, 0.7)` : 'none';

                      return (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Paint clicked LED with selectedPaintColor!
                            onSetPixel(idx % 8, Math.floor(idx / 8), selectedPaintColor);
                          }}
                          style={{ backgroundColor: colorStyle, boxShadow: glowStyle }}
                          className="w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-125"
                          title={`LED [${idx % 8}, ${Math.floor(idx / 8)}]`}
                        />
                      );
                    })}
                  </div>

                  {/* Compact Brightness Slider */}
                  <div className="flex flex-col items-center justify-between h-28 py-0.5 select-none text-slate-400 text-[10px]">
                    <span className="font-bold">+</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={matrixBrightness}
                      onChange={(e) => setMatrixBrightness(Number(e.target.value))}
                      className="h-20 w-1 accent-white cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                    />
                    <span className="font-bold">—</span>
                  </div>
                </div>
              </AppletCard>
            )}

            {/* -------------------------------------------------------------
                APPLET 2: LCD Display (16x2)
               ------------------------------------------------------------- */}
            {applets.find((a) => a.id === 'lcd')?.enabled && (
              <AppletCard
                id="lcd"
                title="LCD Display (16x2 HD44780)"
                icon={Sliders}
                isSelected={selectedAppletId === 'lcd'}
                isMinimized={applets.find((a) => a.id === 'lcd')!.minimized}
                isMaximized={applets.find((a) => a.id === 'lcd')!.maximized}
                showBlueprintHandles={showBlueprintHandles}
                onSelect={() => setSelectedAppletId('lcd')}
                onToggleMinimize={() => toggleAppletMinimize('lcd')}
                onToggleMaximize={() => toggleAppletMaximize('lcd')}
                onClose={() => closeApplet('lcd')}
                runStatus={subsystemStatus.lcd}
                onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, lcd: r }))}
                isFloating={layoutMode === 'floating'}
                floatingPos={floatingPositions.lcd}
                onHeaderPointerDown={(e) => handleHeaderPointerDown('lcd', e)}
              >
                <div className="my-1 p-2 bg-[#143d26] rounded border border-[#1e5837] shadow-md flex flex-col items-center">
                  <div className="w-full flex justify-center gap-1 mb-1">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="w-1 h-1.5 bg-amber-400/90 rounded-2xs border border-amber-600/70" />
                    ))}
                  </div>

                  <div
                    style={{ opacity: lcdContrast / 100 }}
                    className="w-full bg-[#121c17] border border-[#1a2e22] rounded p-2 text-center shadow-inner"
                  >
                    <div className="font-mono text-xs tracking-widest text-emerald-400 font-bold uppercase drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                      {state.lcd?.lines?.[0] || 'READY'}
                    </div>
                    <div className="font-mono text-[11px] tracking-wider text-emerald-300 mt-0.5">
                      {state.lcd?.lines?.[1] || '(Press RUN to start)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <span className="text-[11px]">Contrast</span>
                  <span className="font-bold">—</span>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={lcdContrast}
                    onChange={(e) => setLcdContrast(Number(e.target.value))}
                    className="w-36 h-1 accent-white bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <span className="font-bold">+</span>
                </div>
              </AppletCard>
            )}

            {/* -------------------------------------------------------------
                APPLET 3: Joystick Control
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
                <div className="flex items-center justify-around my-1">
                  <div className="relative w-28 h-28 rounded-full bg-gradient-to-b from-[#243147] via-[#192336] to-[#111825] border-2 border-[#31425e] shadow-xl flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveJoystick('up');
                      }}
                      className="absolute top-1.5 left-1/2 -translate-x-1/2 text-slate-300 hover:text-cyan-400 hover:scale-125 transition-transform cursor-pointer p-1"
                    >
                      <ChevronDown className="w-4 h-4 rotate-180 stroke-[2.5]" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveJoystick('down');
                      }}
                      className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-slate-300 hover:text-cyan-400 hover:scale-125 transition-transform cursor-pointer p-1"
                    >
                      <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveJoystick('left');
                      }}
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-cyan-400 hover:scale-125 transition-transform cursor-pointer p-1"
                    >
                      <span className="font-bold text-sm">‹</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveJoystick('right');
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-cyan-400 hover:scale-125 transition-transform cursor-pointer p-1"
                    >
                      <span className="font-bold text-sm">›</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveJoystick('middle');
                      }}
                      className="w-10 h-10 rounded-full bg-gradient-to-b from-[#384b69] to-[#1c2536] border border-[#4a5f82] shadow-inner flex items-center justify-center text-slate-400 hover:text-white active:scale-95 transition-transform cursor-pointer"
                      title="Reset Origin"
                    >
                      <div className="w-3 h-3 rounded-full bg-[#161f2e] border border-[#4a5f82]" />
                    </button>
                  </div>

                  <div className="font-mono text-xs text-slate-200 flex flex-col gap-1.5">
                    <div>
                      <span className="text-slate-400">X:</span>{' '}
                      <span className="font-bold tracking-wider">({joystickCoords.x}, 0)</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Y:</span>{' '}
                      <span className="font-bold tracking-wider">({joystickCoords.y}, 0)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans">
                      (Arrow keys enabled)
                    </span>
                  </div>
                </div>
              </AppletCard>
            )}

            {/* -------------------------------------------------------------
                APPLET 4: Camera Control & Vision (240x480 default, expands when maximized)
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
                onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, camera: r }))}
                isFloating={layoutMode === 'floating'}
                floatingPos={floatingPositions.camera}
                onHeaderPointerDown={(e) => handleHeaderPointerDown('camera', e)}
                className={applets.find((a) => a.id === 'camera')!.maximized ? 'col-span-full' : 'col-span-1 md:col-span-2'}
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
                    src={`/api/camera/frame?t=${cameraFrameTimestamp}`}
                    alt="Live Video Stream"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" fill="%23141a29"><rect width="640" height="480"/><circle cx="320" cy="240" r="80" fill="%23860038"/><text x="20" y="30" fill="%23f39200" font-family="monospace" font-size="20">LABORATORY CAMERA FEED (240x480)</text></svg>';
                    }}
                  />

                  {/* Red Reticle Lines */}
                  <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="w-5 h-5 border-t-2 border-l-2 border-rose-500" />
                      <div className="w-5 h-5 border-t-2 border-r-2 border-rose-500" />
                    </div>
                    {/* Center Crosshair */}
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
                APPLET 5: PWM Controller (TRUE DIGITAL SQUARE WAVE)
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
                {/* Oscilloscope Grid with True Square Wave */}
                <div className="h-24 bg-[#090d16] rounded border border-[#1b2336] relative overflow-hidden flex items-center justify-center my-0.5">
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
                    {/* Glowing underlay */}
                    <path
                      d={generatePwmSquareWavePath()}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="3.5"
                      className="opacity-40 blur-xs"
                    />
                    {/* Sharp square wave */}
                    <path
                      d={generatePwmSquareWavePath()}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Duty Cycle & Frequency Sliders */}
                <div className="flex flex-col gap-1.5 text-xs text-slate-300 font-mono mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs w-32 font-medium">Duty Cycle: <strong className="text-cyan-400">{pwmDuty}%</strong></span>
                    <span className="font-bold text-slate-400">—</span>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      value={pwmDuty}
                      onChange={(e) => setPwmDuty(Number(e.target.value))}
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
                      onChange={(e) => setPwmFreq(Number(e.target.value))}
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
            {applets.find((a) => a.id === 'sensors')?.enabled && (
              <AppletCard
                id="sensors"
                title="Environmental & Motion Sensors"
                icon={Thermometer}
                isSelected={selectedAppletId === 'sensors'}
                isMinimized={applets.find((a) => a.id === 'sensors')!.minimized}
                isMaximized={applets.find((a) => a.id === 'sensors')!.maximized}
                showBlueprintHandles={showBlueprintHandles}
                onSelect={() => setSelectedAppletId('sensors')}
                onToggleMinimize={() => toggleAppletMinimize('sensors')}
                onToggleMaximize={() => toggleAppletMaximize('sensors')}
                onClose={() => closeApplet('sensors')}
                runStatus={subsystemStatus.sensors}
                onRunToggle={(r) => setSubsystemStatus((p) => ({ ...p, sensors: r }))}
                isFloating={layoutMode === 'floating'}
                floatingPos={floatingPositions.sensors}
                onHeaderPointerDown={(e) => handleHeaderPointerDown('sensors', e)}
              >
                <div className="grid grid-cols-2 gap-3 my-1">
                  <div className="flex flex-col gap-2 font-mono text-xs text-slate-200">
                    <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                      Environmental (HTS221/LPS25H)
                    </div>

                    <div className="flex items-center justify-between bg-[#0e1320] p-1.5 rounded border border-[#1b253a]">
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-semibold text-slate-100">Temp: {state.sensors?.temperature?.toFixed(1) || '24.6'}°C</span>
                      </div>
                      <svg className="w-8 h-3 shrink-0" viewBox="0 0 40 12">
                        <path d="M0,8 Q10,2 20,6 T40,4" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between bg-[#0e1320] p-1.5 rounded border border-[#1b253a]">
                      <div className="flex items-center gap-1.5">
                        <Gauge className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-semibold text-slate-100">Baro: {state.sensors?.pressure?.toFixed(1) || '1013.2'} hPa</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-[#0e1320] p-1.5 rounded border border-[#1b253a]">
                      <div className="flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="font-semibold text-slate-100">Humidity: {state.sensors?.humidity?.toFixed(0) || '48'}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between font-mono text-xs text-slate-200 border-l border-[#1b2336] pl-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                        Motion (LSM9DS1)
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        DETECTED
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 bg-[#0e1320] p-2 rounded border border-[#1b253a]">
                      <div className="relative w-8 h-8">
                        <div className="absolute left-3.5 bottom-1 h-5 w-0.5 bg-cyan-400" />
                        <span className="absolute top-0 left-2 text-[8px] text-cyan-400 font-bold">Z</span>
                        <div className="absolute left-3.5 bottom-1 w-4 h-0.5 bg-rose-400" />
                        <span className="absolute bottom-0 right-0 text-[8px] text-rose-400 font-bold">X</span>
                        <div className="absolute left-1.5 bottom-1 w-3 h-3 border-l border-b border-emerald-400 -rotate-45" />
                      </div>

                      <div className="flex flex-col text-xs text-right font-mono text-slate-200">
                        <span>X: <strong className="text-rose-400">{state.sensors?.accelerometer?.x?.toFixed(2) || '0.02'}g</strong></span>
                        <span>Y: <strong className="text-emerald-400">{state.sensors?.accelerometer?.y?.toFixed(2) || '-0.98'}g</strong></span>
                        <span>Z: <strong className="text-cyan-400">{state.sensors?.accelerometer?.z?.toFixed(2) || '0.15'}g</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </AppletCard>
            )}

            {/* -------------------------------------------------------------
                APPLET 7: 40-Pin GPIO Header Twin
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
                APPLET 8: System & Bus Link Monitor
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
                    <span className="text-cyan-400 font-bold">/dev/video0 (V4L2 640x480)</span>
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

      {/* =========================================================================
          EMULATOR WIKI & USER GUIDE MODAL
         ========================================================================= */}
      {isWikiOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[85vh] bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded shadow-2xl flex flex-col overflow-hidden text-[var(--theme-text-main)]">
            {/* Modal Header */}
            <div className="h-12 px-5 bg-[var(--theme-bg-subtle)] border-b border-[var(--theme-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#860038] dark:text-[#f39200]" />
                <span className="font-bold text-base text-[var(--theme-text-main)] font-sans">
                  University of Galway · Pi-Digit Emulator Wiki & User Guide
                </span>
              </div>
              <button
                onClick={() => setIsWikiOpen(false)}
                className="p-1.5 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono leading-relaxed text-[var(--theme-text-main)] bg-[var(--theme-bg-app)]">
              <section className="space-y-2 p-4 rounded bg-[var(--theme-bg-card)] border border-[var(--theme-border)]">
                <h3 className="text-sm font-bold text-[#860038] dark:text-[#f39200] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Grid className="w-4 h-4" /> 1. 8x8 RGB LED Matrix Subsystem
                </h3>
                <p>
                  The Sense HAT LED matrix features 64 individually addressable RGB LEDs linked to <code className="text-[#860038] dark:text-[#f39200] font-bold">/dev/fb1</code> on real hardware. In the digital twin, you can:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--theme-text-muted)]">
                  <li>Click any color swatch in the palette menu and click any LED to paint directly.</li>
                  <li>Use the vertical slider on the right to scale display brightness.</li>
                  <li>In Python: <code className="text-purple-600 dark:text-purple-300">from sense_hat import SenseHat; s = SenseHat(); s.set_pixel(x, y, [r, g, b])</code>.</li>
                </ul>
              </section>

              <section className="space-y-2 p-4 rounded bg-[var(--theme-bg-card)] border border-[var(--theme-border)]">
                <h3 className="text-sm font-bold text-[#860038] dark:text-[#f39200] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Compass className="w-4 h-4" /> 2. 5-Way Joystick Control
                </h3>
                <p>
                  The 5-way joystick triggers event interrupts on the Raspberry Pi input bus (<code className="text-[#860038] dark:text-[#f39200] font-bold">/dev/input/event*</code>).
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--theme-text-muted)]">
                  <li>Use the on-screen metallic D-Pad or your keyboard <strong>Arrow Keys</strong> and <strong>Enter</strong> to trigger directions (UP, DOWN, LEFT, RIGHT, MIDDLE).</li>
                  <li>In Python: <code className="text-purple-600 dark:text-purple-300">for event in sense.stick.get_events(): print(event.direction, event.action)</code>.</li>
                </ul>
              </section>

              <section className="space-y-2 p-4 rounded bg-[var(--theme-bg-card)] border border-[var(--theme-border)]">
                <h3 className="text-sm font-bold text-[#860038] dark:text-[#f39200] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Activity className="w-4 h-4" /> 3. Hardware PWM0 Signal Generator
                </h3>
                <p>
                  Generates true digital square waves on GPIO Pin 18 (BCM 18 / Physical Pin 12).
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--theme-text-muted)]">
                  <li>Adjust the <strong>Duty Cycle</strong> slider to modulate pulse width (HIGH time vs LOW time).</li>
                  <li>Adjust the <strong>Frequency</strong> slider (100 Hz - 5000 Hz) to vary the cycle period.</li>
                  <li>Observe the real-time calibrated digital square wave oscilloscope visualization.</li>
                </ul>
              </section>

              <section className="space-y-2 p-4 rounded bg-[var(--theme-bg-card)] border border-[var(--theme-border)]">
                <h3 className="text-sm font-bold text-[#860038] dark:text-[#f39200] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <StopCircle className="w-4 h-4 text-rose-600" /> 4. Terminating Infinite Loops (Ctrl+X)
                </h3>
                <p>
                  If a user script enters a <code className="text-[#f39200] font-bold">while True:</code> loop, you can immediately terminate execution at any time by pressing <strong>Ctrl+X</strong> (or <strong>Ctrl+C</strong>) anywhere in the workspace or clicking the <strong>Stop ^X</strong> button in the terminal header.
                </p>
              </section>

              <section className="space-y-2 p-4 rounded bg-[var(--theme-bg-card)] border border-[var(--theme-border)]">
                <h3 className="text-sm font-bold text-[#860038] dark:text-[#f39200] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Camera className="w-4 h-4" /> 5. Pi Camera Module & Computer Vision (240x480)
                </h3>
                <p>
                  Supports real CSI-2 camera modules, USB V4L2 webcams, and synthetic test frames calibrated to 240x480 in standard view and full expansion when maximized. Click <strong>Capture to Matrix</strong> to downsample the live frame to the 8x8 LED matrix.
                </p>
              </section>

              <section className="space-y-2 p-4 rounded bg-[var(--theme-bg-card)] border border-[var(--theme-border)]">
                <h3 className="text-sm font-bold text-[#860038] dark:text-[#f39200] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <LayoutGrid className="w-4 h-4" /> 6. Managing Applets & Restoring Default View
                </h3>
                <p>
                  If you close an applet using its top-right ✕ button, you can bring it back at any time:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[var(--theme-text-muted)]">
                  <li><strong>Applets Side Menu:</strong> Click the <LayoutGrid className="w-3.5 h-3.5 inline text-[#860038] dark:text-[#f39200]" /> icon on the left Activity Rail to open the side drawer with all 8 applets and their status. Clicking anywhere outside dismisses the drawer.</li>
                  <li><strong>Canvas Banner:</strong> When applets are closed, an alert banner appears above the canvas with one-click <code>+ Put Back</code> buttons.</li>
                  <li><strong>Restore Default View:</strong> Click the <strong>↺ Restore Default View</strong> button in the top menu bar, side drawer, or canvas banner to immediately restore all 8 widgets to their default layout.</li>
                </ul>
              </section>
            </div>

            <div className="p-3.5 bg-[var(--theme-bg-subtle)] border-t border-[var(--theme-border)] flex justify-end">
              <button
                onClick={() => setIsWikiOpen(false)}
                className="px-4 py-2 rounded bg-[#860038] hover:bg-[#9e0e47] text-white font-sans font-bold text-xs cursor-pointer shadow-xs"
              >
                Close Wiki
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
