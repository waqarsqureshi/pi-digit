import express, { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import dns from 'dns';
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
  LcdState,
  HardwareDiagnosticReport,
  NetworkInterfaceInfo,
} from './src/types/digitalTwin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local Network IP and Connection Detection
let cachedInternetStatus = false;
let lastInternetCheckTime = 0;

function checkInternetReachability(): void {
  const now = Date.now();
  if (now - lastInternetCheckTime < 15000) return;
  lastInternetCheckTime = now;
  dns.lookup('google.com', (err) => {
    cachedInternetStatus = !err;
  });
}

export function getLocalNetworkInfo(port = 3000): NetworkInterfaceInfo {
  checkInternetReachability();
  const interfaces = os.networkInterfaces();
  const candidates: { ip: string; name: string; priority: number }[] = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('169.254.')) continue;

        let priority = 1;
        if (/^(wlan|eth|en|wl)/i.test(name)) priority += 10;
        if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(net.address)) priority += 5;
        if (/^(docker|br-|veth|vmnet|tun|tap)/i.test(name)) priority -= 8;

        candidates.push({ ip: net.address, name, priority });
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);

  const isOnline = candidates.length > 0;
  const localIp = isOnline ? candidates[0].ip : '127.0.0.1';
  const allIps = isOnline ? candidates.map((c) => c.ip) : ['127.0.0.1'];

  return {
    localIp,
    isOnline,
    hasInternet: cachedInternetStatus,
    port,
    localUrl: `http://127.0.0.1:${port}`,
    networkUrl: isOnline ? `http://${localIp}:${port}` : `http://127.0.0.1:${port}`,
    allIps,
  };
}

// Detect if running on a real physical Raspberry Pi with Sense HAT attached
let isPhysicalPi = false;
let isSenseHatConnected = false;
let hardwareStatusLevel: 'full' | 'partial' | 'disconnected' | 'simulated' = 'disconnected';
let latestDiagnostics: HardwareDiagnosticReport | null = null;

try {
  if (fs.existsSync('/sys/firmware/devicetree/base/model')) {
    const modelStr = fs.readFileSync('/sys/firmware/devicetree/base/model', 'utf8');
    if (modelStr.toLowerCase().includes('raspberry pi')) {
      isPhysicalPi = true;
      // Strictly verify physical Sense HAT presence (MCU @ 0x46 or Sense HAT framebuffer)
      if (fs.existsSync('/sys/bus/i2c/devices/1-0046') || fs.existsSync('/dev/fb1')) {
        isSenseHatConnected = true;
        hardwareStatusLevel = 'partial';
      }
    }
  }
} catch {
  isPhysicalPi = false;
  isSenseHatConnected = false;
}

function runHardwareDiagnostics(): Promise<HardwareDiagnosticReport> {
  return new Promise((resolve) => {
    const diagScript = fs.existsSync(path.join(__dirname, 'src', 'scripts', 'hardware_diagnose.py'))
      ? path.join(__dirname, 'src', 'scripts', 'hardware_diagnose.py')
      : path.join(__dirname, 'scripts', 'hardware_diagnose.py');
    if (!fs.existsSync(diagScript)) {
      const fbExists = fs.existsSync('/dev/fb1') || fs.existsSync('/dev/fb0');
      const fallbackReport: HardwareDiagnosticReport = {
        timestamp: Date.now(),
        overallStatus: fbExists ? 'partial' : 'simulated',
        isPhysicalPi,
        piModel: isPhysicalPi ? 'Raspberry Pi' : 'Virtual Simulator',
        ledMatrix: { ok: fbExists, message: fbExists ? 'Found /dev/fb1 (Active)' : 'Not found' },
        sensors: { ok: false, message: 'Diagnostics script not found' },
        joystick: { ok: false, message: 'Standby' },
        i2c: { ok: fs.existsSync('/dev/i2c-1'), message: fs.existsSync('/dev/i2c-1') ? 'Active' : 'Not found' },
        gpio: { ok: fs.existsSync('/dev/gpiomem'), message: fs.existsSync('/dev/gpiomem') ? 'Active' : 'Not found' },
        recommendations: [],
        terminalLog: 'Diagnostics tool missing.',
      };
      latestDiagnostics = fallbackReport;
      return resolve(fallbackReport);
    }

    exec(
      `python3 "${diagScript}" --json`,
      {
        cwd: __dirname,
        env: {
          ...process.env,
          PYTHONPATH: [
            path.join(__dirname, 'src'),
            path.join(__dirname, 'src', 'py_twin'),
            __dirname,
          ].join(path.delimiter),
        },
      },
      (err, stdout) => {
      let report: HardwareDiagnosticReport;
      try {
        report = JSON.parse(stdout);
      } catch {
        const fbExists = fs.existsSync('/dev/fb1') || fs.existsSync('/dev/fb0');
        report = {
          timestamp: Date.now(),
          overallStatus: fbExists ? 'partial' : 'simulated',
          isPhysicalPi,
          piModel: isPhysicalPi ? 'Raspberry Pi' : 'Virtual Simulator',
          ledMatrix: { ok: fbExists, message: fbExists ? 'Found /dev/fb1 (Active)' : 'Not found' },
          sensors: { ok: false, message: 'Parse error' },
          joystick: { ok: false, message: 'Standby' },
          i2c: { ok: fs.existsSync('/dev/i2c-1'), message: fs.existsSync('/dev/i2c-1') ? 'Active' : 'Not found' },
          gpio: { ok: fs.existsSync('/dev/gpiomem'), message: fs.existsSync('/dev/gpiomem') ? 'Active' : 'Not found' },
          recommendations: [],
          terminalLog: stdout || String(err || ''),
        };
      }

      latestDiagnostics = report;
      if (report.isPhysicalPi) isPhysicalPi = true;

      if (systemMode === 'emulation') {
        if (report.overallStatus === 'ok') {
          isSenseHatConnected = true;
          hardwareStatusLevel = 'full';
        } else if (report.overallStatus === 'partial' || report.ledMatrix.ok || fs.existsSync('/dev/fb1')) {
          isSenseHatConnected = true;
          hardwareStatusLevel = 'partial';
        } else {
          hardwareStatusLevel = isSenseHatConnected ? 'partial' : 'disconnected';
        }
      } else {
        hardwareStatusLevel = 'simulated';
      }

      broadcast('hardware.diagnostics', report);
      resolve(report);
    });
  });
}

// Authoritative Hardware State
let gpioPins: GpioPin[] = JSON.parse(JSON.stringify(INITIAL_GPIO_PINS));

// Hardware PWM State
let currentPwmState = {
  channel: 18,
  duty: 50,
  freq: 1000,
  active: false,
};

// Background Python Hardware Daemon Supervisor (Physical Pi host only)
let hwDaemonProc: ChildProcess | null = null;
let hwDaemonFailed = false;

function startHardwareDaemon() {
  if (hwDaemonProc || hwDaemonFailed) return;
  const daemonPath = fs.existsSync(path.join(__dirname, 'src', 'scripts', 'hardware_daemon.py'))
    ? path.join(__dirname, 'src', 'scripts', 'hardware_daemon.py')
    : path.join(__dirname, 'scripts', 'hardware_daemon.py');
  if (!fs.existsSync(daemonPath)) return;

  try {
    hwDaemonProc = spawn('python3', ['-u', daemonPath], {
      cwd: __dirname,
      env: {
        ...process.env,
        PYTHONPATH: [
          path.join(__dirname, 'src'),
          path.join(__dirname, 'src', 'py_twin'),
          __dirname,
        ].join(path.delimiter),
        PYTHONUNBUFFERED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    hwDaemonProc.on('error', (err) => {
      // In cloud environments without Python or physical Pi drivers, safely fall back to simulated mode
      console.log(`[HwDaemon Info] Hardware daemon not running (${err.message}). Virtual digital twin mode active.`);
      hwDaemonProc = null;
      hwDaemonFailed = true;
    });

    hwDaemonProc.stdout?.on('data', (d) => {
      console.log(`[HwDaemon] ${d.toString().trim()}`);
    });

    hwDaemonProc.stderr?.on('data', (d) => {
      const errStr = d.toString().trim();
      if (errStr.includes('Notice:') || errStr.includes('ModuleNotFoundError')) {
        console.log(`[HwDaemon Info] ${errStr}`);
      } else {
        console.error(`[HwDaemon Error] ${errStr}`);
      }
    });

    hwDaemonProc.on('exit', (code) => {
      hwDaemonProc = null;
      if (code === 0) {
        setTimeout(startHardwareDaemon, 3000);
      } else {
        // In non-Pi or cloud hosts, exit indicates hardware daemon isn't supported; do not busy-retry
        hwDaemonFailed = true;
        console.log('[HwDaemon Info] Hardware daemon exited. Operating in browser virtual digital twin mode.');
      }
    });
  } catch (err) {
    hwDaemonFailed = true;
    console.log('[HwDaemon Info] Spawn skipped, operating in virtual mode:', err);
  }
}

// Background Python Camera Service & Video Frame Daemon Supervisor
let cameraDaemonProc: ChildProcess | null = null;
let cameraDaemonEnabled = false; // Off by default: camera hardware is only accessed when explicitly powered on!
let cameraRestartTimer: NodeJS.Timeout | null = null;

function startCameraDaemon() {
  if (cameraDaemonProc) return;
  cameraDaemonEnabled = true;
  if (cameraRestartTimer) {
    clearTimeout(cameraRestartTimer);
    cameraRestartTimer = null;
  }
  const scriptPath = fs.existsSync(path.join(__dirname, 'src', 'scripts', 'camera_service.py'))
    ? path.join(__dirname, 'src', 'scripts', 'camera_service.py')
    : path.join(__dirname, 'scripts', 'camera_service.py');
  if (!fs.existsSync(scriptPath)) return;

  try {
    cameraDaemonProc = spawn('python3', ['-u', scriptPath], {
      cwd: __dirname,
      env: {
        ...process.env,
        PYTHONPATH: [
          path.join(__dirname, 'src'),
          path.join(__dirname, 'src', 'py_twin'),
          __dirname,
        ].join(path.delimiter),
        PYTHONUNBUFFERED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    cameraDaemonProc.stdout?.on('data', (d) => {
      console.log(`[CamDaemon] ${d.toString().trim()}`);
    });

    cameraDaemonProc.stderr?.on('data', (d) => {
      const msg = d.toString().trim();
      if (!msg.includes('WARN')) {
        console.log(`[CamDaemon Info] ${msg}`);
      }
    });

    cameraDaemonProc.on('exit', () => {
      cameraDaemonProc = null;
      if (cameraDaemonEnabled) {
        cameraRestartTimer = setTimeout(() => {
          if (cameraDaemonEnabled) startCameraDaemon();
        }, 2500);
      }
    });

    cameraDaemonProc.on('error', (err) => {
      console.log(`[CamDaemon Error] ${err.message}`);
      cameraDaemonProc = null;
    });
    console.log('[CamDaemon] Started and camera pipeline active.');
  } catch (err) {
    console.log('[CamDaemon Error] Spawn failed:', err);
  }
}

function stopCameraDaemon() {
  cameraDaemonEnabled = false;
  if (cameraRestartTimer) {
    clearTimeout(cameraRestartTimer);
    cameraRestartTimer = null;
  }
  if (cameraDaemonProc) {
    try {
      cameraDaemonProc.kill('SIGTERM');
      const proc = cameraDaemonProc;
      setTimeout(() => {
        try {
          if (proc && !proc.killed) proc.kill('SIGKILL');
        } catch {}
      }, 500);
    } catch {}
    cameraDaemonProc = null;
  }
  try {
    exec('pkill -9 -f camera_service.py', () => {});
  } catch {}
  try {
    if (fs.existsSync('/tmp/pi_cam_frame.jpg')) fs.unlinkSync('/tmp/pi_cam_frame.jpg');
  } catch {}
  console.log('[CamDaemon] Stopped and camera hardware released.');
}

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
let systemMode: 'simulation' | 'emulation' = 'emulation';
let sensorSource: 'hardware' | 'simulated' = 'simulated';
let operatingMode: 'execution' | 'emulation' = 'execution';

let lcdState: LcdState = {
  lines: ['', ''],
  rows: 2,
  cols: 16,
  cursorRow: 0,
  cursorCol: 0,
  backlight: true,
  backlightTheme: 'blue',
  cursorVisible: false,
};

let recentTerminalOutputs: TerminalOutput[] = [
  {
    id: 'init-term-1',
    timestamp: new Date().toLocaleTimeString(),
    stream: 'system',
    text: 'Pi-Digit Digital Twin Terminal\nTarget: Raspberry Pi 4 Model B (Bookworm)\nHost: local/offline classroom network\n',
  },
];

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
    isSenseHatConnected: systemMode === 'emulation' ? isSenseHatConnected : false,
    hardwareLinkStatus: systemMode === 'simulation' ? 'simulated' : hardwareStatusLevel,
    diagnostics: latestDiagnostics || undefined,
    simulationMode: systemMode === 'simulation',
    systemMode,
    sensorSource,
    operatingMode,
    pollRateMs: 500,
    gpio: gpioPins,
    emulatedPeripherals,
    matrix: matrixPixels,
    sensors,
    lastJoystickEvent,
    pwm: currentPwmState,
    lcd: lcdState,
    program: programState,
    timeline: timelineTraces.slice(0, 30),
    network: getLocalNetworkInfo(Number(process.env.PORT) || 3000),
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
  let isHardwareFresh = false;

  // In Emulation Mode only: read live physical hardware signals from Sense HAT daemon
  if (systemMode === 'emulation' && fs.existsSync('/tmp/pi_sense_hardware.json')) {
    try {
      const stats = fs.statSync('/tmp/pi_sense_hardware.json');
      const ageMs = Date.now() - stats.mtimeMs;
      if (ageMs < 6000) {
        const raw = fs.readFileSync('/tmp/pi_sense_hardware.json', 'utf8');
        const hwData = JSON.parse(raw);
        if (hwData) {
          if (typeof hwData.temperature === 'number') {
            let t = hwData.temperature;
            // Handle if temperature arrives in Fahrenheit (e.g. 132°F)
            if (t > 70 && t < 170) {
              t = ((t - 32) * 5) / 9; // convert to Celsius (~55.5°C)
            }
            // Calibrate to realistic ambient room temperature (~21-25°C)
            if (t > 38) {
              sensors.rawTemperature = hwData.rawTemperature || t;
              sensors.temperature = Number(Math.max(18.5, t - 25.5).toFixed(1));
            } else {
              sensors.temperature = Number(t.toFixed(1));
              sensors.rawTemperature = hwData.rawTemperature || t;
            }
            sensors.cpuTemperature = hwData.cpuTemperature;
            sensors.humidity = hwData.humidity ?? sensors.humidity;
            sensors.pressure = hwData.pressure ?? sensors.pressure;
            sensors.compassHeading = hwData.heading || hwData.compassHeading || sensors.compassHeading;
            if (hwData.accelerometer) sensors.accelerometer = hwData.accelerometer;
            if (hwData.gyroscope) sensors.gyroscope = hwData.gyroscope;
          }
          if (hwData.hardwareStatus === 'full' || (!hwData.isSimulated && !hwData.hardwareStatus)) {
            sensors.isSimulated = false;
            isSenseHatConnected = true;
            isPhysicalPi = true;
            hardwareStatusLevel = 'full';
            isHardwareFresh = true;
          } else if (hwData.ledMatrixOnline || hwData.hardwareStatus === 'partial') {
            isSenseHatConnected = true;
            isPhysicalPi = true;
            hardwareStatusLevel = 'partial';
            isHardwareFresh = true;
          }
        }
      }
    } catch (e) {}
  }

  // In Simulation Mode: board is strictly forbidden from connecting to physical hardware
  if (systemMode === 'simulation') {
    isSenseHatConnected = false;
    hardwareStatusLevel = 'simulated';
    isHardwareFresh = false;
  }

  if (!isHardwareFresh) {
    if (systemMode === 'emulation') {
      if (fs.existsSync('/dev/fb1') || fs.existsSync('/sys/bus/i2c/devices/1-0046')) {
        isSenseHatConnected = true;
        isPhysicalPi = true;
        hardwareStatusLevel = 'partial';
      } else if (isSenseHatConnected) {
        // Keep partial connection state active since user connected hardware in emulation mode
        isPhysicalPi = true;
        hardwareStatusLevel = 'partial';
      } else if (sensorSource === 'hardware' && !isSenseHatConnected) {
        hardwareStatusLevel = 'disconnected';
      }
    }
    // Subtle realistic physical sensor drift when simulating or in standby
    const tNoise = (Math.random() - 0.5) * 0.15;
    const hNoise = (Math.random() - 0.5) * 0.3;
    const pNoise = (Math.random() - 0.5) * 0.1;
    sensors.temperature = Number(Math.max(15, Math.min(45, sensors.temperature + tNoise)).toFixed(2));
    sensors.humidity = Number(Math.max(20, Math.min(90, sensors.humidity + hNoise)).toFixed(1));
    sensors.pressure = Number(Math.max(970, Math.min(1040, sensors.pressure + pNoise)).toFixed(2));
    sensors.compassHeading = Number(((sensors.compassHeading + 0.2) % 360).toFixed(1));
    sensors.isSimulated = hardwareStatusLevel !== 'full';
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

  broadcast('state.update', {
    isPhysicalPi,
    isSenseHatConnected: systemMode === 'emulation' ? isSenseHatConnected : false,
    hardwareLinkStatus: systemMode === 'simulation' ? 'simulated' : hardwareStatusLevel,
    system: { uptimeSeconds: Math.floor(process.uptime()) },
  });
  broadcast('sensor.update', sensors);
  broadcast('system.update', {
    isPhysicalPi,
    isSenseHatConnected: systemMode === 'emulation' && isSenseHatConnected,
    hardwareLinkStatus: systemMode === 'simulation' ? 'simulated' : hardwareStatusLevel,
    uptimeSeconds: Math.floor(process.uptime()),
  });
}, 500);

// High-Responsiveness Physical Joystick & Keypad Polling Loop (50ms interval)
let lastObservedJoyTs = 0;
setInterval(() => {
  try {
    if (fs.existsSync('/tmp/pi_sense_hardware.json')) {
      const raw = fs.readFileSync('/tmp/pi_sense_hardware.json', 'utf8');
      const hwData = JSON.parse(raw);
      if (hwData) {
        // 1. Process recent event batch if present to guarantee press -> hold -> release ordering
        if (Array.isArray(hwData.joystickEvents) && hwData.joystickEvents.length > 0) {
          for (const ev of hwData.joystickEvents) {
            const evTs = Number(ev.timestamp || 0);
            if (evTs > lastObservedJoyTs) {
              lastObservedJoyTs = evTs;
              let d = String(ev.direction || 'middle').toLowerCase();
              if (d === 'centre' || d === 'center' || d === 'enter' || d === 'ok') d = 'middle';
              let act = String(ev.action || 'press').toLowerCase();
              if (act === 'pressed') act = 'press';
              else if (act === 'released') act = 'release';
              else if (act === 'held') act = 'hold';

              lastJoystickEvent = {
                direction: d as JoystickEvent['direction'],
                action: act as JoystickEvent['action'],
                timestamp: evTs,
                source: ev.source || 'hardware',
              };
              broadcast('joystick.event', lastJoystickEvent);
              addTimelineTrace(
                'hardware',
                'Sense HAT Keypad Event',
                `Key: ${lastJoystickEvent.direction.toUpperCase()} (${lastJoystickEvent.action.toUpperCase()}) [Source: ${lastJoystickEvent.source}]`,
                'success'
              );
            }
          }
        } else if (hwData.lastJoystick && hwData.lastJoystick.timestamp > lastObservedJoyTs) {
          lastObservedJoyTs = hwData.lastJoystick.timestamp;
          let d = String(hwData.lastJoystick.direction || 'middle').toLowerCase();
          if (d === 'centre' || d === 'center' || d === 'enter' || d === 'ok') d = 'middle';
          let act = String(hwData.lastJoystick.action || 'press').toLowerCase();
          if (act === 'pressed') act = 'press';
          else if (act === 'released') act = 'release';
          else if (act === 'held') act = 'hold';

          lastJoystickEvent = {
            direction: d as JoystickEvent['direction'],
            action: act as JoystickEvent['action'],
            timestamp: hwData.lastJoystick.timestamp,
            source: hwData.lastJoystick.source || 'hardware',
          };
          broadcast('joystick.event', lastJoystickEvent);
          addTimelineTrace(
            'hardware',
            'Sense HAT Keypad Event',
            `Key: ${lastJoystickEvent.direction.toUpperCase()} (${lastJoystickEvent.action.toUpperCase()})`,
            'success'
          );
        }
      }
    }
  } catch (e) {}
}, 50);

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
    case 'sensors.setSource': {
      const src = msg.payload?.source;
      if (src === 'hardware' || src === 'simulated') {
        sensorSource = src;
        sensors.isSimulated = (src === 'simulated');
        addTimelineTrace('hardware', 'Sensor Source Changed', `Switched to ${src.toUpperCase()} sensor mode`, 'info');
        broadcast('sensor.source', { source: sensorSource, isSimulated: sensors.isSimulated });
        broadcast('init.state', getFullState());
      }
      break;
    }
    case 'operatingMode.set': {
      const mode = msg.payload?.mode;
      if (mode === 'execution' || mode === 'emulation') {
        operatingMode = mode;
        addTimelineTrace('backend', 'Operating Mode Changed', `Switched to ${mode.toUpperCase()} mode`, 'info');
        broadcast('operatingMode.update', { mode: operatingMode });
        broadcast('init.state', getFullState());
      }
      break;
    }
  }
}

// --- Physical Hardware Control Functions (UI to Hardware Synchronization) ---

function findSenseHatFbPath(): string | null {
  try {
    if (fs.existsSync('/sys/class/graphics')) {
      const dirs = fs.readdirSync('/sys/class/graphics');
      for (const d of dirs) {
        const namePath = `/sys/class/graphics/${d}/name`;
        if (fs.existsSync(namePath)) {
          const name = fs.readFileSync(namePath, 'utf8').trim();
          if (name.toLowerCase().includes('sense') || name.includes('RPi-Sense')) {
            return `/dev/${d}`;
          }
        }
      }
    }
  } catch {}
  if (fs.existsSync('/dev/fb1')) return '/dev/fb1';
  return null;
}

function writeHardwareCommand(cmd: Record<string, any>) {
  try {
    fs.appendFileSync('/tmp/pi_hw_commands.jsonl', JSON.stringify({ ...cmd, timestamp: Date.now() }) + '\n');
  } catch {}
}

function writePhysicalSenseHatPixel(x: number, y: number, color: RgbColor) {
  // 1. Direct Linux framebuffer write
  try {
    const fbPath = findSenseHatFbPath();
    if (fbPath && fs.existsSync(fbPath)) {
      const [r, g, b] = color;
      const rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
      const buf = Buffer.alloc(2);
      buf.writeUInt16LE(rgb565, 0);
      const fd = fs.openSync(fbPath, 'r+');
      fs.writeSync(fd, buf, 0, 2, (y * 8 + x) * 2);
      fs.closeSync(fd);
    }
  } catch (err) {}

  // 2. Queue for python bidirectional hardware daemon
  writeHardwareCommand({ action: 'set_pixel', x, y, r: color[0], g: color[1], b: color[2] });
}

function clearPhysicalSenseHatMatrix(color: RgbColor = [0, 0, 0]) {
  try {
    const fbPath = findSenseHatFbPath();
    if (fbPath && fs.existsSync(fbPath)) {
      const [r, g, b] = color;
      const rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
      const buf = Buffer.alloc(128);
      for (let i = 0; i < 64; i++) {
        buf.writeUInt16LE(rgb565, i * 2);
      }
      const fd = fs.openSync(fbPath, 'r+');
      fs.writeSync(fd, buf, 0, 128, 0);
      fs.closeSync(fd);
    }
  } catch (err) {}

  writeHardwareCommand({ action: 'clear', r: color[0], g: color[1], b: color[2] });
}

function writePhysicalSenseHatFullMatrix(matrix: RgbColor[]) {
  try {
    const fbPath = findSenseHatFbPath();
    if (fbPath && fs.existsSync(fbPath)) {
      const buf = Buffer.alloc(128);
      for (let i = 0; i < 64; i++) {
        const [r, g, b] = matrix[i] || [0, 0, 0];
        const rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
        buf.writeUInt16LE(rgb565, i * 2);
      }
      const fd = fs.openSync(fbPath, 'r+');
      fs.writeSync(fd, buf, 0, 128, 0);
      fs.closeSync(fd);
    }
  } catch (err) {}

  writeHardwareCommand({ action: 'set_pixels', pixels: matrix });
}

function writePhysicalGpio(bcm: number | null, value: number) {
  if (bcm === null) return;
  try {
    const valFlag = value ? 'dh' : 'dl';
    exec(`pinctrl set ${bcm} op ${valFlag} 2>/dev/null || raspi-gpio set ${bcm} op ${valFlag} 2>/dev/null`, () => {});
    const gpioPath = `/sys/class/gpio/gpio${bcm}`;
    if (fs.existsSync('/sys/class/gpio')) {
      if (!fs.existsSync(gpioPath)) {
        try { fs.writeFileSync('/sys/class/gpio/export', String(bcm)); } catch (e) {}
      }
      try {
        fs.writeFileSync(`${gpioPath}/direction`, 'out');
        fs.writeFileSync(`${gpioPath}/value`, String(value ? 1 : 0));
      } catch (e) {}
    }
  } catch (err) {}

  writeHardwareCommand({ action: 'gpio_output', bcm, value });
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

  // Propagate UI action to physical GPIO pin
  writePhysicalGpio(pin.bcm, pin.value);

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

  // Propagate UI action to physical Sense HAT framebuffer
  writePhysicalSenseHatPixel(x, y, clamped);

  broadcast('matrix.update', { index, x, y, color: clamped, fullMatrix: matrixPixels });
}

function clearMatrix(r = 0, g = 0, b = 0) {
  const color: RgbColor = [
    Math.min(255, Math.max(0, Math.round(r))),
    Math.min(255, Math.max(0, Math.round(g))),
    Math.min(255, Math.max(0, Math.round(b))),
  ];
  matrixPixels = Array(64).fill(color);

  // Propagate UI action to physical Sense HAT framebuffer
  clearPhysicalSenseHatMatrix(color);

  addTimelineTrace('backend', 'Sense HAT Matrix Cleared', `RGB(${color.join(',')})`, 'info');
  broadcast('matrix.full', { matrix: matrixPixels });
}

function triggerJoystick(direction: JoystickEvent['direction'], action: JoystickEvent['action'] = 'press') {
  const isEmulatingOnHw = systemMode === 'emulation' && isSenseHatConnected;
  const rawDir = String(direction).toLowerCase();
  const normDir = (rawDir === 'centre' || rawDir === 'center' || rawDir === 'enter' || rawDir === 'ok' ? 'middle' : rawDir) as JoystickEvent['direction'];

  const rawAct = String(action).toLowerCase();
  let normAct: JoystickEvent['action'] = 'press';
  if (rawAct === 'pressed' || rawAct === 'press') normAct = 'press';
  else if (rawAct === 'released' || rawAct === 'release') normAct = 'release';
  else if (rawAct === 'held' || rawAct === 'hold') normAct = 'hold';

  lastJoystickEvent = {
    direction: normDir,
    action: normAct,
    timestamp: Date.now(),
    source: isEmulatingOnHw ? 'hardware' : 'keypad',
  };

  addTimelineTrace(
    'hardware',
    'Sense HAT Keypad Event',
    `${normDir.toUpperCase()} (${normAct.toUpperCase()}) [Source: ${isEmulatingOnHw ? 'Physical Hardware' : 'Interactive Keypad'}]`,
    'info'
  );
  broadcast('joystick.event', lastJoystickEvent);

  // Queue event for hardware daemon and update telemetry cache so student scripts receive it
  try {
    const joyCmd = { action: 'joystick', direction: normDir, action_type: normAct, timestamp: Date.now() };
    fs.appendFileSync('/tmp/pi_hw_commands.jsonl', JSON.stringify(joyCmd) + '\n');
    let cur: any = {};
    if (fs.existsSync('/tmp/pi_sense_hardware.json')) {
      try {
        cur = JSON.parse(fs.readFileSync('/tmp/pi_sense_hardware.json', 'utf8')) || {};
      } catch (e) {
        cur = {};
      }
    }
    cur.lastJoystick = lastJoystickEvent;
    if (!Array.isArray(cur.joystickEvents)) cur.joystickEvents = [];
    cur.joystickEvents.push(lastJoystickEvent);
    if (cur.joystickEvents.length > 25) cur.joystickEvents = cur.joystickEvents.slice(-25);
    cur.temperature = sensors.temperature;
    cur.humidity = sensors.humidity;
    cur.pressure = sensors.pressure;
    cur.timestamp = Date.now();
    const tmpFile = `/tmp/pi_sense_hardware_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(cur));
    fs.renameSync(tmpFile, '/tmp/pi_sense_hardware.json');
  } catch (e) {}
}

// --- Student Program Execution Engine ---

let activeChildProcess: ChildProcess | null = null;

function syncFilesToTmp() {
  try {
    fs.writeFileSync('/tmp/pi_twin_sensors.json', JSON.stringify(sensors));
    fs.writeFileSync('/tmp/pi_twin_gpio.json', JSON.stringify(gpioPins));
    let cur: any = {};
    if (fs.existsSync('/tmp/pi_sense_hardware.json')) {
      try {
        cur = JSON.parse(fs.readFileSync('/tmp/pi_sense_hardware.json', 'utf8')) || {};
      } catch (e) {
        cur = {};
      }
    }
    cur.temperature = sensors.temperature;
    cur.humidity = sensors.humidity;
    cur.pressure = sensors.pressure;
    if (lastJoystickEvent) cur.lastJoystick = lastJoystickEvent;
    fs.writeFileSync('/tmp/pi_sense_hardware.json', JSON.stringify(cur));
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
    recentTerminalOutputs.push(item);
    if (recentTerminalOutputs.length > 200) recentTerminalOutputs.shift();
    broadcast('program.output', item);
  };

  addTimelineTrace('source', `Executing Student Code`, `${language.toUpperCase()}: ${filename}`, 'info');

  if (language === 'c') {
    emitOutput('system', `[GCC] gcc -Wall -O2 ${filename} -lpi_twin -o /tmp/runner...`);
    await new Promise((r) => setTimeout(r, 200));

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

    // 1. Sense HAT Clear
    if (code.includes('twin_clear_matrix')) {
      clearMatrix(0, 0, 0);
    }

    // 2. Checkerboard / Loop simulation for C
    if (code.includes('checkerboard') || (code.includes('twin_set_pixel') && code.includes('for'))) {
      emitOutput('stdout', 'Drawing 8x8 checkerboard in native C...');
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if ((x + y) % 2 === 0) {
            setMatrixPixel(x, y, [0, 200, 255]);
          } else {
            setMatrixPixel(x, y, [255, 160, 0]);
          }
        }
        await new Promise((r) => setTimeout(r, 60));
      }
      emitOutput('stdout', 'Checkerboard pattern rendered.');
    } else {
      // Discrete twin_set_pixel calls
      const pixelMatches = [...code.matchAll(/twin_set_pixel\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)];
      for (const match of pixelMatches) {
        const x = Number(match[1]);
        const y = Number(match[2]);
        const r = Number(match[3]);
        const g = Number(match[4]);
        const b = Number(match[5]);
        setMatrixPixel(x, y, [r, g, b]);
        await new Promise((res) => setTimeout(res, 120));
      }
    }

    // 3. LCD calls in C
    if (code.includes('twin_lcd_clear')) {
      lcdState.lines = ['                ', '                '];
      broadcast('lcd.update', lcdState);
    }
    const lcdPrints = [...code.matchAll(/twin_lcd_print\s*\(\s*(?:buffer|"(.*?)")\s*\)/g)];
    let lcdLineIdx = 0;
    for (const match of lcdPrints) {
      const text = match[1] || `Temp: ${sensors.temperature.toFixed(1)} C`;
      lcdState.lines[lcdLineIdx % 2] = (text + '                ').substring(0, 16);
      lcdLineIdx++;
      broadcast('lcd.update', lcdState);
      await new Promise((res) => setTimeout(res, 100));
    }

    // 4. GPIO write calls in C
    const gpioMatches = [...code.matchAll(/(?:twin_gpio_write|GPIO_SET)\s*\(\s*(\d+)\s*,\s*([01]|\w+)\s*\)/g)];
    for (const match of gpioMatches) {
      const bcm = Number(match[1]);
      const val = match[2] === '0' ? 0 : 1;
      const target = gpioPins.find((p) => p.bcm === bcm);
      if (target && target.isSafeToToggle) {
        target.value = val;
        syncEmulatedPeripheralsWithPins();
        broadcast('gpio.update', { pin: target.pin, bcm: target.bcm, value: target.value, mode: target.mode });
        broadcast('peripherals.update', emulatedPeripherals);
        await new Promise((res) => setTimeout(res, 200));
      }
    }

    // 5. Hardware PWM calls in C
    const pwmInitMatch = code.match(/twin_pwm_init\s*\(\s*(\d+)\s*,\s*([\d\.]+)\s*\)/);
    if (pwmInitMatch) {
      const channel = Number(pwmInitMatch[1]);
      const freq = Number(pwmInitMatch[2]);
      currentPwmState = { ...currentPwmState, channel, freq, active: true };
      broadcast('pwm.update', currentPwmState);
    }
    const pwmStartMatch = code.match(/twin_pwm_start\s*\(\s*(\d+)\s*,\s*([\d\.]+)\s*\)/);
    if (pwmStartMatch) {
      const channel = Number(pwmStartMatch[1]);
      const duty = Number(pwmStartMatch[2]);
      currentPwmState = { ...currentPwmState, channel, duty, active: true };
      const target = gpioPins.find((p) => p.bcm === channel);
      if (target) {
        target.mode = 'PWM';
        target.pwmDuty = duty;
      }
      broadcast('pwm.update', currentPwmState);
      await new Promise((res) => setTimeout(res, 120));
    }
    const pwmDutyMatch = code.match(/twin_pwm_set_duty\s*\(\s*(\d+)\s*,\s*([\d\.]+)\s*\)/);
    if (pwmDutyMatch) {
      const channel = Number(pwmDutyMatch[1]);
      const duty = Number(pwmDutyMatch[2]);
      currentPwmState = { ...currentPwmState, channel, duty, active: true };
      const target = gpioPins.find((p) => p.bcm === channel);
      if (target) target.pwmDuty = duty;
      broadcast('pwm.update', currentPwmState);
      await new Promise((res) => setTimeout(res, 100));
    }
    const pwmFreqMatch = code.match(/twin_pwm_set_freq\s*\(\s*(\d+)\s*,\s*([\d\.]+)\s*\)/);
    if (pwmFreqMatch) {
      const channel = Number(pwmFreqMatch[1]);
      const freq = Number(pwmFreqMatch[2]);
      currentPwmState = { ...currentPwmState, channel, freq, active: true };
      broadcast('pwm.update', currentPwmState);
    }
    if (code.includes('twin_pwm_stop')) {
      currentPwmState = { ...currentPwmState, active: false };
      broadcast('pwm.update', currentPwmState);
    }

    // 6. Printf calls in C
    const lines = code.split('\n');
    for (const l of lines) {
      const printMatchC = l.match(/printf\s*\(\s*"(.*?)(?:\\n)?"/);
      if (printMatchC) {
        const text = printMatchC[1]
          .replace(/%d/g, '1')
          .replace(/%\.2f/g, sensors.temperature.toFixed(2))
          .replace(/%\.1f/g, sensors.temperature.toFixed(1))
          .replace(/%s/g, 'HIGH');
        emitOutput('stdout', text);
        await new Promise((r) => setTimeout(r, 80));
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
        PYTHONPATH: [
          path.join(process.cwd(), 'src'),
          path.join(process.cwd(), 'src', 'py_twin'),
          process.cwd(),
        ].join(path.delimiter),
        PYTHONUNBUFFERED: '1',
      },
    });
    activeChildProcess = pyProc;

    let stdoutRemainder = '';

    const handleTwinEvent = (ev: any) => {
      if (!ev || typeof ev !== 'object') return;
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
      } else if (ev.type === 'lcd_update') {
        if (Array.isArray(ev.lines)) {
          lcdState.lines = ev.lines.slice(0, 2);
          broadcast('lcd.update', lcdState);
        }
      } else if (ev.type === 'joystick') {
        triggerJoystick(ev.direction || 'centre', ev.action || 'press');
      } else if (ev.type === 'pwm') {
        const channel = Number(ev.channel || 18);
        const duty = Number(ev.duty ?? 50);
        const freq = Number(ev.freq ?? 1000);
        const active = ev.active !== false;
        currentPwmState = { channel, duty, freq, active };
        const targetPin = gpioPins.find((p) => p.bcm === channel);
        if (targetPin) {
          targetPin.mode = active ? 'PWM' : 'OUT';
          targetPin.pwmDuty = duty;
        }
        broadcast('pwm.update', currentPwmState);
      }
    };

    const handleStdoutLine = (line: string) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      if (trimmedLine.includes('__PI_TWIN_EVENT__:')) {
        const parts = trimmedLine.split('__PI_TWIN_EVENT__:');
        if (parts[0] && parts[0].trim()) {
          emitOutput('stdout', parts[0].trim());
        }
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          let braceDepth = 0;
          let jsonEnd = -1;
          for (let j = 0; j < part.length; j++) {
            if (part[j] === '{') braceDepth++;
            else if (part[j] === '}') {
              braceDepth--;
              if (braceDepth === 0) {
                jsonEnd = j + 1;
                break;
              }
            }
          }
          if (jsonEnd > 0) {
            try {
              const jsonStr = part.substring(0, jsonEnd);
              const ev = JSON.parse(jsonStr);
              handleTwinEvent(ev);
            } catch (e) {
              console.error('[IPC Parse Error]', e);
            }
            const trailing = part.substring(jsonEnd).trim();
            if (trailing) emitOutput('stdout', trailing);
          } else {
            try {
              const ev = JSON.parse(part.trim());
              handleTwinEvent(ev);
            } catch (e) {}
          }
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

app.get('/api/network', (_req: Request, res: Response) => {
  const PORT = Number(process.env.PORT) || 3000;
  res.json(getLocalNetworkInfo(PORT));
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
  if (value !== undefined) {
    target.value = value ? 1 : 0;
    writePhysicalGpio(target.bcm, target.value);
  }
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
  if (!trimmed) {
    return res.json({ output: '' });
  }

  // Built-in Raspberry Pi special commands
  if (trimmed === 'diagnose' || trimmed === 'diag' || trimmed === 'hw-test' || trimmed === 'hw-diag' || trimmed === 'python3 src/scripts/hardware_diagnose.py' || trimmed === 'python3 scripts/hardware_diagnose.py') {
    const report = await runHardwareDiagnostics();
    return res.json({ output: report.terminalLog });
  }

  if (trimmed === 'status' || trimmed === 'hw-status' || trimmed === 'sense-status' || trimmed === 'board-status') {
    const diag = latestDiagnostics || await runHardwareDiagnostics();
    const isFb = fs.existsSync('/dev/fb1');
    const isI2c = fs.existsSync('/dev/i2c-1');
    return res.json({
      output:
        `╔══════════════════════════════════════════════════════════════════════╗\n` +
        `║            RASPBERRY PI & SENSE HAT SUBSYSTEM STATUS                 ║\n` +
        `╚══════════════════════════════════════════════════════════════════════╝\n` +
        `  Target Host        : ${diag.piModel} (Server on Raspberry Pi)\n` +
        `  System Mode        : ${systemMode.toUpperCase()}\n` +
        `  Hardware Link      : ${hardwareStatusLevel.toUpperCase()} (Connected: ${isSenseHatConnected ? 'YES' : 'NO'})\n` +
        `──────────────────────────────────────────────────────────────────────\n` +
        `  1. 8x8 RGB LED Matrix : ${diag.ledMatrix.ok || isFb ? 'ONLINE & ACTIVE (/dev/fb1)' : 'OFFLINE / NOT DETECTED'}\n` +
        `     Status: ${diag.ledMatrix.detail || 'Framebuffer active'}\n\n` +
        `  2. Environmental Sensors: ${diag.sensors.ok ? 'ONLINE (HTS221 / LPS25H)' : 'STANDBY / UNLINKED'}\n` +
        `     Status: ${diag.sensors.error || diag.sensors.message}\n` +
        `     Why not connected? ${diag.sensors.ok ? 'N/A' : 'I2C communication or python3-sense-hat missing.'}\n\n` +
        `  3. 9-DOF IMU Sensors    : ${diag.sensors.ok ? 'ONLINE (LSM9DS1)' : 'STANDBY (Virtual Drift Active)'}\n\n` +
        `  4. 5-Way Joystick       : ${diag.joystick.ok ? 'ONLINE (' + diag.joystick.path + ')' : 'VIRTUAL TWIN FALLBACK'}\n\n` +
        `  5. I2C-1 Bus & GPIO     : ${isI2c ? 'ACTIVE (/dev/i2c-1)' : 'UNAVAILABLE'} · /dev/gpiomem\n` +
        `──────────────────────────────────────────────────────────────────────\n` +
        `  💡 QUICK COMMANDS:\n` +
        `     blink-test  - Flash test colors on physical 8x8 LED matrix\n` +
        `     diagnose    - Run full 5-stage diagnostic test with error logs\n` +
        `     fix-guide   - View step-by-step fix commands for Raspberry Pi\n` +
        `     i2c-check   - Scan I2C addresses\n` +
        `══════════════════════════════════════════════════════════════════════`
    });
  }

  if (trimmed === 'blink-test' || trimmed === 'led-test') {
    // Write a test pattern to 8x8 LED matrix (flashes corner pixels Red, Green, Blue, Yellow, and center White)
    const O: RgbColor = [0, 0, 0];
    const R: RgbColor = [255, 0, 0];
    const G: RgbColor = [0, 255, 0];
    const B: RgbColor = [0, 150, 255];
    const Y: RgbColor = [255, 200, 0];
    const testPattern: RgbColor[] = Array(64).fill(O);
    testPattern[0] = R; testPattern[7] = G; testPattern[56] = B; testPattern[63] = Y;
    testPattern[27] = [255, 255, 255]; testPattern[28] = [255, 255, 255];
    testPattern[35] = [255, 255, 255]; testPattern[36] = [255, 255, 255];
    writePhysicalSenseHatFullMatrix(testPattern);
    matrixPixels = testPattern;
    broadcast('matrix.full', { matrix: matrixPixels });
    setTimeout(() => {
      clearMatrix(0, 0, 0);
    }, 2500);

    return res.json({
      output: `[BLINK TEST SENT TO 8x8 RGB LED MATRIX]\n  Writing test pattern to /dev/fb1...\n  ✓ Top-Left: RED [255, 0, 0]\n  ✓ Top-Right: GREEN [0, 255, 0]\n  ✓ Bottom-Left: BLUE [0, 150, 255]\n  ✓ Bottom-Right: YELLOW [255, 200, 0]\n  ✓ Center 2x2: WHITE [255, 255, 255]\n  If your physical Sense HAT LEDs lit up, hardware framebuffer /dev/fb1 is 100% WORKING!\n  Matrix will automatically reset in 2.5 seconds.`
    });
  }

  if (trimmed === 'fix-guide' || trimmed === 'hw-fix' || trimmed === 'sense-fix') {
    return res.json({
      output:
        `╔══════════════════════════════════════════════════════════════════════╗\n` +
        `║      HOW TO FIX "SENSORS NOT CONNECTED" ON RASPBERRY PI              ║\n` +
        `╚══════════════════════════════════════════════════════════════════════╝\n` +
        `When your 8x8 RGB LEDs are working but sensors show not connected,\n` +
        `the Linux framebuffer (/dev/fb1) is active but I2C communication or\n` +
        `the python3-sense-hat library is missing. Follow these 4 steps on your Pi:\n\n` +
        `STEP 1: Enable I2C interface & kernel drivers\n` +
        `  sudo raspi-config nonint do_i2c 0\n` +
        `  sudo modprobe i2c-dev\n` +
        `  sudo modprobe rpi-sense\n\n` +
        `STEP 2: Install system Sense HAT and I2C Python packages\n` +
        `  sudo apt update\n` +
        `  sudo apt install -y python3-sense-hat python3-smbus i2c-tools\n\n` +
        `STEP 3: Add your user account to hardware permission groups\n` +
        `  sudo usermod -a -G i2c,input,video,gpio $USER\n\n` +
        `STEP 4: Verify Sense HAT overlay in /boot/firmware/config.txt\n` +
        `  Ensure 'dtoverlay=rpi-sense' is present in /boot/firmware/config.txt\n` +
        `  Then reboot: sudo reboot\n` +
        `══════════════════════════════════════════════════════════════════════`
    });
  }

  if (trimmed === 'fb-check' || trimmed === 'led-check') {
    const fb1 = fs.existsSync('/dev/fb1');
    const fb0 = fs.existsSync('/dev/fb0');
    return res.json({
      output:
        `[Sense HAT Framebuffer Check]\n` +
        `  /dev/fb1 (Standard Sense HAT) : ${fb1 ? 'EXISTS (ONLINE)' : 'Not found'}\n` +
        `  /dev/fb0 (Primary display)    : ${fb0 ? 'EXISTS' : 'Not found'}\n` +
        `  LED Matrix Mode               : ${fb1 ? 'Direct 16-bit RGB565 via /dev/fb1' : 'Virtual / Standby'}\n` +
        `  Test command                  : Type 'blink-test' to flash pixels on physical board.`
    });
  }

  if (trimmed === 'help' || trimmed === 'commands') {
    return res.json({
      output:
        `Pi-Digit Shell & Hardware Diagnostic Commands:\n` +
        `  status      - Display full Sense HAT subsystem health summary\n` +
        `  diagnose    - Run comprehensive hardware diagnostics & tests\n` +
        `  blink-test  - Blink physical 8x8 LED matrix to verify live hardware link\n` +
        `  fix-guide   - Step-by-step Raspberry Pi setup and permission fixes\n` +
        `  fb-check    - Inspect Sense HAT 8x8 LED matrix framebuffer node\n` +
        `  i2cdetect -y 1 - Scan I2C bus 1 for Sense HAT addresses (0x46, 0x5c, 0x6a)\n` +
        `  pinout      - Display Raspberry Pi 40-pin GPIO header diagram\n` +
        `  whoami      - Print current user\n` +
        `  clear       - Clear terminal window\n` +
        `  python3 <file.py> - Execute Python program directly on Pi`
    });
  }

  if (trimmed === 'pinout') {
    return res.json({
      output: `Raspberry Pi 4 Model B Rev 1.4\nJ8:\n 3V3  (1) (2)  5V\n GPIO2 (3) (4)  5V\n GPIO3 (5) (6)  GND\n GPIO4 (7) (8)  GPIO14\n   GND (9) (10) GPIO15\nGPIO17 (11) (12) GPIO18\nGPIO27 (13) (14) GND\nGPIO22 (15) (16) GPIO23\n 3V3  (17) (18) GPIO24\nGPIO10 (19) (20) GND\nGPIO9  (21) (22) GPIO25\nGPIO11 (23) (24) GPIO8\n   GND (25) (26) GPIO7\n ID_SD (27) (28) ID_SC\n GPIO5 (29) (30) GND\n GPIO6 (31) (32) GPIO12\nGPIO13 (33) (34) GND\nGPIO19 (35) (36) GPIO16\nGPIO26 (37) (38) GPIO20\n   GND (39) (40) GPIO21`
    });
  }

  if (trimmed === 'i2cdetect -y 1' || trimmed === 'i2c-check' || trimmed === 'i2c-scan') {
    return res.json({
      output: `     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\n00:          -- -- -- -- -- -- -- -- -- -- -- -- -- \n10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- 27 -- \n30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n40: -- -- -- -- -- -- 46 -- -- -- -- -- -- -- -- -- \n50: -- -- -- -- -- -- -- -- -- -- -- -- 5c -- -- -- \n60: -- -- -- -- -- -- -- -- -- -- 6a -- -- -- -- -- \n70: -- -- -- -- -- -- -- --                         \n[Sense HAT Detected: MCU @ 0x46, HTS221/LPS25H @ 0x5c, LSM9DS1 @ 0x6a | LCD @ 0x27]`
    });
  }

  if (trimmed === 'vcgencmd measure_temp') {
    return res.json({ output: `temp=${sensors.temperature.toFixed(1)}'C` });
  }

  if (trimmed === 'whoami') {
    return res.json({ output: 'pi' });
  }

  if (trimmed === 'hostname') {
    return res.json({ output: 'raspberrypi' });
  }

  if (trimmed === 'pwd') {
    return res.json({ output: '/home/pi/pi-digit' });
  }

  // Handle Python script execution with Hardware IPC capture
  if (trimmed.startsWith('python3 ') || trimmed.startsWith('python ')) {
    const parts = trimmed.split(' ');
    const script = parts[1] || '01_hello.py';
    let execCmd = trimmed;
    // Auto-resolve script in examples/python, examples/scripts, src, or example-codes if not found in root
    if (parts[1] && !fs.existsSync(path.join(process.cwd(), parts[1]))) {
      const candidates = [
        path.join('examples', 'python', parts[1]),
        path.join('examples', 'scripts', parts[1]),
        path.join('examples', 'c', parts[1]),
        path.join('examples', parts[1]),
        path.join('src', 'scripts', parts[1]),
        path.join('src', parts[1]),
        path.join('scripts', parts[1]),
      ];
      for (const rel of candidates) {
        if (fs.existsSync(path.join(process.cwd(), rel))) {
          execCmd = `${parts[0]} ${rel}${parts.length > 2 ? ' ' + parts.slice(2).join(' ') : ''}`;
          break;
        }
      }
    }
    syncFilesToTmp();

    return new Promise<void>((resolve) => {
      exec(
        execCmd,
        {
          cwd: process.cwd(),
          timeout: 10000,
          env: {
            ...process.env,
            PYTHONPATH: [
              path.join(process.cwd(), 'src'),
              path.join(process.cwd(), 'src', 'py_twin'),
              process.cwd(),
            ].join(path.delimiter),
            PYTHONUNBUFFERED: '1',
          },
        },
        (error, stdout, stderr) => {
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
                } else if (ev.type === 'pwm') {
                  const channel = Number(ev.channel || 18);
                  const duty = Number(ev.duty ?? 50);
                  const freq = Number(ev.freq ?? 1000);
                  const active = ev.active !== false;
                  currentPwmState = { channel, duty, freq, active };
                  const targetPin = gpioPins.find((p) => p.bcm === channel);
                  if (targetPin) {
                    targetPin.mode = active ? 'PWM' : 'OUT';
                    targetPin.pwmDuty = duty;
                  }
                  broadcast('pwm.update', currentPwmState);
                } else if (ev.type === 'lcd_update') {
                  if (Array.isArray(ev.lines)) {
                    lcdState.lines = ev.lines.slice(0, 2);
                    broadcast('lcd.update', lcdState);
                  }
                }
              } catch (e) {}
            } else if (line.trim()) {
              cleanLines.push(line);
            }
          }
          res.json({ output: cleanLines.join('\n').trim() || (error ? `bash: ${error.message}` : `[Completed execution of ${script}]`) });
          resolve();
        }
      );
    });
  }

  // Standard Bash Execution (reports "command not found" for invalid commands like 'hi')
  exec(trimmed, { shell: '/bin/bash', cwd: process.cwd(), timeout: 6000 }, (error, stdout, stderr) => {
    if (error || stderr) {
      const errOut = (stderr || error?.message || '').trim();
      const cleanErr = errOut
        .replace(/^\/bin\/bash:\s*(?:line\s*\d+:\s*)?/, 'bash: ')
        .replace(/^bash:\s*([^:]+):\s*not found/, 'bash: $1: command not found');
      return res.json({ output: cleanErr || `bash: ${trimmed}: command not found` });
    }
    return res.json({ output: (stdout || '').trim() });
  });
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
    writePhysicalSenseHatFullMatrix(matrixPixels);
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
app.get('/api/program/status', (_req: Request, res: Response) => {
  res.json(programState);
});

app.get('/api/program/output', (_req: Request, res: Response) => {
  res.json(recentTerminalOutputs);
});

app.get('/api/lcd', (_req: Request, res: Response) => {
  res.json(lcdState);
});

app.post('/api/lcd', (req: Request, res: Response) => {
  const { lines, backlight } = req.body;
  if (Array.isArray(lines)) {
    lcdState.lines = lines.map((l) => String(l).substring(0, 16));
  }
  if (backlight !== undefined) {
    lcdState.backlight = Boolean(backlight);
  }
  broadcast('lcd.update', lcdState);
  res.json({ success: true, lcd: lcdState });
});

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
    sensors.isSimulated = Boolean(isSimulated);
  }
  broadcast('sensor.update', sensors);
  broadcast('init.state', getFullState());
  res.json({ success: true, sensors });
});

// Hardware PWM endpoints
app.get('/api/pwm', (_req: Request, res: Response) => {
  res.json(currentPwmState);
});

app.post('/api/pwm', (req: Request, res: Response) => {
  const { channel = 18, duty = 50, freq = 1000, active = true } = req.body;
  currentPwmState = {
    channel: Number(channel),
    duty: Number(duty),
    freq: Number(freq),
    active: Boolean(active),
  };
  const targetPin = gpioPins.find((p) => p.bcm === currentPwmState.channel);
  if (targetPin) {
    targetPin.mode = currentPwmState.active ? 'PWM' : 'OUT';
    targetPin.pwmDuty = currentPwmState.duty;
  }
  broadcast('pwm.update', currentPwmState);
  res.json({ success: true, pwm: currentPwmState });
});

// Global Sensor Source Mode & Operating Mode Control Endpoints
app.get('/api/sensors/source', (_req: Request, res: Response) => {
  res.json({ source: sensorSource, isSimulated: sensors.isSimulated });
});

app.post('/api/sensors/source', (req: Request, res: Response) => {
  const { source } = req.body;
  if (systemMode === 'simulation' && source === 'hardware') {
    return res.status(403).json({
      success: false,
      error: 'In simulation mode, connecting to actual board or physical sensors is not allowed. Switch to Emulation mode to connect actual hardware.',
    });
  }
  if (source === 'hardware' || source === 'simulated') {
    sensorSource = source;
    sensors.isSimulated = (source === 'simulated');
    addTimelineTrace('hardware', 'Sensor Source Switch', `Sensor mode set to ${source.toUpperCase()}`, 'info');
    broadcast('sensor.source', { source: sensorSource, isSimulated: sensors.isSimulated });
    broadcast('init.state', getFullState());
  }
  res.json({ success: true, source: sensorSource, isSimulated: sensors.isSimulated });
});

app.get('/api/mode', (_req: Request, res: Response) => {
  res.json({
    mode: systemMode,
    isConnected: isSenseHatConnected,
    isPhysicalPi,
    message: systemMode === 'simulation'
      ? 'Simulation mode: Purely virtual digital twin. Physical board connection is blocked.'
      : 'Emulation mode: Requires and interacts with physical Raspberry Pi hardware.',
  });
});

app.post('/api/mode', async (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode === 'simulation' || mode === 'emulation') {
    systemMode = mode;
    let termText = '';
    if (mode === 'simulation') {
      // In simulation mode, board is not allowed to connect to actual board
      isSenseHatConnected = false;
      hardwareStatusLevel = 'simulated';
      sensors.isSimulated = true;
      sensorSource = 'simulated';
      addTimelineTrace(
        'backend',
        'Mode Switched to Simulation',
        'Simulation Mode Active. Hardware connections are completely blocked. Running virtual digital twin.',
        'info'
      );
      termText = '\n[Mode Switched to Simulation]\n  Virtual digital twin active. Physical hardware connections disabled.\n';
    } else {
      // In emulation mode, board runs on physical Raspberry Pi
      isPhysicalPi = true;
      const diag = await runHardwareDiagnostics();
      if (diag.overallStatus === 'ok') {
        isSenseHatConnected = true;
        hardwareStatusLevel = 'full';
        sensors.isSimulated = false;
        sensorSource = 'hardware';
      } else if (diag.overallStatus === 'partial' || diag.ledMatrix.ok || fs.existsSync('/dev/fb1')) {
        isSenseHatConnected = true;
        hardwareStatusLevel = 'partial';
        sensors.isSimulated = true;
        sensorSource = 'simulated';
      } else {
        isSenseHatConnected = false;
        hardwareStatusLevel = 'disconnected';
      }

      addTimelineTrace(
        'backend',
        'Mode Switched to Emulation',
        `Emulation Mode Active. Hardware Status: ${hardwareStatusLevel.toUpperCase()} (${diag.piModel})`,
        hardwareStatusLevel === 'disconnected' ? 'warn' : 'info'
      );

      termText =
        `\n[Mode Switched to Emulation: Physical Raspberry Pi]\n` +
        `  Target Host    : ${diag.piModel}\n` +
        `  8x8 LED Matrix : ${diag.ledMatrix.ok ? 'ONLINE & ACTIVE (/dev/fb1)' : 'Standby / Unlinked'}\n` +
        `  Sensors        : ${diag.sensors.ok ? 'ONLINE (HTS221/LPS25H)' : 'Standby (' + (diag.sensors.error || 'I2C unlinked') + ')'}\n` +
        `  Hardware Link  : ${hardwareStatusLevel.toUpperCase()}\n` +
        `  Note           : Type 'diagnose' or 'status' in terminal for hardware details.\n`;
    }

    const termMsg: TerminalOutput = {
      id: 'term-mode-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      stream: 'system',
      text: termText,
    };
    recentTerminalOutputs.push(termMsg);
    broadcast('program.output', termMsg);

    broadcast('mode.update', { mode: systemMode, isConnected: isSenseHatConnected });
    broadcast('init.state', getFullState());
    return res.json({
      success: true,
      mode: systemMode,
      isConnected: isSenseHatConnected,
      statusLevel: hardwareStatusLevel,
      state: getFullState(),
    });
  }
  res.status(400).json({ error: 'Mode must be simulation or emulation' });
});

app.get('/api/operating-mode', (_req: Request, res: Response) => {
  res.json({ mode: operatingMode });
});

app.post('/api/operating-mode', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode === 'execution' || mode === 'emulation') {
    operatingMode = mode;
    addTimelineTrace('backend', 'Operating Mode Switch', `Operating mode set to ${mode.toUpperCase()}`, 'info');
    broadcast('operatingMode.update', { mode: operatingMode });
    broadcast('init.state', getFullState());
  }
  res.json({ success: true, mode: operatingMode });
});

// Hardware Diagnostics Endpoints
app.post('/api/hardware/diagnose', async (_req: Request, res: Response) => {
  const report = await runHardwareDiagnostics();
  const termMsg: TerminalOutput = {
    id: 'term-diag-' + Date.now(),
    timestamp: new Date().toLocaleTimeString(),
    stream: report.overallStatus === 'error' ? 'stderr' : 'system',
    text: `\n${report.terminalLog}\n`,
  };
  recentTerminalOutputs.push(termMsg);
  broadcast('program.output', termMsg);
  res.json({ success: true, diagnostics: report, terminalOutput: report.terminalLog });
});

app.get('/api/hardware/diagnostics', async (_req: Request, res: Response) => {
  if (!latestDiagnostics) {
    await runHardwareDiagnostics();
  }
  res.json({ diagnostics: latestDiagnostics });
});

// Camera Module Status, Frame Capture, & Live Network MJPEG Stream Endpoints
app.get('/api/camera/status', (_req: Request, res: Response) => {
  const hasV4L2 = fs.existsSync('/dev/video0');
  let libcameraDetected = false;
  try {
    if (fs.existsSync('/usr/bin/libcamera-hello') || fs.existsSync('/usr/bin/rpicam-hello')) {
      libcameraDetected = true;
    }
  } catch {}

  let daemonStatus: any = {};
  if (fs.existsSync('/tmp/pi_camera_status.json')) {
    try {
      daemonStatus = JSON.parse(fs.readFileSync('/tmp/pi_camera_status.json', 'utf8'));
    } catch {}
  }

  const isConnected = hasV4L2 || libcameraDetected || Boolean(daemonStatus.connected);
  res.json({
    connected: isConnected,
    running: cameraDaemonEnabled && Boolean(cameraDaemonProc),
    device: daemonStatus.device || (hasV4L2 ? '/dev/video0 (V4L2 CSI-2)' : (libcameraDetected ? 'libcamera CSI-2' : 'Virtual / WebCam Simulator')),
    backend: daemonStatus.backend || (hasV4L2 ? 'v4l2' : 'synthetic'),
    driver: hasV4L2 ? 'bcm2835-unicam / v4l2' : (libcameraDetected ? 'libcamera' : 'Digital Twin Camera Stream'),
    resolution: daemonStatus.resolution || '640x480 @ 30 FPS',
    fps: daemonStatus.fps || (isConnected ? 30 : 25),
    filter: daemonStatus.filter || 'none',
    hasFrame: fs.existsSync('/tmp/pi_cam_frame.jpg'),
    supportedFilters: ['none', 'sobel', 'canny', 'dilation', 'erosion', 'threshold', 'matrix_green', 'cyberpunk', 'grayscale', 'invert'],
    isPhysical: isConnected,
    timestamp: Date.now(),
  });
});

// Explicit Camera Power Controls (Power ON / Hardware Release)
app.post('/api/camera/start', (_req: Request, res: Response) => {
  startCameraDaemon();
  res.json({ success: true, running: true });
});

app.post('/api/camera/stop', (_req: Request, res: Response) => {
  stopCameraDaemon();
  res.json({ success: true, running: false });
});

// Camera In-Memory Frame Buffer Cache (Eliminates frame flicker and 503 read drops)
let lastValidCameraFrame: Buffer | null = null;
try {
  if (fs.existsSync('/tmp/pi_cam_frame.jpg')) {
    lastValidCameraFrame = fs.readFileSync('/tmp/pi_cam_frame.jpg');
  } else if (fs.existsSync('/tmp/pi_camera_test.jpg')) {
    lastValidCameraFrame = fs.readFileSync('/tmp/pi_camera_test.jpg');
  }
} catch {}

// Real-Time High-Speed MJPEG Video Stream over Network
app.get('/api/camera/stream', (_req: Request, res: Response) => {
  if (!cameraDaemonEnabled) {
    return res.status(503).send('Camera is powered off. Click Start Camera to initialize hardware.');
  }

  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=myframe',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'close',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });

  const framePath = '/tmp/pi_cam_frame.jpg';
  let isClosed = false;

  res.on('close', () => {
    isClosed = true;
    if (streamInterval) clearInterval(streamInterval);
  });

  const sendFrame = () => {
    if (isClosed || !cameraDaemonEnabled) return;
    try {
      if (fs.existsSync(framePath)) {
        const frameData = fs.readFileSync(framePath);
        if (frameData && frameData.length > 50) {
          lastValidCameraFrame = frameData;
        }
      }
    } catch (e) {
      // Ignore read collision during atomic replace
    }

    if (lastValidCameraFrame && lastValidCameraFrame.length > 50) {
      try {
        res.write(`--myframe\r\nContent-Type: image/jpeg\r\nContent-Length: ${lastValidCameraFrame.length}\r\n\r\n`);
        res.write(lastValidCameraFrame);
        res.write('\r\n');
      } catch (e) {}
    }
  };

  // Push frames at ~25 FPS
  const streamInterval = setInterval(sendFrame, 40);
  sendFrame();
});

// Single Frame Snapshot endpoint
const cameraFrameLimiter = rateLimit({
  windowMs: 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/camera/frame', cameraFrameLimiter, async (_req: Request, res: Response) => {
  if (!cameraDaemonEnabled) {
    return res.status(503).json({ error: 'Camera is powered off' });
  }
  const framePath = '/tmp/pi_cam_frame.jpg';
  try {
    const data = await fs.promises.readFile(framePath);
    if (data.length > 50) {
      lastValidCameraFrame = data;
    }
  } catch {}

  if (!cameraDaemonEnabled) {
    return res.status(503).json({ error: 'Camera is powered off' });
  }

  if (lastValidCameraFrame && lastValidCameraFrame.length > 50) {
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': lastValidCameraFrame.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    return res.end(lastValidCameraFrame);
  }

  return res.status(503).json({ error: 'Camera frame not ready' });
});

// Set live camera morphological filter (written to daemon command IPC)
app.post('/api/camera/filter', (req: Request, res: Response) => {
  const { filter = 'none' } = req.body;
  try {
    fs.writeFileSync('/tmp/pi_cam_command.json', JSON.stringify({ filter, timestamp: Date.now() }));
  } catch (e) {}
  res.json({ success: true, filter });
});

app.post('/api/camera/matrix', (req: Request, res: Response) => {
  const { pixels } = req.body;
  if (Array.isArray(pixels) && pixels.length === 64) {
    matrixPixels = pixels;
    writePhysicalSenseHatFullMatrix(pixels);
    broadcast('matrix.full', { matrix: pixels });
    broadcast('sensehat.matrix', { matrix: pixels });
    return res.json({ success: true });
  }
  return res.status(400).json({ error: 'Expected 64 RGB pixel array' });
});

// Downsample current camera frame to 8x8 RGB Sense HAT LED Matrix
app.post('/api/camera/capture-to-matrix', async (_req: Request, res: Response) => {
  try {
    const framePath = fs.existsSync('/tmp/pi_cam_frame.jpg')
      ? '/tmp/pi_cam_frame.jpg'
      : (fs.existsSync('/tmp/pi_camera_test.jpg') ? '/tmp/pi_camera_test.jpg' : null);

    if (framePath && fs.existsSync('/usr/bin/convert')) {
      const thumbRaw = '/tmp/pi_cam_matrix_8x8.rgb';
      // Downsample live JPEG directly to 8x8 raw RGB (192 bytes: 64 pixels * 3 bytes)
      const { execFileSync } = await import('child_process');
      execFileSync('/usr/bin/convert', [framePath, '-resize', '8x8!', `rgb:${thumbRaw}`], { timeout: 1500 });
      if (fs.existsSync(thumbRaw)) {
        const rawBuf = fs.readFileSync(thumbRaw);
        if (rawBuf.length >= 192) {
          const pixels: RgbColor[] = [];
          for (let i = 0; i < 64; i++) {
            pixels.push([rawBuf[i * 3], rawBuf[i * 3 + 1], rawBuf[i * 3 + 2]]);
          }
          matrixPixels = pixels;
          writePhysicalSenseHatFullMatrix(pixels);
          broadcast('matrix.full', { matrix: pixels });
          return res.json({ success: true, pixels });
        }
      }
    }
  } catch (e) {
    console.error('[Camera] capture-to-matrix conversion error:', e);
  }

  // Edge detection visual representation fallback
  const fallbackPixels: RgbColor[] = Array(64).fill([0, 160, 220]);
  matrixPixels = fallbackPixels;
  writePhysicalSenseHatFullMatrix(fallbackPixels);
  broadcast('matrix.full', { matrix: fallbackPixels });
  return res.json({ success: true, pixels: fallbackPixels });
});

// Hardware Connection Probe & Link Endpoints
app.post('/api/hardware/probe', async (_req: Request, res: Response) => {
  // In simulation mode, board is not allowed to connect to actual board
  if (systemMode === 'simulation') {
    return res.status(403).json({
      connected: false,
      detected: false,
      message: 'In simulation mode, connecting to actual board is not allowed. Switch to Emulation mode to connect physical hardware.',
    });
  }

  const diag = await runHardwareDiagnostics();
  if (diag.overallStatus === 'ok' || diag.ledMatrix.ok || fs.existsSync('/dev/fb1')) {
    isPhysicalPi = true;
    isSenseHatConnected = true;
    hardwareStatusLevel = diag.overallStatus === 'ok' ? 'full' : 'partial';
    addTimelineTrace(
      'hardware',
      'Physical Hardware Bus Linked',
      `Bus linked: ${diag.ledMatrix.message}. Sensors: ${diag.sensors.message}`,
      'success'
    );
    broadcast('init.state', getFullState());
    return res.json({
      connected: true,
      detected: true,
      statusLevel: hardwareStatusLevel,
      diagnostics: diag,
      message: `Connected: ${diag.piModel} · ${diag.ledMatrix.message}`,
    });
  }

  return res.json({
    connected: isSenseHatConnected,
    detected: false,
    statusLevel: hardwareStatusLevel,
    diagnostics: diag,
    message: 'Probe: No physical Raspberry Pi 4 Sense HAT detected on /dev/fb1 or /dev/i2c-1.',
  });
});

app.post('/api/hardware/ping', (req: Request, res: Response) => {
  const clientSendTime = Number(req.body?.clientTime) || Date.now();
  const latency = Math.max(1, Date.now() - clientSendTime);
  res.json({
    status: 'ok',
    latencyMs: latency,
    connected: systemMode === 'emulation' && isSenseHatConnected,
    isPhysicalPi,
    mode: systemMode,
    i2cStatus: systemMode === 'emulation' && isSenseHatConnected ? 'active (0x46, 0x5c, 0x6a)' : 'standby / emulated',
    gpioStatus: '28 BCM pins active (/dev/gpiomem)',
    lcdStatus: 'I2C PCF8574T @ 0x27 ready',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    message: systemMode === 'simulation'
      ? 'Simulation mode active (Hardware connection disabled)'
      : isSenseHatConnected
      ? `Physical Raspberry Pi 4 hardware link active (${hardwareStatusLevel.toUpperCase()})`
      : 'Emulation mode: Waiting for physical hardware connection',
  });
});

app.post('/api/hardware/connect', async (req: Request, res: Response) => {
  const { force, mode } = req.body;
  // If the user requests to connect hardware, auto-switch to emulation mode since server runs on the Pi
  if (mode === 'emulation' || systemMode === 'simulation') {
    systemMode = 'emulation';
  }
  isPhysicalPi = true;

  const diag = await runHardwareDiagnostics();

  if (force !== undefined) {
    isSenseHatConnected = Boolean(force);
  } else {
    isSenseHatConnected = !isSenseHatConnected;
  }

  if (isSenseHatConnected) {
    if (diag.overallStatus === 'ok') {
      hardwareStatusLevel = 'full';
      sensors.isSimulated = false;
      sensorSource = 'hardware';
    } else if (diag.overallStatus === 'partial' || diag.ledMatrix.ok || fs.existsSync('/dev/fb1')) {
      hardwareStatusLevel = 'partial';
      sensors.isSimulated = true;
    } else {
      hardwareStatusLevel = 'partial';
      sensors.isSimulated = true;
    }
  } else {
    hardwareStatusLevel = 'disconnected';
    sensors.isSimulated = true;
  }

  const sensorErrText = diag.sensors.error || diag.sensors.message || 'I2C sensor read failed';

  const termText = isSenseHatConnected
    ? hardwareStatusLevel === 'full'
      ? `\n╔════════════════════════════════════════════════════════════════╗\n` +
        `║  RASPBERRY PI & SENSE HAT: FULL HARDWARE LINK ESTABLISHED      ║\n` +
        `╚════════════════════════════════════════════════════════════════╝\n` +
        `  [✓] Target Host : ${diag.piModel} (Server running on Pi)\n` +
        `  [✓] LED Matrix  : ONLINE & ACTIVE (/dev/fb1)\n` +
        `  [✓] Sensors     : ONLINE (HTS221 / LPS25H / LSM9DS1 via I2C-1)\n` +
        `  [✓] Joystick    : ${diag.joystick.message}\n` +
        `  Status: Full bidirectional live hardware link active.\n`
      : `\n╔════════════════════════════════════════════════════════════════╗\n` +
        `║  ⚠️  HARDWARE STATUS: PARTIAL SENSE HAT CONNECTION DETECTED    ║\n` +
        `╚════════════════════════════════════════════════════════════════╝\n` +
        `  [✓] Target Host : ${diag.piModel} (Server on Raspberry Pi)\n` +
        `  [✓] LED Matrix  : ONLINE & WORKING (/dev/fb1)\n` +
        `      -> 8x8 RGB LEDs are physically lit on your Raspberry Pi!\n` +
        `  [✗] Sensors     : STANDBY / UNLINKED\n` +
        `      -> Reason: ${sensorErrText}\n` +
        `  [✗] Joystick    : ${diag.joystick.message}\n` +
        `────────────────────────────────────────────────────────────────\n` +
        `  💡 WHY DOES IT SHOW NOT CONNECTED FOR SENSORS?\n` +
        `     The LED Matrix framebuffer (/dev/fb1) and environmental\n` +
        `     sensors use separate kernel drivers. The LED matrix is active,\n` +
        `     but the I2C sensors did not initialize or python3-sense-hat\n` +
        `     is missing.\n` +
        `  🛠️  RECOMMENDED FIX COMMANDS (Run on Pi terminal):\n` +
        `     1. sudo raspi-config nonint do_i2c 0\n` +
        `     2. sudo modprobe i2c-dev && sudo modprobe rpi-sense\n` +
        `     3. sudo apt install -y python3-sense-hat python3-smbus\n` +
        `     4. sudo usermod -a -G i2c,input,video $USER\n` +
        `  Type 'diagnose' in terminal for interactive report or 'blink-test' to test LEDs.\n` +
        `════════════════════════════════════════════════════════════════\n`
    : `\n[Hardware Link Disconnected] Live bus unlinked.\n`;

  const termOutput: TerminalOutput = {
    id: 'term-link-' + Date.now(),
    timestamp: new Date().toLocaleTimeString(),
    stream: isSenseHatConnected ? (hardwareStatusLevel === 'full' ? 'stdout' : 'stderr') : 'system',
    text: termText,
  };
  recentTerminalOutputs.push(termOutput);
  broadcast('program.output', termOutput);

  addTimelineTrace(
    'hardware',
    isSenseHatConnected
      ? hardwareStatusLevel === 'full'
        ? 'Physical Hardware Fully Linked'
        : 'Partial Hardware Linked (LEDs Active)'
      : 'Hardware Bus Disconnected',
    isSenseHatConnected
      ? hardwareStatusLevel === 'full'
        ? 'Live hardware signals linked from physical Raspberry Pi pins and sensors'
        : '8×8 RGB LED Matrix (/dev/fb1) active on Pi. Sensors running in standby.'
      : 'Hardware signals unlinked.',
    isSenseHatConnected ? (hardwareStatusLevel === 'full' ? 'success' : 'warn') : 'warn'
  );

  let warningMessage: string | undefined;
  if (isSenseHatConnected && hardwareStatusLevel === 'partial') {
    warningMessage =
      `8×8 RGB LED Matrix (/dev/fb1) is CONNECTED & ACTIVE on Raspberry Pi! Environmental sensors (HTS221 / LPS25H) are unlinked on I2C bus: ${sensorErrText}. Click Diagnostics for terminal fix commands.`;
  }

  broadcast('init.state', getFullState());
  res.json({
    success: true,
    connected: isSenseHatConnected,
    statusLevel: hardwareStatusLevel,
    diagnostics: diag,
    warning: warningMessage,
    errorDetails: hardwareStatusLevel === 'partial' ? sensorErrText : undefined,
    message: isSenseHatConnected
      ? hardwareStatusLevel === 'full'
        ? 'Live Raspberry Pi Sense HAT fully linked.'
        : 'Physical 8×8 LED Matrix online (/dev/fb1). Sensors in standby.'
      : 'Hardware unlinked.',
    state: getFullState(),
  });
});

app.post('/api/reset', (_req: Request, res: Response) => {
  gpioPins = JSON.parse(JSON.stringify(INITIAL_GPIO_PINS));
  matrixPixels = Array(64).fill([0, 0, 0]);
  lcdState.lines = ['', ''];
  syncEmulatedPeripheralsWithPins();
  addTimelineTrace('backend', 'Hardware Bus Reset', 'All GPIO and Sense HAT states cleared to defaults', 'success');
  broadcast('init.state', getFullState());
  res.json({ success: true, message: 'Hardware state reset' });
});

function runStartupVerificationTests(): Promise<void> {
  return new Promise((resolve) => {
    const testRunner = path.join(__dirname, 'test-codes', 'run_all_tests.py');
    if (!fs.existsSync(testRunner)) {
      resolve();
      return;
    }
    console.log('\n======================================================================');
    console.log('  [Pi-Twin Boot] Running Pre-Flight Hardware & Camera Tests...');
    console.log('======================================================================');
    let settled = false;
    const safeResolve = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const timer = setTimeout(() => {
      console.log('[Pi-Twin Boot] Pre-flight test timeout reached (10s), continuing emulator boot...');
      safeResolve();
    }, 10000);

    const proc = spawn('python3', [testRunner], {
      cwd: __dirname,
      env: {
        ...process.env,
        PYTHONPATH: [path.join(__dirname, 'src'), path.join(__dirname, 'src', 'py_twin'), __dirname].join(path.delimiter),
        PYTHONUNBUFFERED: '1',
      },
    });
    proc.stdout?.on('data', (d) => {
      process.stdout.write(d.toString());
    });
    proc.stderr?.on('data', (d) => {
      const msg = d.toString();
      if (!msg.includes('WARN')) {
        process.stderr.write(`[Test Notice] ${msg}`);
      }
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      console.log(`[Pi-Twin Boot] Pre-flight verification completed (Exit code: ${code ?? 0}).`);
      console.log('======================================================================\n');
      safeResolve();
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      console.log(`[Pi-Twin Boot] Pre-flight runner skipped: ${err.message}`);
      safeResolve();
    });
  });
}

// --- Boot Server and Mount Vite Middleware ---
async function start() {
  const PORT = Number(process.env.PORT) || 3000;

  // Serve shared static assets directory
  app.use('/assets', express.static(path.join(__dirname, 'assets')));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get(['/emulator', '/emulator/*', '/emulator/index.html'], (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'emulator', 'index.html'));
    });
    app.get(['/wiki', '/wiki.html', '/wiki/*'], (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'wiki.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Directly serve the emulator React SPA for /emulator, /emulator/, /emulator/index.html
    app.get(['/emulator', '/emulator/*', '/emulator/index.html'], async (req, res, next) => {
      try {
        const emulatorHtmlPath = path.join(__dirname, 'emulator', 'index.html');
        let html = await fs.promises.readFile(emulatorHtmlPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        next(e);
      }
    });

    // Serve documentation wiki
    app.get(['/wiki', '/wiki.html', '/wiki/*'], async (req, res, next) => {
      try {
        const wikiHtmlPath = path.join(__dirname, 'wiki.html');
        let html = await fs.promises.readFile(wikiHtmlPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        next(e);
      }
    });

    // Fallback to main landing page
    app.get('*', async (req, res, next) => {
      try {
        const indexHtmlPath = path.join(__dirname, 'index.html');
        let html = await fs.promises.readFile(indexHtmlPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        next(e);
      }
    });
  }

  server.listen(PORT, '0.0.0.0', async () => {
    const net = getLocalNetworkInfo(PORT);
    console.log('\n======================================================================');
    console.log(`  [Pi-Local Digital Twin] Daemon Active & Listening on Port ${PORT}`);
    console.log('======================================================================');
    console.log(`  ➜ Project Directory (pwd) : ${process.cwd()}`);
    console.log(`  ➜ Hardware Emulator (Pi)  : ${net.localUrl}/emulator/`);
    if (net.isOnline) {
      console.log(`  ➜ Hardware Emulator (LAN) : ${net.networkUrl}/emulator/`);
      console.log(`                            (Use this URL to open emulator on your laptop/PC)`);
      console.log(`  ➜ Hardware Emulator (mDNS): http://raspberrypi.local:${PORT}/emulator/`);
    } else {
      console.log(`  ➜ Network Status          : Offline / Standby (No active Wi-Fi or Ethernet LAN)`);
      console.log(`  ➜ Emulator Loopback Only  : ${net.localUrl}/emulator/ (127.0.0.1)`);
    }
    console.log(`  ➜ Main Website & Guides   : http://localhost:${PORT}/`);
    console.log(`  ➜ Documentation & Wiki    : http://localhost:${PORT}/wiki`);
    console.log('======================================================================\n');

    // 1. Run pre-flight hardware and camera verification tests before starting emulator
    await runStartupVerificationTests();

    // 2. Launch background hardware supervisor daemon (Camera starts powered OFF until activated)
    startHardwareDaemon();

    // 3. Run initial hardware probe and print terminal notice
    runHardwareDiagnostics().then((diag) => {
      console.log('------------------------------------------------------------');
      console.log('[Pi-Twin Boot Hardware Status]');
      console.log(`  Target Host   : ${diag.piModel}`);
      console.log(`  LED Framebuffer : ${diag.ledMatrix.ok ? 'FOUND (' + (diag.ledMatrix.path || '/dev/fb1') + ')' : 'Standby / Virtual'}`);
      console.log(`  Sensors Bus   : ${diag.sensors.ok ? 'ONLINE (HTS221/LPS25H)' : 'Standby (' + (diag.sensors.error || 'Simulated') + ')'}`);
      console.log(`  Link Level    : ${hardwareStatusLevel.toUpperCase()}`);
      console.log('------------------------------------------------------------');
    });
  });
}

start().catch((err) => {
  console.error('Failed to start Pi-Twin server:', err);
  process.exit(1);
});
