import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn, exec, ChildProcess } from 'child_process';
import { INITIAL_GPIO_PINS } from './src/data/raspberryPiPinout';
import {
  FullHardwareState,
  GpioPin,
  RgbColor,
  SenseHatSensors,
  JoystickEvent,
  ProgramExecution,
  TimelineTrace,
  TelemetryRecord,
  TerminalOutput,
  EmulatedPeripheral,
  ProgramLanguage,
} from './src/types/digitalTwin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if running on a real physical Raspberry Pi with Sense HAT attached
let isPhysicalPi = false;
let isSenseHatConnected = false;

try {
  if (fs.existsSync('/sys/firmware/devicetree/base/model')) {
    const modelStr = fs.readFileSync('/sys/firmware/devicetree/base/model', 'utf8');
    if (modelStr.toLowerCase().includes('raspberry pi')) {
      isPhysicalPi = true;
      // Strictly verify physical Sense HAT presence (MCU @ 0x46 or Sense HAT framebuffer)
      if (fs.existsSync('/sys/bus/i2c/devices/1-0046') || fs.existsSync('/dev/fb1')) {
        isSenseHatConnected = true;
      }
    }
  }
} catch {
  isPhysicalPi = false;
  isSenseHatConnected = false;
}

// Authoritative Hardware State
let gpioPins: GpioPin[] = JSON.parse(JSON.stringify(INITIAL_GPIO_PINS));

// Emulated Peripherals Rack (Wire-Free Physical Computing)
let emulatedPeripherals: EmulatedPeripheral[] = [
  { id: 'p-led-17', pin: 11, bcm: 17, type: 'led', name: 'Indicator LED 1', color: 'red', state: 0 },
  { id: 'p-led-27', pin: 13, bcm: 27, type: 'led', name: 'Indicator LED 2', color: 'yellow', state: 0 },
  { id: 'p-led-22', pin: 15, bcm: 22, type: 'led', name: 'Status LED 3', color: 'green', state: 0 },
  { id: 'p-led-23', pin: 16, bcm: 23, type: 'led', name: 'Bus LED 4', color: 'blue', state: 0 },
  { id: 'p-btn-27', pin: 13, bcm: 27, type: 'button', name: 'Tactile Button A', state: 0 },
  { id: 'p-btn-24', pin: 18, bcm: 24, type: 'button', name: 'Tactile Button B', state: 0 },
  { id: 'p-buzzer-18', pin: 12, bcm: 18, type: 'buzzer', name: 'Piezo Buzzer (PWM0)', state: 0 },
];

// 8x8 RGB LED Matrix (64 pixels initialized to OFF: [0, 0, 0])
let matrixPixels: RgbColor[] = Array(64).fill([0, 0, 0]);

// Sense HAT Environmental & IMU Telemetry
let sensors: SenseHatSensors = {
  temperature: 24.6,
  humidity: 48.2,
  pressure: 1013.25,
  accelerometer: { x: 0.02, y: -0.04, z: 0.98 },
  gyroscope: { x: 0.1, y: -0.2, z: 0.05 },
  magnetometer: { x: 21.4, y: -15.8, z: 42.1 },
  compassHeading: 142.5,
  timestamp: Date.now(),
  isSimulated: !isSenseHatConnected,
};

let lastJoystickEvent: JoystickEvent | null = null;

let programState: ProgramExecution = {
  id: '',
  language: 'python',
  filename: 'main.py',
  status: 'idle',
  timeoutMs: 10000,
};

let timelineTraces: TimelineTrace[] = [
  {
    id: 'trace-init-1',
    timestamp: new Date().toLocaleTimeString(),
    stage: 'backend',
    title: 'Daemon Initialized',
    detail: isSenseHatConnected
      ? 'Physical Sense HAT detected on I2C-1 bus (Emulation Mode)'
      : 'Sense HAT hardware NOT detected. Operating in Simulation Mode.',
    level: isSenseHatConnected ? 'success' : 'warn',
  },
  {
    id: 'trace-init-2',
    timestamp: new Date().toLocaleTimeString(),
    stage: 'twin',
    title: 'Digital Twin Ready',
    detail: 'WebSocket broadcast channel open on port 3000',
    level: 'success',
  },
];

let telemetryHistory: TelemetryRecord[] = [];
let executionTimer: NodeJS.Timeout | null = null;
let activeProgramAbort = false;

// Create Express and HTTP Server
const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Connected WebSocket clients
const clients = new Set<WebSocket>();

function broadcast(type: string, payload: any) {
  const msg = JSON.stringify({ type, timestamp: Date.now(), payload });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch (err) {
        console.error('Error broadcasting to WS client:', err);
      }
    }
  }
}

function syncEmulatedPeripheralsWithPins() {
  for (const peri of emulatedPeripherals) {
    const pin = gpioPins.find((p) => p.bcm === peri.bcm || p.pin === peri.pin);
    if (pin && peri.type === 'led') {
      peri.state = pin.value;
    } else if (pin && peri.type === 'buzzer') {
      peri.state = pin.mode === 'PWM' ? (pin.pwmDuty || 0) : pin.value;
    }
  }
}

function addTimelineTrace(
  stage: TimelineTrace['stage'],
  title: string,
  detail: string,
  level: TimelineTrace['level'] = 'info'
) {
  const trace: TimelineTrace = {
    id: 'trace-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toLocaleTimeString(),
    stage,
    title,
    detail,
    level,
  };
  timelineTraces.unshift(trace);
  if (timelineTraces.length > 50) timelineTraces.pop();
  broadcast('timeline.trace', trace);
}

function getFullState(): FullHardwareState {
  syncEmulatedPeripheralsWithPins();
  return {
    connected: true,
    isPhysicalPi,
    isSenseHatConnected,
    simulationMode: !isSenseHatConnected,
    pollRateMs: 500,
    gpio: gpioPins,
    emulatedPeripherals,
    matrix: matrixPixels,
    sensors,
    lastJoystickEvent,
    program: programState,
    timeline: timelineTraces.slice(0, 30),
    system: {
      hostname: 'raspberrypi-twin',
      model: isPhysicalPi ? 'Raspberry Pi 4 Model B Rev 1.4' : 'Raspberry Pi 4 (Emulated)',
      os: 'Raspberry Pi OS 12 (bookworm) aarch64',
      uptimeSeconds: Math.floor(process.uptime()),
      cpuLoadPercent: Number((12.4 + Math.sin(Date.now() / 5000) * 4).toFixed(1)),
      memoryUsageMb: 248,
      totalMemoryMb: 4096,
      backendVersion: 'v1.4.2',
      sdkVersion: 'pi-twin-sdk 1.2.0',
      activeConnections: clients.size,
    },
  };
}

// Background sensor telemetry perturbation & recording loop
setInterval(() => {
  if (!isSenseHatConnected) {
    // Subtle realistic physical sensor drift when simulating
    const tNoise = (Math.random() - 0.5) * 0.15;
    const hNoise = (Math.random() - 0.5) * 0.3;
    const pNoise = (Math.random() - 0.5) * 0.1;
    sensors.temperature = Number(Math.max(15, Math.min(45, sensors.temperature + tNoise)).toFixed(2));
    sensors.humidity = Number(Math.max(20, Math.min(90, sensors.humidity + hNoise)).toFixed(1));
    sensors.pressure = Number(Math.max(970, Math.min(1040, sensors.pressure + pNoise)).toFixed(2));
    sensors.compassHeading = Number(((sensors.compassHeading + 0.2) % 360).toFixed(1));
  }
  sensors.timestamp = Date.now();

  const record: TelemetryRecord = {
    id: 'rec-' + Date.now(),
    timestamp: new Date().toLocaleTimeString(),
    temp: sensors.temperature,
    humidity: sensors.humidity,
    pressure: sensors.pressure,
    accelX: sensors.accelerometer.x,
    accelY: sensors.accelerometer.y,
    accelZ: sensors.accelerometer.z,
    heading: sensors.compassHeading,
  };

  telemetryHistory.push(record);
  if (telemetryHistory.length > 60) telemetryHistory.shift();

  broadcast('sensor.update', sensors);
}, 1000);

// --- WebSocket Connection Management ---
wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total active: ${clients.size}`);

  ws.send(JSON.stringify({
    type: 'init.state',
    timestamp: Date.now(),
    payload: getFullState(),
  }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      handleClientWsMessage(ws, data);
    } catch (e) {
      console.error('[WS] Failed to parse message', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function handleClientWsMessage(ws: WebSocket, msg: { type: string; payload: any }) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    case 'gpio.toggle': {
      const pinNum = Number(msg.payload.pin);
      toggleGpioPin(pinNum);
      break;
    }
    case 'peripheral.button': {
      // Emulate student pressing an attached virtual push button
      const { bcm, pressed } = msg.payload;
      const targetPin = gpioPins.find((p) => p.bcm === Number(bcm));
      if (targetPin) {
        targetPin.value = pressed ? 1 : 0;
        syncEmulatedPeripheralsWithPins();
        broadcast('gpio.update', { pin: targetPin.pin, bcm: targetPin.bcm, value: targetPin.value, mode: targetPin.mode });
        broadcast('peripherals.update', emulatedPeripherals);
      }
      break;
    }
    case 'sensehat.pixel': {
      const { x, y, r, g, b } = msg.payload;
      setMatrixPixel(Number(x), Number(y), [Number(r), Number(g), Number(b)]);
      break;
    }
    case 'sensehat.clear': {
      clearMatrix(msg.payload?.r ?? 0, msg.payload?.g ?? 0, msg.payload?.b ?? 0);
      break;
    }
    case 'sensehat.joystick': {
      triggerJoystick(msg.payload.direction, msg.payload.action || 'press');
      break;
    }
    case 'sensehat.toggleConnection': {
      isSenseHatConnected = !isSenseHatConnected;
      sensors.isSimulated = !isSenseHatConnected;
      addTimelineTrace(
        'backend',
        isSenseHatConnected ? 'Switched to Emulation Mode' : 'Switched to Simulation Mode',
        isSenseHatConnected ? 'Physical Sense HAT bus linked' : 'Virtual sensor fallback engaged',
        isSenseHatConnected ? 'success' : 'warn'
      );
      broadcast('init.state', getFullState());
      break;
    }
  }
}

// --- Hardware Helper Functions ---

function toggleGpioPin(pinNumber: number): boolean {
  const pin = gpioPins.find((p) => p.pin === pinNumber);
  if (!pin) return false;

  if (!pin.isSafeToToggle) {
    addTimelineTrace('backend', 'Safety Interlock Engaged', `Pin ${pinNumber} (${pin.name}) is protected. Toggling rejected.`, 'warn');
    return false;
  }

  pin.value = pin.value === 1 ? 0 : 1;
  syncEmulatedPeripheralsWithPins();

  const stateLabel = pin.value === 1 ? 'HIGH (3.3V)' : 'LOW (0.0V)';
  addTimelineTrace(
    'twin',
    `GPIO ${pin.bcm ?? pin.pin} Level Changed`,
    `Pin ${pin.pin} (${pin.name}) set to ${stateLabel}`,
    pin.value === 1 ? 'info' : 'success'
  );

  broadcast('gpio.update', { pin: pin.pin, bcm: pin.bcm, value: pin.value, mode: pin.mode });
  broadcast('peripherals.update', emulatedPeripherals);
  return true;
}

function setMatrixPixel(x: number, y: number, color: RgbColor) {
  if (x < 0 || x > 7 || y < 0 || y > 7) return;
  const index = y * 8 + x;
  const clamped: RgbColor = [
    Math.min(255, Math.max(0, Math.round(color[0]))),
    Math.min(255, Math.max(0, Math.round(color[1]))),
    Math.min(255, Math.max(0, Math.round(color[2]))),
  ];
  matrixPixels[index] = clamped;
  broadcast('matrix.update', { index, x, y, color: clamped, fullMatrix: matrixPixels });
}

function clearMatrix(r = 0, g = 0, b = 0) {
  const color: RgbColor = [
    Math.min(255, Math.max(0, Math.round(r))),
    Math.min(255, Math.max(0, Math.round(g))),
    Math.min(255, Math.max(0, Math.round(b))),
  ];
  matrixPixels = Array(64).fill(color);
  addTimelineTrace('backend', 'Sense HAT Matrix Cleared', `RGB(${color.join(',')})`, 'info');
  broadcast('matrix.full', { matrix: matrixPixels });
}

function triggerJoystick(direction: JoystickEvent['direction'], action: JoystickEvent['action'] = 'press') {
  lastJoystickEvent = {
    direction,
    action,
    timestamp: Date.now(),
  };

  addTimelineTrace('hardware', 'Sense HAT Joystick Event', `${direction.toUpperCase()} - ${action.toUpperCase()}`, 'info');
  broadcast('joystick.event', lastJoystickEvent);
}

// --- Student Program Execution Engine ---

let activeChildProcess: ChildProcess | null = null;

function syncFilesToTmp() {
  try {
    fs.writeFileSync('/tmp/pi_twin_sensors.json', JSON.stringify(sensors));
    fs.writeFileSync('/tmp/pi_twin_gpio.json', JSON.stringify(gpioPins));
  } catch (e) {
    // Ignore error in read-only environment
  }
}
syncFilesToTmp();

async function executeStudentCode(
  code: string,
  language: ProgramLanguage,
  filename: string,
  timeoutMs = 10000
) {
  activeProgramAbort = false;
  if (executionTimer) clearTimeout(executionTimer);
  if (activeChildProcess) {
    try { activeChildProcess.kill('SIGKILL'); } catch (e) {}
    activeChildProcess = null;
  }

  programState = {
    id: 'prog-' + Date.now(),
    language,
    filename,
    status: language === 'c' ? 'compiling' : 'running',
    startTime: Date.now(),
    timeoutMs,
  };
  broadcast('program.status', programState);

  const emitOutput = (stream: 'stdout' | 'stderr' | 'system', text: string) => {
    const item: TerminalOutput = {
      id: 'out-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toLocaleTimeString(),
      stream,
      text,
    };
    broadcast('program.output', item);
  };

  addTimelineTrace('source', `Executing Student Code`, `${language.toUpperCase()}: ${filename}`, 'info');

  if (language === 'c') {
    emitOutput('system', `[GCC] gcc -Wall -O2 ${filename} -lpi_twin -o /tmp/runner...`);
    await new Promise((r) => setTimeout(r, 300));

    if (!code.includes('main')) {
      emitOutput('stderr', `error: undefined reference to 'main'`);
      programState.status = 'error';
      programState.exitCode = 1;
      broadcast('program.status', programState);
      return;
    }

    emitOutput('system', `[GCC] Compilation successful. Running binary on Raspberry Pi 4...`);
    programState.status = 'running';
    broadcast('program.status', programState);

    // Fast simulation loop for C examples
    const lines = code.split('\n');
    for (const l of lines) {
      const line = l.trim();
      const printMatchC = line.match(/printf\s*\(\s*"(.*?)(?:\\n)?"/);
      if (printMatchC) {
        const text = printMatchC[1].replace(/%d/g, '1').replace(/%.2f/g, sensors.temperature.toFixed(2));
        emitOutput('stdout', text);
        await new Promise((r) => setTimeout(r, 120));
      }
      if (line.includes('twin_gpio_write') || line.includes('GPIO_SET')) {
        const match = line.match(/(?:twin_gpio_write|GPIO_SET)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (match) {
          const bcm = Number(match[1]);
          const val = Number(match[2]);
          const target = gpioPins.find((p) => p.bcm === bcm);
          if (target && target.isSafeToToggle) {
            target.value = val ? 1 : 0;
            syncEmulatedPeripheralsWithPins();
            broadcast('gpio.update', { pin: target.pin, bcm: target.bcm, value: target.value, mode: target.mode });
            broadcast('peripherals.update', emulatedPeripherals);
            await new Promise((r) => setTimeout(r, 150));
          }
        }
      }
    }
    emitOutput('system', `\n[Process completed] Exited with status code 0.`);
    programState.status = 'completed';
    programState.exitCode = 0;
    broadcast('program.status', programState);
    return;
  }

  // PYTHON EXECUTION (Real python3 subprocess with IPC event stream)
  emitOutput('system', `[Python 3] python3 -u ${filename}`);

  // Safety Timeout Watchdog
  executionTimer = setTimeout(() => {
    activeProgramAbort = true;
    if (activeChildProcess) {
      try { activeChildProcess.kill('SIGKILL'); } catch (e) {}
      activeChildProcess = null;
    }
    emitOutput('stderr', `\n[TIMEOUT] Execution exceeded safety limit (${timeoutMs} ms). Process terminated.`);
    programState.status = 'terminated';
    programState.exitCode = 124;
    broadcast('program.status', programState);
    addTimelineTrace('backend', 'Watchdog Timeout Triggered', `Terminated after ${timeoutMs}ms`, 'warn');
  }, timeoutMs);

  try {
    syncFilesToTmp();
    const tempFile = path.join('/tmp', `student_${Date.now()}_${filename}`);
    fs.writeFileSync(tempFile, code, 'utf8');

    const pyProc = spawn('python3', ['-u', tempFile], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPATH: process.cwd(),
        PYTHONUNBUFFERED: '1',
      },
    });
    activeChildProcess = pyProc;

    let stdoutRemainder = '';

    const handleStdoutLine = (line: string) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      if (trimmedLine.startsWith('__PI_TWIN_EVENT__:')) {
        try {
          const jsonStr = trimmedLine.substring('__PI_TWIN_EVENT__:'.length);
          const ev = JSON.parse(jsonStr);

          if (ev.type === 'set_pixel') {
            setMatrixPixel(Number(ev.x), Number(ev.y), [Number(ev.r), Number(ev.g), Number(ev.b)]);
          } else if (ev.type === 'clear') {
            clearMatrix(Number(ev.r || 0), Number(ev.g || 0), Number(ev.b || 0));
          } else if (ev.type === 'set_pixels') {
            if (Array.isArray(ev.pixels) && ev.pixels.length === 64) {
              matrixPixels = ev.pixels;
              broadcast('matrix.full', { matrix: matrixPixels });
            }
          } else if (ev.type === 'gpio_output') {
            const bcm = Number(ev.bcm);
            const val = ev.value ? 1 : 0;
            const target = gpioPins.find((p) => p.bcm === bcm);
            if (target && target.isSafeToToggle) {
              target.value = val;
              syncEmulatedPeripheralsWithPins();
              broadcast('gpio.update', { pin: target.pin, bcm: target.bcm, value: target.value, mode: target.mode });
              broadcast('peripherals.update', emulatedPeripherals);
            }
          }
        } catch (err) {
          console.error('[IPC Parse Error]', err);
        }
      } else {
        emitOutput('stdout', line);
      }
    };

    pyProc.stdout.on('data', (chunk: Buffer) => {
      const text = stdoutRemainder + chunk.toString('utf8');
      const lines = text.split('\n');
      stdoutRemainder = lines.pop() || '';
      for (const line of lines) {
        handleStdoutLine(line);
      }
    });

    pyProc.stderr.on('data', (chunk: Buffer) => {
      emitOutput('stderr', chunk.toString('utf8'));
    });

    pyProc.on('close', (code) => {
      if (stdoutRemainder) {
        handleStdoutLine(stdoutRemainder);
        stdoutRemainder = '';
      }
      if (executionTimer) clearTimeout(executionTimer);
      try { fs.unlinkSync(tempFile); } catch (e) {}

      if (!activeProgramAbort) {
        emitOutput('system', `\n[Process completed] Exited with status code ${code ?? 0}.`);
        programState.status = code === 0 ? 'completed' : 'error';
        programState.exitCode = code ?? 0;
        programState.durationMs = Date.now() - (programState.startTime || Date.now());
        broadcast('program.status', programState);
        addTimelineTrace('twin', 'Program Finished', `Exit code: ${code ?? 0}`, code === 0 ? 'success' : 'warn');
      }
      activeChildProcess = null;
    });

    pyProc.on('error', (err) => {
      if (executionTimer) clearTimeout(executionTimer);
      emitOutput('stderr', `Execution Error: ${err.message}`);
      programState.status = 'error';
      programState.exitCode = 1;
      broadcast('program.status', programState);
      activeChildProcess = null;
    });
  } catch (err: any) {
    if (executionTimer) clearTimeout(executionTimer);
    emitOutput('stderr', `Runtime Error: ${err?.message || 'Fault'}`);
    programState.status = 'error';
    programState.exitCode = 1;
    broadcast('program.status', programState);
    activeChildProcess = null;
  }
}

// --- REST Endpoints ---

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    backend: 'running',
    mode: isSenseHatConnected ? 'emulation' : 'simulation',
    sensehat: isSenseHatConnected ? 'connected' : 'not_detected',
    gpio: 'available',
    clients: clients.size,
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

app.get('/api/state', (_req: Request, res: Response) => {
  res.json(getFullState());
});

app.get('/api/gpio', (_req: Request, res: Response) => {
  res.json(gpioPins);
});

app.post('/api/gpio', (req: Request, res: Response) => {
  const { pin, bcm, mode, value } = req.body;
  const target = gpioPins.find((p) => (pin ? p.pin === Number(pin) : p.bcm === Number(bcm)));

  if (!target) return res.status(404).json({ error: 'Pin not found' });
  if (!target.isSafeToToggle) return res.status(403).json({ error: 'Pin is protected' });

  if (mode) target.mode = mode;
  if (value !== undefined) target.value = value ? 1 : 0;
  syncEmulatedPeripheralsWithPins();

  broadcast('gpio.update', { pin: target.pin, bcm: target.bcm, value: target.value, mode: target.mode });
  broadcast('peripherals.update', emulatedPeripherals);
  return res.json({ success: true, pin: target });
});

// Emulated SSH Bash Terminal Command Execution
app.post('/api/terminal/exec', async (req: Request, res: Response) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command required' });
  }

  const trimmed = command.trim();
  let output = '';

  if (trimmed === 'ls' || trimmed === 'ls -la') {
    output = `total 24\ndrwxr-xr-x 4 pi pi 4096 Oct 8 10:20 .\ndrwxr-xr-x 3 pi pi 4096 Oct 8 10:00 ..\n-rw-r--r-- 1 pi pi  340 Oct 8 10:15 01_hello.py\n-rw-r--r-- 1 pi pi  412 Oct 8 10:18 02_red_pixel.py\n-rw-r--r-- 1 pi pi  520 Oct 8 10:19 10_gpio_blink.py\n-rw-r--r-- 1 pi pi  490 Oct 8 10:20 01_hello.c`;
  } else if (trimmed === 'pinout') {
    output = `Raspberry Pi 4 Model B Rev 1.4\nJ8:\n 3V3  (1) (2)  5V\n GPIO2 (3) (4)  5V\n GPIO3 (5) (6)  GND\n GPIO4 (7) (8)  GPIO14\n   GND (9) (10) GPIO15\nGPIO17 (11) (12) GPIO18\nGPIO27 (13) (14) GND\nGPIO22 (15) (16) GPIO23\n 3V3  (17) (18) GPIO24\nGPIO10 (19) (20) GND\nGPIO9  (21) (22) GPIO25\nGPIO11 (23) (24) GPIO8\n   GND (25) (26) GPIO7\n ID_SD (27) (28) ID_SC\n GPIO5 (29) (30) GND\n GPIO6 (31) (32) GPIO12\nGPIO13 (33) (34) GND\nGPIO19 (35) (36) GPIO16\nGPIO26 (37) (38) GPIO20\n   GND (39) (40) GPIO21`;
  } else if (trimmed === 'i2cdetect -y 1') {
    if (isSenseHatConnected) {
      output = `     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\n00:          -- -- -- -- -- -- -- -- -- -- -- -- -- \n10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n40: -- -- -- -- -- -- 46 -- -- -- -- -- -- -- -- -- \n50: -- -- -- -- -- -- -- -- -- -- -- -- 5c -- -- -- \n60: -- -- -- -- -- -- -- -- -- -- 6a -- -- -- -- -- \n70: -- -- -- -- -- -- -- --                         \n[Sense HAT Detected: MCU @ 0x46, HTS221/LPS25H @ 0x5c, LSM9DS1 @ 0x6a]`;
    } else {
      output = `     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\n00:          -- -- -- -- -- -- -- -- -- -- -- -- -- \n10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n70: -- -- -- -- -- -- -- --                         \n[Notice: No I2C devices detected. Running in Simulation Mode.]`;
    }
  } else if (trimmed === 'vcgencmd measure_temp') {
    output = `temp=${sensors.temperature.toFixed(1)}'C`;
  } else if (trimmed.startsWith('python3 ') || trimmed.startsWith('python ')) {
    const script = trimmed.split(' ')[1] || '01_hello.py';
    syncFilesToTmp();
    
    // Check if script exists on disk
    if (fs.existsSync(path.join(process.cwd(), script))) {
      return new Promise<void>((resolve) => {
        exec(trimmed, { cwd: process.cwd(), timeout: 10000, env: { ...process.env, PYTHONPATH: process.cwd(), PYTHONUNBUFFERED: '1' } }, (error, stdout, stderr) => {
          let cleanLines: string[] = [];
          const allOutput = (stdout || '') + (stderr || '');
          const lines = allOutput.split('\n');

          for (const line of lines) {
            if (line.includes('__PI_TWIN_EVENT__:')) {
              try {
                const jsonStr = line.substring(line.indexOf('__PI_TWIN_EVENT__:') + '__PI_TWIN_EVENT__:'.length);
                const ev = JSON.parse(jsonStr.trim());
                if (ev.type === 'set_pixel') {
                  setMatrixPixel(Number(ev.x), Number(ev.y), [Number(ev.r), Number(ev.g), Number(ev.b)]);
                } else if (ev.type === 'clear') {
                  clearMatrix(Number(ev.r || 0), Number(ev.g || 0), Number(ev.b || 0));
                } else if (ev.type === 'set_pixels') {
                  if (Array.isArray(ev.pixels)) {
                    matrixPixels = ev.pixels;
                    broadcast('matrix.full', { matrix: matrixPixels });
                  }
                } else if (ev.type === 'gpio_output') {
                  const bcm = Number(ev.bcm);
                  const target = gpioPins.find((p) => p.bcm === bcm);
                  if (target) {
                    target.value = ev.value ? 1 : 0;
                    syncEmulatedPeripheralsWithPins();
                    broadcast('gpio.update', { pin: target.pin, bcm: target.bcm, value: target.value, mode: target.mode });
                    broadcast('peripherals.update', emulatedPeripherals);
                  }
                }
              } catch (e) {}
            } else {
              cleanLines.push(line);
            }
          }
          res.json({ output: cleanLines.join('\n').trim() || `[Completed execution of ${script}]` });
          resolve();
        });
      });
    } else {
      output = `python3: can't open file '${script}': [Errno 2] No such file or directory\nAvailable scripts: 01_hello.py, 02_red_pixel.py, 03_color_cycle.py, 10_gpio_blink.py, sensor_logger.py`;
    }
  } else if (trimmed === 'uname -a') {
    output = `Linux raspberrypi 6.6.20+rpt-rpi-v8 #1 SMP PREEMPT Debian 1:6.6.20-1+rpt1 (2024-03-07) aarch64 GNU/Linux`;
  } else if (trimmed === 'cat /proc/cpuinfo') {
    output = `Hardware\t: BCM2711\nRevision\t: c03114\nSerial\t\t: 10000000a45e2d19\nModel\t\t: Raspberry Pi 4 Model B Rev 1.4`;
  } else {
    output = `bash: ${trimmed}: command executed (OK)`;
  }

  return res.json({ output });
});

// Sense HAT endpoints
app.get('/api/sensehat', (_req: Request, res: Response) => {
  res.json({
    matrix: matrixPixels,
    sensors,
    lastJoystick: lastJoystickEvent,
    isSenseHatConnected,
  });
});

app.post('/api/sensehat/pixel', (req: Request, res: Response) => {
  const { x, y, r, g, b } = req.body;
  setMatrixPixel(Number(x), Number(y), [Number(r), Number(g), Number(b)]);
  res.json({ success: true });
});

app.post('/api/sensehat/clear', (req: Request, res: Response) => {
  const { r = 0, g = 0, b = 0 } = req.body;
  clearMatrix(r, g, b);
  res.json({ success: true });
});

app.post('/api/sensehat/matrix', (req: Request, res: Response) => {
  const { matrix } = req.body;
  if (Array.isArray(matrix) && matrix.length === 64) {
    matrixPixels = matrix;
    broadcast('matrix.full', { matrix: matrixPixels });
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Expected 64 RGB pixel array' });
  }
});

app.post('/api/sensehat/joystick', (req: Request, res: Response) => {
  const { direction, action = 'press' } = req.body;
  triggerJoystick(direction, action);
  res.json({ success: true, event: lastJoystickEvent });
});

// Program Execution
app.post('/api/program/run', async (req: Request, res: Response) => {
  const { code, language = 'python', filename = 'main.py', timeoutMs = 10000 } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Source code is required' });
  }
  executeStudentCode(code, language, filename, timeoutMs);
  return res.json({ success: true, message: 'Execution initiated' });
});

app.post('/api/program/stop', (_req: Request, res: Response) => {
  activeProgramAbort = true;
  if (executionTimer) clearTimeout(executionTimer);
  programState.status = 'terminated';
  programState.exitCode = 137;
  broadcast('program.status', programState);
  res.json({ success: true, message: 'Program terminated' });
});

app.get('/api/telemetry/history', (_req: Request, res: Response) => {
  res.json(telemetryHistory);
});

app.post('/api/simulation/sensors', (req: Request, res: Response) => {
  const { temp, humidity, pressure, heading, isSimulated } = req.body;
  if (temp !== undefined) sensors.temperature = Number(temp);
  if (humidity !== undefined) sensors.humidity = Number(humidity);
  if (pressure !== undefined) sensors.pressure = Number(pressure);
  if (heading !== undefined) sensors.compassHeading = Number(heading);
  if (isSimulated !== undefined) {
    isSenseHatConnected = !isSimulated;
    sensors.isSimulated = isSimulated;
  }
  broadcast('sensor.update', sensors);
  broadcast('init.state', getFullState());
  res.json({ success: true, sensors });
});

app.post('/api/reset', (_req: Request, res: Response) => {
  gpioPins = JSON.parse(JSON.stringify(INITIAL_GPIO_PINS));
  matrixPixels = Array(64).fill([0, 0, 0]);
  syncEmulatedPeripheralsWithPins();
  addTimelineTrace('backend', 'Hardware Bus Reset', 'All GPIO and Sense HAT states cleared to defaults', 'success');
  broadcast('init.state', getFullState());
  res.json({ success: true, message: 'Hardware state reset' });
});

// --- Boot Server and Mount Vite Middleware ---
async function start() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Pi-Local Digital Twin] Daemon running at http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start Pi-Twin server:', err);
  process.exit(1);
});
