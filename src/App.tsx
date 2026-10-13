import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Wrench,
} from 'lucide-react';
import { useDigitalTwin } from './hooks/useDigitalTwin';
import { HeaderRibbon } from './components/HeaderRibbon';
import { SenseHatTwin } from './components/SenseHatTwin';
import { GpioHeaderTwin } from './components/GpioHeaderTwin';
import { LcdDisplayTwin } from './components/LcdDisplayTwin';
import { HardwareStatusPanel } from './components/HardwareStatusPanel';
import { CodeStudio } from './components/CodeStudio';
import { DataLoggerView } from './components/DataLoggerView';
import { HelpAndGuide } from './components/HelpAndGuide';
import { HardwareDiagnosticModal } from './components/HardwareDiagnosticModal';

export default function App() {
  const [activeView, setActiveView] = useState<'workspace' | 'help'>('workspace');
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

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-[#840038]/20 selection:text-[#840038]">
      {/* Top Header Ribbon with Galway Maroon Brand & Simulation/Emulation Dropdown */}
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
      />

      {/* Main Content Workspace Canvas (Expanded up to 1800px) */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-2 sm:px-4 py-3 sm:py-4 flex flex-col gap-4 bg-white">
        {activeView === 'workspace' && state && (
          <div className="flex flex-col gap-4">
            {/* OPTIONAL EXPANDABLE SENSOR WAVEFORMS SAMPLE PANEL */}
            {showSensorGraphs && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      Sensor Telemetry & Trends
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold uppercase">
                      Sample Lab
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSensorGraphs(false)}
                    className="text-xs font-mono text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 cursor-pointer"
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

            {/* ON-SCREEN HARDWARE STATUS ALERT BANNER (PARTIAL HW OR EMULATION NOTICE) */}
            {selectedMode === 'emulation' && state.hardwareLinkStatus === 'partial' && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 sm:p-4 text-xs font-mono text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-bold text-amber-900">
                        Hardware Status: 8×8 RGB LED Matrix is Active & Working on Raspberry Pi
                      </strong>
                      <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 text-[10px] font-bold">
                        /dev/fb1 ONLINE
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700 text-xs leading-relaxed">
                      Physical LEDs are connected and respond to your Python scripts. Environmental sensors (HTS221/LPS25H) are unlinked on the I2C bus ({diagnostics?.sensors.error || 'I2C communication in standby'}). Click below to copy the error report or view fix commands.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={handleCopyMainError}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-950 font-bold border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
                    title="Copy formatted diagnostic error report to clipboard"
                  >
                    {copiedMainError ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-700" />
                        <span>Copy Error Report</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsDiagModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold transition-colors cursor-pointer shadow-2xs text-xs flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-800" />
                    <span>View Diagnostics</span>
                  </button>
                </div>
              </div>
            )}

            {/* SIDE-BY-SIDE MAIN AREA: CODE ON THE LEFT & VISUAL ON THE RIGHT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* LEFT COLUMN: CODE STUDIO (PYTHON & C IDE WITH LIVE EXECUTION & EMBEDDED VS CODE TABS) */}
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

              {/* RIGHT COLUMN: DIGITAL TWIN HARDWARE CONSOLE (STATUS + SENSE HAT + LCD + 40-PIN GPIO) */}
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

                {/* 16x2 Character LCD Display (Simulates I2C LCD for Curriculum Examples 12, 13 & C) */}
                <LcdDisplayTwin
                  lcd={state.lcd}
                  selectedMode={selectedMode}
                  isPhysicalConnected={state.isSenseHatConnected}
                  onClearLcd={clearLcd}
                  onConnectHardware={() => connectHardware()}
                  isProbingHardware={isProbingHardware}
                />

                {/* 40-Pin GPIO Header Reference & Hardware PWM Oscilloscope Visualizer */}
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

        {/* HELP & WIKI DOCUMENTATION MANUAL */}
        {activeView === 'help' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveView('workspace')}
                className="px-3.5 py-1.5 rounded-lg bg-[#840038] hover:bg-[#6c002e] text-white text-xs font-mono font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>← Open Interactive Workspace (Code & Digital Twin)</span>
              </button>
            </div>
            <HelpAndGuide onGoToWorkspace={() => setActiveView('workspace')} />
          </div>
        )}
      </main>

      {/* Clean Academic Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs font-mono text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-slate-600">
            Pi-Digit · Raspberry Pi 4 Physical Computing Platform
          </span>
          <a
            href="https://github.com/waqarsqureshi/pi-digit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#840038] hover:underline font-bold flex items-center gap-1.5"
          >
            <span>GitHub: github.com/waqarsqureshi/pi-digit</span>
          </a>
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
