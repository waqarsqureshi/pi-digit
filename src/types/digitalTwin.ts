/**
 * Core Type Definitions for Pi-Local Digital Twin
 * Compliant with Raspberry Pi 4 SRS specifications
 */

export type PinType = 'power3v3' | 'power5v' | 'ground' | 'gpio' | 'id_eeprom';
export type PinMode = 'IN' | 'OUT' | 'PWM' | 'ALT';
export type PinLogic = 0 | 1;

export interface GpioPin {
  pin: number;           // Physical pin 1-40
  bcm: number | null;    // BCM GPIO number if applicable
  name: string;          // e.g. "GPIO 17", "3.3V Power", "GND"
  type: PinType;
  mode: PinMode;
  value: PinLogic;
  pwmDuty?: number;      // 0 - 100%
  altFunction?: string;  // e.g. "I2C1 SDA", "SPI0 MOSI", "UART0 TX"
  pull?: 'UP' | 'DOWN' | 'NONE';
  label?: string;
  isSafeToToggle: boolean;
}

export type RgbColor = [number, number, number]; // [0-255, 0-255, 0-255]

export interface SenseHatSensors {
  temperature: number; // °C (ambient calibrated)
  rawTemperature?: number; // °C (uncalibrated HTS221 reading)
  cpuTemperature?: number; // °C (BCM2711 SoC temperature)
  humidity: number;    // %
  pressure: number;    // hPa
  accelerometer: { x: number; y: number; z: number }; // g
  gyroscope: { x: number; y: number; z: number };     // °/s
  magnetometer: { x: number; y: number; z: number };  // µT
  compassHeading: number;                             // degrees (0-360)
  timestamp: number;
  isSimulated: boolean;
}

export type JoystickDirection = 'up' | 'down' | 'left' | 'right' | 'middle' | 'centre';
export type JoystickAction = 'press' | 'release' | 'hold';

export interface JoystickEvent {
  direction: JoystickDirection;
  action: JoystickAction;
  timestamp: number;
  source?: 'hardware' | 'keypad' | 'simulation';
}

export interface LcdState {
  lines: string[];
  rows: number;
  cols: number;
  cursorRow: number;
  cursorCol: number;
  backlight: boolean;
  backlightTheme: 'blue' | 'emerald' | 'amber';
  cursorVisible: boolean;
}

export type ProgramLanguage = 'python' | 'c';
export type ProgramStatus = 'idle' | 'compiling' | 'running' | 'completed' | 'terminated' | 'error';

export interface ProgramExecution {
  id: string;
  language: ProgramLanguage;
  filename: string;
  status: ProgramStatus;
  startTime?: number;
  durationMs?: number;
  exitCode?: number | null;
  timeoutMs: number;
}

export interface TerminalOutput {
  id: string;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
}

export interface TimelineTrace {
  id: string;
  timestamp: string;
  stage: 'source' | 'api' | 'backend' | 'hardware' | 'twin';
  title: string;
  detail: string;
  level: 'info' | 'success' | 'warn' | 'error';
}

export interface TelemetryRecord {
  id: string;
  timestamp: string;
  temp: number;
  humidity: number;
  pressure: number;
  accelX: number;
  accelY: number;
  accelZ: number;
  heading: number;
}

export interface EmulatedPeripheral {
  id: string;
  pin: number;
  bcm: number;
  type: 'led' | 'button' | 'buzzer';
  name: string;
  color?: 'red' | 'green' | 'blue' | 'yellow';
  state: number; // 0 or 1, or pwm duty
}

export interface SubsystemStatus {
  ok: boolean;
  message: string;
  detail?: string;
  error?: string;
  path?: string;
  addresses?: string[];
}

export interface HardwareDiagnosticReport {
  timestamp: number;
  overallStatus: 'ok' | 'partial' | 'error' | 'simulated';
  isPhysicalPi: boolean;
  piModel?: string;
  system?: {
    os?: string;
    architecture?: string;
    pythonVersion?: string;
    user?: string;
    uid?: number;
    isRoot?: boolean;
  };
  ledMatrix: SubsystemStatus;
  sensors: SubsystemStatus;
  joystick: SubsystemStatus;
  i2c: SubsystemStatus;
  gpio: SubsystemStatus;
  pwm?: SubsystemStatus;
  recommendations: string[];
  terminalLog: string;
}

export interface NetworkInterfaceInfo {
  localIp: string;
  isOnline: boolean;
  hasInternet?: boolean;
  port: number;
  localUrl: string;
  networkUrl: string;
  allIps: string[];
}

export interface FullHardwareState {
  connected: boolean;
  isPhysicalPi: boolean;
  isSenseHatConnected: boolean; // True if physical Sense HAT detected; false for simulation mode
  hardwareLinkStatus?: 'full' | 'partial' | 'disconnected' | 'simulated';
  diagnostics?: HardwareDiagnosticReport;
  simulationMode: boolean;      // True if running simulated fallback
  systemMode?: 'simulation' | 'emulation'; // Explicit system operating mode
  sensorSource: 'hardware' | 'simulated';
  operatingMode: 'execution' | 'emulation';
  pollRateMs: number;
  gpio: GpioPin[];
  emulatedPeripherals: EmulatedPeripheral[];
  matrix: RgbColor[]; // 64 pixels (8x8)
  sensors: SenseHatSensors;
  lastJoystickEvent: JoystickEvent | null;
  pwm?: {
    channel: number;
    duty: number;
    freq: number;
    active: boolean;
  };
  lcd?: LcdState;
  program: ProgramExecution;
  timeline: TimelineTrace[];
  network?: NetworkInterfaceInfo;
  system: {
    hostname: string;
    model: string;
    os: string;
    uptimeSeconds: number;
    cpuLoadPercent: number;
    memoryUsageMb: number;
    totalMemoryMb: number;
    backendVersion: string;
    sdkVersion: string;
    activeConnections: number;
  };
}

export interface CodeExample {
  id: string;
  title: string;
  language: ProgramLanguage;
  category: string;
  description: string;
  filename: string;
  code: string;
}
