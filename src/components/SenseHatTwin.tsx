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
  Gamepad2,
  Trophy,
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

// Tic-Tac-Toe 3x3 cell coordinate mapping on the 8x8 matrix
const TTT_CELLS: [number, number][][] = [
  [[0,0],[1,0],[0,1],[1,1]], [[3,0],[4,0],[3,1],[4,1]], [[6,0],[7,0],[6,1],[7,1]],
  [[0,3],[1,3],[0,4],[1,4]], [[3,3],[4,3],[3,4],[4,4]], [[6,3],[7,3],[6,4],[7,4]],
  [[0,6],[1,6],[0,7],[1,7]], [[3,6],[4,6],[3,7],[4,7]], [[6,6],[7,6],[6,7],[7,7]],
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
  onOpenDiagnostics,
}: SenseHatTwinProps) {
  const [selectedColor, setSelectedColor] = useState<RgbColor>([255, 0, 0]);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [tempInput, setTempInput] = useState(sensors.temperature);
  const [humidityInput, setHumidityInput] = useState(sensors.humidity);
  const [pressureInput, setPressureInput] = useState(sensors.pressure);
  const [activeHighlight, setActiveHighlight] = useState<JoystickDirection | null>(null);
  const [activeActionState, setActiveActionState] = useState<JoystickAction | null>(null);

  // Dedicated Interactive On-Canvas Tic-Tac-Toe Game Mode
  const [isTttMode, setIsTttMode] = useState(false);
  const [tttBoard, setTttBoard] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0]); // 0=empty, 1=X (Player), 2=O (AI)
  const [tttCursor, setTttCursor] = useState({ r: 1, c: 1 });
  const [tttStatus, setTttStatus] = useState<string>('Your Turn (X) — Use Joystick, Press OK to Place');
  const [tttScores, setTttScores] = useState({ player: 0, ai: 0, ties: 0 });
  const [tttGameOver, setTttGameOver] = useState(false);

  // Joystick press, hold, and release tracking
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeDirectionRef = useRef<JoystickDirection | null>(null);

  const isPhysicalLinked = selectedMode === 'emulation' && isSenseHatConnected;
  const isPartial = hardwareLinkStatus === 'partial';
  const isEmulationDisconnected = selectedMode === 'emulation' && !isSenseHatConnected;

  // Sync active visual highlight with incoming joystick events
  useEffect(() => {
    if (lastJoystick?.direction) {
      const raw = String(lastJoystick.direction).toLowerCase();
      const d = (raw === 'centre' || raw === 'center' || raw === 'enter' ? 'middle' : raw) as JoystickDirection;
      setActiveHighlight(d);
      setActiveActionState(lastJoystick.action);

      // Handle Tic-Tac-Toe moves if Game Mode is active
      if (isTttMode && !tttGameOver && (lastJoystick.action === 'press' || (lastJoystick.action as string) === 'pressed')) {
        handleTttJoystickInput(d);
      }

      const timer = setTimeout(() => {
        if (!activeDirectionRef.current) {
          setActiveHighlight(null);
          setActiveActionState(null);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [lastJoystick?.direction, lastJoystick?.action, lastJoystick?.timestamp, isTttMode, tttGameOver, tttCursor, tttBoard]);

  // Handle pointer down (press & schedule hold)
  const handlePointerDown = (direction: JoystickDirection) => {
    const raw = String(direction).toLowerCase();
    const normDir = (raw === 'centre' || raw === 'center' || raw === 'enter' ? 'middle' : raw) as JoystickDirection;

    activeDirectionRef.current = normDir;
    setActiveHighlight(normDir);
    setActiveActionState('press');

    // Trigger immediate press event
    onTriggerJoystick(normDir, 'press');

    // Handle TTT if in game mode
    if (isTttMode && !tttGameOver) {
      handleTttJoystickInput(normDir);
    }

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    // Schedule transition to HOLD state after 400ms
    holdTimerRef.current = setTimeout(() => {
      if (activeDirectionRef.current === normDir) {
        setActiveActionState('hold');
        onTriggerJoystick(normDir, 'hold');

        holdIntervalRef.current = setInterval(() => {
          if (activeDirectionRef.current === normDir) {
            onTriggerJoystick(normDir, 'hold');
          }
        }, 150);
      }
    }, 400);
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

    const dirToRelease = direction || activeDirectionRef.current;
    if (dirToRelease) {
      const raw = String(dirToRelease).toLowerCase();
      const normDir = (raw === 'centre' || raw === 'center' || raw === 'enter' ? 'middle' : raw) as JoystickDirection;

      activeDirectionRef.current = null;
      setActiveHighlight(normDir);
      setActiveActionState('release');

      // Trigger release event
      onTriggerJoystick(normDir, 'release');

      setTimeout(() => {
        if (!activeDirectionRef.current) {
          setActiveHighlight(null);
          setActiveActionState(null);
        }
      }, 250);
    }
  };

  // Keyboard navigation support for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if student is typing in an input or code editor
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      let dir: JoystickDirection | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'up';
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'down';
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'left';
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'right';
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'm' || e.key === 'M') dir = 'middle';

      if (dir && !e.repeat && activeDirectionRef.current !== dir) {
        e.preventDefault();
        handlePointerDown(dir);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      let dir: JoystickDirection | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'up';
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'down';
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'left';
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'right';
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'm' || e.key === 'M') dir = 'middle';

      if (dir) {
        e.preventDefault();
        handlePointerUp(dir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTttMode, tttGameOver, tttCursor, tttBoard]);

  // Tic-Tac-Toe Game Logic & Matrix Renderer
  const renderTttMatrix = (boardState: number[], cursor: { r: number; c: number }, blink = true) => {
    const gridColor: RgbColor = [30, 45, 60];
    const p1Color: RgbColor = [0, 220, 255]; // Cyan X
    const p2Color: RgbColor = [255, 140, 0]; // Amber O
    const cursorColor: RgbColor = [255, 255, 255];

    const p: RgbColor[] = Array(64).fill([0, 0, 0]);

    // Draw grid divider lines
    for (let i = 0; i < 8; i++) {
      p[i * 8 + 2] = gridColor;
      p[i * 8 + 5] = gridColor;
      p[2 * 8 + i] = gridColor;
      p[5 * 8 + i] = gridColor;
    }

    // Draw board marks
    boardState.forEach((val, idx) => {
      const c = val === 1 ? p1Color : (val === 2 ? p2Color : null);
      if (c) {
        for (const [cx, cy] of TTT_CELLS[idx]) {
          p[cy * 8 + cx] = c;
        }
      }
    });

    // Draw cursor
    const cIdx = cursor.r * 3 + cursor.c;
    if (blink) {
      if (boardState[cIdx] === 0) {
        for (const [cx, cy] of TTT_CELLS[cIdx]) {
          p[cy * 8 + cx] = cursorColor;
        }
      } else {
        const [cx, cy] = TTT_CELLS[cIdx][0];
        p[cy * 8 + cx] = cursorColor;
      }
    }

    onSetMatrixPattern(p);
  };

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
    if (b.every((x) => x !== 0)) return { winner: 3, line: null }; // Tie
    return { winner: 0, line: null }; // Ongoing
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
    } else if (dir === 'middle') {
      const targetIdx = tttCursor.r * 3 + tttCursor.c;
      if (tttBoard[targetIdx] === 0) {
        const nextBoard = [...tttBoard];
        nextBoard[targetIdx] = 1; // Player mark X
        setTttBoard(nextBoard);
        renderTttMatrix(nextBoard, tttCursor, false);

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

        // Computer AI Turn
        setTttStatus('AI Thinking (O)...');
        setTimeout(() => {
          const empty = nextBoard.map((v, i) => (v === 0 ? i : -1)).filter((i) => i !== -1);
          if (empty.length > 0) {
            // Check if AI can win
            let aiPick = -1;
            for (const cell of empty) {
              const testB = [...nextBoard];
              testB[cell] = 2;
              if (checkTttWinner(testB).winner === 2) {
                aiPick = cell;
                break;
              }
            }
            // Check if AI needs to block player
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
            renderTttMatrix(nextBoard, tttCursor, true);

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

  const handlePixelClick = (x: number, y: number) => {
    if (isTttMode) {
      // In TTT mode, map pixel click to 3x3 cell
      let cell = -1;
      TTT_CELLS.forEach((coords, idx) => {
        if (coords.some(([cx, cy]) => cx === x && cy === y)) {
          cell = idx;
        }
      });
      if (cell !== -1) {
        const r = Math.floor(cell / 3);
        const c = cell % 3;
        setTttCursor({ r, c });
        handleTttJoystickInput('middle');
      }
      return;
    }
    onSetPixel(x, y, selectedColor);
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
      onSetMatrixPattern(p);
    } else if (type === 'smiley') {
      const p: RgbColor[] = Array(64).fill([0, 0, 0]);
      const y: RgbColor = [255, 200, 0];
      const b: RgbColor = [0, 0, 0];
      for (let i = 0; i < 64; i++) p[i] = y;
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
    <div className="bg-white border border-slate-300 rounded-none p-3 sm:p-5 shadow-xs flex flex-col gap-4 text-slate-800 min-w-0">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Raspberry Pi Sense HAT</span>
              <span className="text-xs sm:text-sm font-normal text-slate-500 font-mono">(8×8 RGB + 5-Way Stick)</span>
            </h3>
            {isPhysicalLinked ? (
              isPartial ? (
                <span className="text-xs px-2.5 py-0.5 rounded-none font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-none bg-amber-600 animate-pulse" />
                  <span>LED Matrix (/dev/fb1)</span>
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-none font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-none bg-emerald-600 animate-pulse" />
                  <span>Hardware Linked</span>
                </span>
              )
            ) : isEmulationDisconnected ? (
              <span className="text-xs px-2.5 py-0.5 rounded-none font-bold bg-rose-100 text-rose-800 border border-rose-300">
                Standby (Unlinked)
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-none font-bold bg-slate-100 text-slate-700 border border-slate-300">
                Digital Twin Mode
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Interactive 8×8 RGB LED matrix, accessible 5-way joystick, and calibrated telemetry
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowInjectModal(!showInjectModal)}
            className="px-3 py-1.5 rounded-none bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Inject test environmental sensor readings"
          >
            <Sliders className="w-4 h-4 text-slate-600" />
            <span>Test Sensors</span>
          </button>
        </div>
      </div>

      {/* TIC-TAC-TOE GAME BANNER IF ACTIVE */}
      {isTttMode && (
        <div className="p-3 bg-indigo-950 text-indigo-100 border-2 border-indigo-400 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-white">Sense HAT Tic-Tac-Toe Active:</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-indigo-800 text-cyan-300 border border-cyan-400">
                  Player (X: Cyan) vs AI (O: Amber)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200 mt-0.5 font-medium">{tttStatus}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <div className="text-xs font-mono px-2 py-1 bg-black/40 border border-white/20 text-white">
              Score: <span className="text-cyan-400 font-bold">{tttScores.player}W</span> · <span className="text-amber-400 font-bold">{tttScores.ai}L</span> · <span className="text-slate-300">{tttScores.ties}D</span>
            </div>
            <button
              onClick={handleResetTtt}
              className="px-2.5 py-1 text-xs font-bold font-mono bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-none cursor-pointer"
            >
              New Match
            </button>
            <button
              onClick={handleExitTtt}
              className="px-2.5 py-1 text-xs font-bold font-mono bg-rose-600 hover:bg-rose-500 text-white rounded-none cursor-pointer"
            >
              Exit ✕
            </button>
          </div>
        </div>
      )}

      {/* Partial Hardware Connection Banner */}
      {isPartial && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-none text-xs sm:text-sm text-amber-950 flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <strong className="font-bold text-amber-900 block text-sm">
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
              className="px-3 py-1.5 rounded-none bg-amber-300 hover:bg-amber-400 text-amber-950 font-bold text-xs shrink-0 transition-colors cursor-pointer"
            >
              Diagnostics
            </button>
          )}
        </div>
      )}

      {/* Sensor Perturbation Drawer */}
      {showInjectModal && (
        <div className="p-4 bg-slate-50 rounded-none border border-slate-300 flex flex-col gap-3.5 text-xs sm:text-sm animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between font-bold text-[#840038]">
            <span>Teacher Sensor Perturbation (Inject Test Values):</span>
            <button
              onClick={() => setShowInjectModal(false)}
              className="text-slate-500 hover:text-slate-900 cursor-pointer font-bold px-2 py-1"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-700 font-medium block mb-1">
                Temperature: <span className="font-mono font-bold text-slate-900 text-base">{tempInput}°C</span>
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="0.5"
                value={tempInput}
                onChange={(e) => setTempInput(parseFloat(e.target.value))}
                className="w-full accent-[#840038] h-2 bg-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">
                Humidity: <span className="font-mono font-bold text-slate-900 text-base">{humidityInput}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="95"
                step="1"
                value={humidityInput}
                onChange={(e) => setHumidityInput(parseFloat(e.target.value))}
                className="w-full accent-[#840038] h-2 bg-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">
                Pressure: <span className="font-mono font-bold text-slate-900 text-base">{pressureInput} hPa</span>
              </label>
              <input
                type="range"
                min="960"
                max="1040"
                step="1"
                value={pressureInput}
                onChange={(e) => setPressureInput(parseFloat(e.target.value))}
                className="w-full accent-[#840038] h-2 bg-slate-200"
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
              className="px-4 py-2 bg-[#840038] hover:bg-[#6c002e] text-white rounded-none font-bold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer active:scale-95"
            >
              Apply Injected Readings
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: 8x8 Matrix + Joystick & Gauges (Proper Crisp Hardware Corners) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: 8x8 LED Matrix Canvas */}
        <div
          style={{ backgroundColor: 'var(--sensehat-bezel-bg)', borderColor: 'var(--sensehat-bezel-border)' }}
          className="xl:col-span-7 flex flex-col items-center justify-center p-4 sm:p-5 border rounded-none shadow-inner transition-colors duration-200"
        >
          <div className="flex items-center justify-between w-full mb-3 text-xs sm:text-sm text-slate-300 px-1 font-mono">
            <span className="font-bold text-[var(--theme-text-main)]">
              {isTttMode ? '8×8 Matrix · Tic-Tac-Toe Arena' : '8×8 RGB LED Matrix'}
            </span>
            <span className="text-xs text-[var(--theme-accent)] font-bold">
              {hoveredPixel
                ? `Pixel [${hoveredPixel.x}, ${hoveredPixel.y}]`
                : isTttMode
                ? `Cursor: Cell (${tttCursor.r}, ${tttCursor.c})`
                : isPhysicalLinked
                ? 'Interactive (/dev/fb1)'
                : 'Digital Twin'}
            </span>
          </div>

          {/* 8x8 Grid Canvas with Proper Corners */}
          <div
            style={{ backgroundColor: 'var(--sensehat-grid-bg)', borderColor: 'var(--theme-border)' }}
            className="p-3 sm:p-4 rounded-none border shadow-md transition-colors duration-200"
          >
            <div className="grid grid-cols-8 gap-2 sm:gap-2.5">
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
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-none border transition-transform flex items-center justify-center cursor-pointer ${
                      isOff
                        ? 'border-white/10 hover:border-[var(--theme-accent)] hover:scale-105'
                        : 'border-white/30 hover:scale-110 active:scale-95'
                    }`}
                  >
                    <span className="sr-only">Pixel {x},{y}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette & Preset Controls (Large Hit targets) */}
          <div className="w-full mt-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">Color:</span>
              <div className="flex items-center gap-1.5">
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
                      className={`w-5 h-5 rounded-none border transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-white scale-110 border-white'
                          : 'border-slate-500 hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tic-Tac-Toe Game Mode Toggle */}
              <button
                onClick={isTttMode ? handleExitTtt : handleStartTtt}
                className={`px-3 py-1.5 rounded-none font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isTttMode
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-xs'
                }`}
                title="Play Tic-Tac-Toe directly on the Sense HAT matrix"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>{isTttMode ? 'Exit Game' : '🎮 Tic-Tac-Toe'}</span>
              </button>

              <button
                onClick={() => onClearMatrix()}
                className="px-3 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 flex items-center gap-1.5 transition-colors text-xs sm:text-sm font-bold cursor-pointer shadow-xs"
                title="Clear matrix"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => loadPresetPattern('raspberry')}
                  className="px-2.5 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors cursor-pointer text-xs font-bold"
                  title="Raspberry Pi Logo"
                >
                  Pi
                </button>
                <button
                  onClick={() => loadPresetPattern('smiley')}
                  className="px-2.5 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors cursor-pointer text-xs font-bold"
                  title="Smiley Face"
                >
                  Smile
                </button>
                <button
                  onClick={() => loadPresetPattern('rainbow')}
                  className="px-2.5 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors cursor-pointer text-xs font-bold"
                  title="Rainbow Spectrum"
                >
                  Rainbow
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: 5-Way Joystick & Real-Time Sensors */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Accessible 5-Way Keypad / Joystick Controller (Large Targets for Motor Skills) */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-none flex flex-col gap-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#840038]" />
                <span>5-Way Sense HAT Joystick</span>
              </span>
              <span className="text-xs text-slate-600 font-bold font-mono">
                Press · Hold · Release
              </span>
            </div>

            {/* 5-Way Joystick Status Banner */}
            <div className="p-3 rounded-none bg-white border border-slate-300 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Event:</span>
                {lastJoystick ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-none font-mono text-xs sm:text-sm font-bold uppercase bg-slate-900 text-white">
                      {String(lastJoystick.direction).toLowerCase() === 'centre' || String(lastJoystick.direction).toLowerCase() === 'enter' || String(lastJoystick.direction).toLowerCase() === 'middle' ? 'MIDDLE' : lastJoystick.direction.toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-none font-mono text-xs sm:text-sm font-bold uppercase transition-all ${
                        lastJoystick.action === 'release'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : lastJoystick.action === 'hold'
                          ? 'bg-amber-100 text-amber-950 border border-amber-300 animate-pulse'
                          : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
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
                  <span className="px-2.5 py-1 rounded-none font-mono text-xs sm:text-sm text-slate-500 bg-slate-100">
                    IDLE (Ready)
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono hidden sm:inline font-medium">
                Arrows &amp; Enter/Space
              </span>
            </div>

            {/* Interactive Spacious D-Pad Controller (Bigger targets for motor skills) */}
            <div className="flex items-center justify-center py-2">
              <div className="grid grid-cols-3 gap-2.5 w-56 h-56 p-3 bg-slate-200 border-2 border-slate-400 rounded-none relative shadow-inner">
                <div />
                {/* UP BUTTON */}
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
                  className={`rounded-none p-2 text-2xl font-black transition-all border-2 cursor-pointer select-none touch-none flex items-center justify-center shadow-xs ${
                    activeHighlight === 'up'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 shadow-inner'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 shadow-inner animate-pulse'
                        : 'bg-[#840038] text-white border-[#840038] scale-95 shadow-inner'
                      : 'bg-white text-slate-900 border-slate-400 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick UP (Click, Hold or Release — ArrowUp)"
                >
                  ▲
                </button>
                <div />

                {/* LEFT BUTTON */}
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
                  className={`rounded-none p-2 text-2xl font-black transition-all border-2 cursor-pointer select-none touch-none flex items-center justify-center shadow-xs ${
                    activeHighlight === 'left'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 shadow-inner'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 shadow-inner animate-pulse'
                        : 'bg-[#840038] text-white border-[#840038] scale-95 shadow-inner'
                      : 'bg-white text-slate-900 border-slate-400 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick LEFT (Click, Hold or Release — ArrowLeft)"
                >
                  ◀
                </button>

                {/* MIDDLE / ENTER BUTTON */}
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
                  className={`rounded-none p-2 text-sm font-black transition-all border-2 cursor-pointer select-none touch-none flex flex-col items-center justify-center shadow-xs ${
                    activeHighlight === 'middle' || activeHighlight === 'centre'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 ring-2 ring-rose-300'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 ring-2 ring-amber-300 animate-pulse'
                        : 'bg-emerald-600 text-white border-emerald-700 scale-95 ring-2 ring-emerald-300'
                      : 'bg-amber-200 text-amber-950 border-amber-400 hover:bg-amber-300 active:scale-95'
                  }`}
                  title="Joystick MIDDLE PRESS (Click, Hold or Release — Enter / Space / M)"
                >
                  <span className="text-xs sm:text-sm font-black leading-tight">
                    {activeHighlight === 'middle' && activeActionState === 'hold'
                      ? 'HOLD'
                      : activeHighlight === 'middle' && activeActionState === 'release'
                      ? 'RELEASE'
                      : 'OK'}
                  </span>
                  <span className="text-[10px] opacity-80 font-mono font-bold">
                    ENTER
                  </span>
                </button>

                {/* RIGHT BUTTON */}
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
                  className={`rounded-none p-2 text-2xl font-black transition-all border-2 cursor-pointer select-none touch-none flex items-center justify-center shadow-xs ${
                    activeHighlight === 'right'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 shadow-inner'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 shadow-inner animate-pulse'
                        : 'bg-[#840038] text-white border-[#840038] scale-95 shadow-inner'
                      : 'bg-white text-slate-900 border-slate-400 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick RIGHT (Click, Hold or Release — ArrowRight)"
                >
                  ▶
                </button>

                <div />
                {/* DOWN BUTTON */}
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
                  className={`rounded-none p-2 text-2xl font-black transition-all border-2 cursor-pointer select-none touch-none flex items-center justify-center shadow-xs ${
                    activeHighlight === 'down'
                      ? activeActionState === 'release'
                        ? 'bg-rose-600 text-white border-rose-700 scale-95 shadow-inner'
                        : activeActionState === 'hold'
                        ? 'bg-amber-600 text-white border-amber-700 scale-95 shadow-inner animate-pulse'
                        : 'bg-[#840038] text-white border-[#840038] scale-95 shadow-inner'
                      : 'bg-white text-slate-900 border-slate-400 hover:bg-slate-100 active:scale-95'
                  }`}
                  title="Joystick DOWN (Click, Hold or Release — ArrowDown)"
                >
                  ▼
                </button>
                <div />
              </div>
            </div>
          </div>

          {/* Environmental Sensor Telemetry Readouts (Large Fonts & Sharp Hardware Corners) */}
          <div className="grid grid-cols-3 gap-3">
            {/* Temperature Readout (Ambient Calibrated) */}
            <div className="p-3 sm:p-4 bg-white border border-slate-300 rounded-none shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 text-xs sm:text-sm font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-rose-600" />
                  <span>Ambient Temp</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-950">
                  {sensors.temperature.toFixed(1)}
                </span>
                <span className="text-sm font-mono font-bold text-slate-600">°C</span>
              </div>
              <div className="text-xs text-slate-600 font-mono font-bold">
                {((sensors.temperature * 9) / 5 + 32).toFixed(1)}°F (Ambient)
              </div>
            </div>

            {/* Humidity */}
            <div className="p-3 sm:p-4 bg-white border border-slate-300 rounded-none shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 text-xs sm:text-sm font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-cyan-600" />
                  <span>Humidity</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-950">
                  {sensors.humidity.toFixed(1)}
                </span>
                <span className="text-sm font-mono font-bold text-slate-600">%</span>
              </div>
              <div className="text-xs text-slate-600 font-mono font-bold">
                {sensors.isSimulated ? 'Simulated' : 'HTS221'}
              </div>
            </div>

            {/* Pressure */}
            <div className="p-3 sm:p-4 bg-white border border-slate-300 rounded-none shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 text-xs sm:text-sm font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-amber-600" />
                  <span>Pressure</span>
                </span>
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-slate-950">
                  {sensors.pressure.toFixed(1)}
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">hPa</span>
              </div>
              <div className="text-xs text-slate-600 font-mono font-bold">
                {sensors.isSimulated ? 'Simulated' : 'LPS25H'}
              </div>
            </div>
          </div>

          {/* IMU Motion Telemetry */}
          <div className="p-3.5 bg-white border border-slate-300 rounded-none text-xs sm:text-sm font-mono text-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-2 text-slate-700 font-bold">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#840038]" />
                <span>9-DOF IMU ({sensors.isSimulated ? 'Simulated' : 'LSM9DS1'})</span>
              </span>
              <span className="flex items-center gap-1 text-slate-700">
                <Compass className="w-4 h-4 text-amber-600" />
                <span>Heading: {sensors.compassHeading.toFixed(1)}°</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block mb-0.5">
                  Accelerometer (g):
                </span>
                <div className="text-slate-950 font-bold font-mono">
                  {`X: ${sensors.accelerometer.x.toFixed(2)} Y: ${sensors.accelerometer.y.toFixed(2)} Z: ${sensors.accelerometer.z.toFixed(2)}`}
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-0.5">
                  Gyroscope (°/s):
                </span>
                <div className="text-slate-950 font-bold font-mono">
                  {`Roll: ${sensors.gyroscope.x.toFixed(1)} Pitch: ${sensors.gyroscope.y.toFixed(1)}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
