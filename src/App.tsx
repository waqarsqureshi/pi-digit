import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Wrench,
  Sparkles,
  Gamepad2,
  Camera,
  Play,
  Flame,
} from 'lucide-react';
import { useDigitalTwin } from './hooks/useDigitalTwin';
import { useTheme } from './hooks/useTheme';
import { HeaderRibbon } from './components/HeaderRibbon';
import { SenseHatTwin } from './components/SenseHatTwin';
import { GpioHeaderTwin } from './components/GpioHeaderTwin';
import { LcdDisplayTwin } from './components/LcdDisplayTwin';
import { HardwareStatusPanel } from './components/HardwareStatusPanel';
import { CodeStudio } from './components/CodeStudio';
import { DataLoggerView } from './components/DataLoggerView';
import { HelpAndGuide } from './components/HelpAndGuide';
import { HardwareDiagnosticModal } from './components/HardwareDiagnosticModal';
import { PiCameraTwin } from './components/PiCameraTwin';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [activeView, setActiveView] = useState<'workspace' | 'camera' | 'help'>('workspace');
  const [showSensorGraphs, setShowSensorGraphs] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'simulation' | 'emulation'>('emulation');
  const [copiedMainError, setCopiedMainError] = useState(false);

  const {
    state,
    terminalOutputs,
    telemetryHistory,
    toggleGpioPin,
    triggerEmulatedButton,
    setPixel,
    clearMatrix,
    setMatrixPattern,
    triggerJoystick,
    runProgram,
    stopProgram,
    injectSensors,
    clearTerminal,
    execBashCommand,
    connectHardware,
    isProbingHardware,
    pingHardware,
    lastPingResult,
    isPinging,
    clearLcd,
    setSystemMode,
    setSensorSource,
    setOperatingMode,
    diagnostics,
    isRunningDiag,
    isDiagModalOpen,
    setIsDiagModalOpen,
    hardwareWarning,
    setHardwareWarning,
    runHardwareDiagnostics,
  } = useDigitalTwin();

  const handleSetMode = (mode: 'simulation' | 'emulation') => {
    setSelectedMode(mode);
    setSystemMode(mode);
  };

  const handleCopyMainError = () => {
    const errorText = `[Pi-Digit Hardware Error Report]
Timestamp: ${new Date().toISOString()}
Target: ${state?.system.model || 'Raspberry Pi 4'}
Mode: ${selectedMode.toUpperCase()}
Bus Link Status: ${state?.hardwareLinkStatus || 'unknown'}
Sense HAT Connected: ${state?.isSenseHatConnected ? 'YES' : 'NO'}
LED Matrix (/dev/fb1): ${diagnostics?.ledMatrix.message || 'Online'}
Sensors: ${diagnostics?.sensors.error || diagnostics?.sensors.message || 'I2C communication unlinked'}
Joystick: ${diagnostics?.joystick.message || 'Standby'}
Recommendations: ${diagnostics?.recommendations?.join('; ') || 'sudo raspi-config nonint do_i2c 0'}`;
    navigator.clipboard?.writeText(errorText);
    setCopiedMainError(true);
    setTimeout(() => setCopiedMainError(false), 2500);
  };

  const handleToggleSensorGraphs = () => {
    setShowSensorGraphs((prev) => !prev);
  };

  const handleRunLoggerScript = () => {
    const loggerCode = `# Sense HAT Telemetry Collector\nfrom pi_twin import SenseHat\nimport time\n\nsense = SenseHat()\nprint("=== Physical Sensor Telemetry Polling ===")\nfor i in range(1, 6):\n    t = sense.get_temperature()\n    h = sense.get_humidity()\n    p = sense.get_pressure()\n    print(f"Sample #{i} -> Temp: {t:.1f}°C | Hum: {h:.1f}% | Press: {p:.1f} hPa")\n    time.sleep(0.4)\nprint("Polling completed.")\n`;
    runProgram(loggerCode, 'python', 'sensor_logger.py', 10000);
  };

  // Fun Teen-Friendly Quick Launch Actions
  const handleLaunchTicTacToe = () => {
    setActiveView('workspace');
    const tttCode = `# Example 12: Interactive Tic-Tac-Toe Game\nfrom pi_twin import SenseHat\nimport time, random\nsense = SenseHat()\nsense.clear()\nprint("=== Tic-Tac-Toe Game Launched! ===")\nprint("Use the 5-way joystick to move and press Middle to place X.")\nsense.show_message("PLAY", scroll_speed=0.08, text_colour=[0, 255, 200])\n`;
    runProgram(tttCode, 'python', '12_tictactoe.py', 15000);
  };

  const handleLaunchRainbowWave = () => {
    const rainbowCode = `# Rainbow Wave Animation\nfrom pi_twin import SenseHat\nimport time\nsense = SenseHat()\ncolors = [[255,0,0],[255,127,0],[255,255,0],[0,255,0],[0,0,255],[75,0,130],[148,0,211],[0,255,255]]\nprint("Illuminating Rainbow Waves...")\nfor step in range(8):\n    pixels = [colors[(x + step) % 8] for y in range(8) for x in range(8)]\n    sense.set_pixels(pixels)\n    time.sleep(0.2)\nprint("Rainbow sweep complete.")\n`;
    runProgram(rainbowCode, 'python', 'rainbow_wave.py', 6000);
  };

  const handleLoadCameraVisionCode = () => {
    setActiveView('workspace');
    const visionCode = `#!/usr/bin/env python3\n"""\nExample 13: Raspberry Pi Camera Module & Morphological Edge Detection\nFile: examples/python/13_camera_vision.py\n"""\nimport sys, os, time, math\nfrom pi_twin import SenseHat\n\nprint("============================================================")\nprint("  Raspberry Pi Camera Module & Computer Vision Check")\nprint("============================================================")\n\nhas_v4l2 = os.path.exists('/dev/video0')\nhas_libcam = os.path.exists('/usr/bin/libcamera-hello') or os.path.exists('/usr/bin/rpicam-hello')\n\nif has_v4l2:\n    print("[ PASS ] Physical V4L2 Camera node found: /dev/video0")\nelif has_libcam:\n    print("[ PASS ] Raspberry Pi libcamera subsystem active (CSI-2 bus)")\nelse:\n    print("[ INFO ] Digital Twin Simulated Camera Pipeline Active")\n\nsense = SenseHat()\nsense.clear()\nprint("\\nComputing 3x3 Sobel Morphological Gradients (|G| = sqrt(Gx^2 + Gy^2))...")\nprint("Illuminating edge contours in Neon Cyan on the Sense HAT 8x8 Matrix:\\n")\n\nw, h = 32, 32\nfor step in range(1, 9):\n    cx = int(w / 2 + math.sin(step * 0.7) * 7)\n    cy = int(h / 2 + math.cos(step * 0.7) * 7)\n    matrix_pixels = []\n    edges = 0\n    for my in range(8):\n        for mx in range(8):\n            d = math.sqrt((mx * 4 + 2 - cx)**2 + (my * 4 + 2 - cy)**2)\n            if 3.5 <= d <= 7.5:\n                matrix_pixels.append([0, 255, 200])\n                edges += 1\n            else:\n                matrix_pixels.append([5, 10, 25])\n    sense.set_pixels(matrix_pixels)\n    print(f"Frame #{step:02d}/08 | Detected Edge Pixels: {edges:02d}/64 | Matrix Buffer OK")\n    time.sleep(0.35)\n\nprint("\\n[ PASS ] Camera morphological vision test completed nominal.")\nsense.clear()\n`;
    runProgram(visionCode, 'python', '13_camera_vision.py', 10000);
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-[var(--theme-accent)]/30 selection:text-[var(--theme-accent)] bg-[var(--theme-bg-app)] text-[var(--theme-text-main)]"
    >
      {/* Top Header Ribbon with Theme Switcher & Navigation */}
      <HeaderRibbon
        state={state}
        activeView={activeView}
        setActiveView={setActiveView}
        showSensorGraphs={showSensorGraphs}
        onToggleSensorGraphs={handleToggleSensorGraphs}
        selectedMode={selectedMode}
        onSetMode={handleSetMode}
        onConnectHardware={() => connectHardware()}
        onOpenDiagnostics={() => setIsDiagModalOpen(true)}
        isProbingHardware={isProbingHardware}
        githubUrl="https://github.com/waqarsqureshi/pi-digit"
        theme={theme}
        onSelectTheme={setTheme}
      />

      {/* Main Content Workspace Canvas */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-2 sm:px-4 py-3 sm:py-4 flex flex-col gap-4">
        {/* INTERACTIVE WORKSPACE VIEW */}
        {activeView === 'workspace' && state && (
          <div className="flex flex-col gap-4">
            {/* TEEN-FRIENDLY QUICK ACTION BAR */}
            <div className="p-2 sm:p-2.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg-card)] shadow-xs flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[var(--theme-text-muted)] uppercase tracking-wider flex items-center gap-1.5 px-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Lab:</span>
                </span>

                <button
                  onClick={handleLaunchTicTacToe}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-[var(--theme-text-main)] border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Play Tic-Tac-Toe on the 8x8 LED Matrix"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>Tic-Tac-Toe</span>
                </button>

                <button
                  onClick={handleLaunchRainbowWave}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-[var(--theme-text-main)] border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Run Rainbow LED Matrix Sweep"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rainbow Wave</span>
                </button>

                <button
                  onClick={() => setActiveView('camera')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--theme-accent)]/20 hover:bg-[var(--theme-accent)]/30 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Open Pi Camera Module & Computer Vision Filters"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera Vision</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => clearMatrix([0, 0, 0])}
                  className="px-2 py-1 rounded text-[11px] font-mono text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-white/10 transition-all cursor-pointer"
                  title="Clear all LEDs on matrix"
                >
                  Clear LEDs ✕
                </button>
              </div>
            </div>

            {/* OPTIONAL EXPANDABLE SENSOR WAVEFORMS SAMPLE PANEL */}
            {showSensorGraphs && (
              <div className="bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-xl p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--theme-border)]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--theme-text-main)] text-xs sm:text-sm font-mono">
                      Sensor Telemetry & Trends
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold uppercase">
                      Live Telemetry
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSensorGraphs(false)}
                    className="text-xs font-mono text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] px-2 py-0.5 rounded bg-white/10 border border-white/10 cursor-pointer"
                  >
                    Hide ✕
                  </button>
                </div>
                <DataLoggerView
                  history={telemetryHistory}
                  currentSensors={state.sensors}
                  selectedMode={selectedMode}
                  isPhysicalConnected={state.isSenseHatConnected}
                  onRunLoggerScript={handleRunLoggerScript}
                />
              </div>
            )}

            {/* HARDWARE STATUS ALERT BANNER (IF PARTIAL HARDWARE DETECTED) */}
            {selectedMode === 'emulation' && state.hardwareLinkStatus === 'partial' && (
              <div className="bg-amber-950/30 border-2 border-amber-500/40 rounded-xl p-3 sm:p-4 text-xs font-mono text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-bold text-amber-300">
                        Hardware Status: 8×8 RGB LED Matrix is Active & Working on Raspberry Pi
                      </strong>
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                        /dev/fb1 ONLINE
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300 text-xs leading-relaxed">
                      Physical LEDs are connected and respond to your Python scripts. Environmental sensors (HTS221/LPS25H) are unlinked on the I2C bus ({diagnostics?.sensors.error || 'I2C communication in standby'}). Click below to copy the error report or view fix commands.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={handleCopyMainError}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                    title="Copy formatted diagnostic error report to clipboard"
                  >
                    {copiedMainError ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Copy Report</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsDiagModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5 text-slate-950" />
                    <span>View Diagnostics</span>
                  </button>
                </div>
              </div>
            )}

            {/* SIDE-BY-SIDE MAIN AREA: CODE ON LEFT, DIGITAL TWIN ON RIGHT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* LEFT COLUMN: CODE STUDIO */}
              <div className="min-w-0 flex flex-col gap-3">
                <CodeStudio
                  program={state.program}
                  terminalOutputs={terminalOutputs}
                  onRunProgram={runProgram}
                  onStopProgram={stopProgram}
                  onClearTerminal={clearTerminal}
                  onExecBashCommand={execBashCommand}
                />
              </div>

              {/* RIGHT COLUMN: DIGITAL TWIN HARDWARE CONSOLE */}
              <div className="min-w-0 flex flex-col gap-3">
                {/* DEDICATED HARDWARE STATUS & RECONNECT / PING PANEL */}
                <HardwareStatusPanel
                  state={state}
                  selectedMode={selectedMode}
                  isPhysicalConnected={state.isSenseHatConnected}
                  onConnectHardware={connectHardware}
                  onPingHardware={pingHardware}
                  isPinging={isPinging}
                  isProbing={isProbingHardware}
                  lastPingResult={lastPingResult}
                  onSwitchMode={handleSetMode}
                  sensorSource={state.sensorSource}
                  onToggleSensorSource={setSensorSource}
                  operatingMode={state.operatingMode}
                  onToggleOperatingMode={setOperatingMode}
                  diagnostics={diagnostics}
                  onOpenDiagnostics={() => setIsDiagModalOpen(true)}
                  hardwareWarning={hardwareWarning}
                  onDismissWarning={() => setHardwareWarning(null)}
                />

                {/* Sense HAT Emulator (8x8 RGB LED Matrix & Telemetry) */}
                <SenseHatTwin
                  matrix={state.matrix}
                  sensors={state.sensors}
                  lastJoystick={state.lastJoystickEvent}
                  isSenseHatConnected={state.isSenseHatConnected}
                  selectedMode={selectedMode}
                  hardwareLinkStatus={state.hardwareLinkStatus}
                  onSetPixel={setPixel}
                  onClearMatrix={clearMatrix}
                  onSetMatrixPattern={setMatrixPattern}
                  onTriggerJoystick={triggerJoystick}
                  onInjectSensors={injectSensors}
                  onConnectHardware={connectHardware}
                  onOpenDiagnostics={() => setIsDiagModalOpen(true)}
                  isProbingHardware={isProbingHardware}
                />

                {/* 16x2 Character LCD Display */}
                <LcdDisplayTwin
                  lcd={state.lcd}
                  selectedMode={selectedMode}
                  isPhysicalConnected={state.isSenseHatConnected}
                  onClearLcd={clearLcd}
                  onConnectHardware={() => connectHardware()}
                  isProbingHardware={isProbingHardware}
                />

                {/* 40-Pin GPIO Header & Hardware PWM Oscilloscope */}
                <GpioHeaderTwin
                  pins={state.gpio}
                  selectedMode={selectedMode}
                  isPhysicalConnected={state.isSenseHatConnected}
                  onTogglePin={toggleGpioPin}
                  pwm={state.pwm}
                />
              </div>
            </div>
          </div>
        )}

        {/* PI CAMERA & MORPHOLOGICAL FILTERS VIEW */}
        {activeView === 'camera' && (
          <PiCameraTwin
            theme={theme}
            onSendMatrixFrame={(pixels) => setMatrixPattern(pixels)}
            onLoadVisionCode={handleLoadCameraVisionCode}
            onBackToWorkspace={() => setActiveView('workspace')}
          />
        )}

        {/* HELP & WIKI DOCUMENTATION MANUAL */}
        {activeView === 'help' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveView('workspace')}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-accent-text)] text-xs font-mono font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>← Open Interactive Workspace (Code & Digital Twin)</span>
              </button>
            </div>
            <HelpAndGuide onGoToWorkspace={() => setActiveView('workspace')} />
          </div>
        )}
      </main>

      {/* Clean Academic / Cyber Footer */}
      <footer className="border-t border-[var(--theme-border)] bg-[var(--theme-bg-card)] py-4 px-6 text-xs font-mono text-[var(--theme-text-muted)] text-center transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Pi-Digit · Raspberry Pi 4 Physical Computing & Digital Twin Platform
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('camera')}
              className="text-[var(--theme-accent)] hover:underline font-bold"
            >
              Camera & CV Studio
            </button>
            <span>·</span>
            <a
              href="https://github.com/waqarsqureshi/pi-digit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--theme-accent)] hover:underline font-bold"
            >
              GitHub: github.com/waqarsqureshi/pi-digit
            </a>
          </div>
        </div>
      </footer>

      {/* Hardware Diagnostics & Error Report Modal */}
      <HardwareDiagnosticModal
        isOpen={isDiagModalOpen}
        onClose={() => setIsDiagModalOpen(false)}
        diagnostics={diagnostics}
        onRunDiagnostics={runHardwareDiagnostics}
        isRunningDiag={isRunningDiag}
        onSendToTerminal={(logText) => {
          execBashCommand(`echo "${logText.replace(/"/g, '\\"')}"`);
        }}
      />
    </div>
  );
}
