import { useState } from 'react';
import { useDigitalTwin } from './hooks/useDigitalTwin';
import { HeaderRibbon } from './components/HeaderRibbon';
import { SenseHatTwin } from './components/SenseHatTwin';
import { GpioHeaderTwin } from './components/GpioHeaderTwin';
import { LcdDisplayTwin } from './components/LcdDisplayTwin';
import { HardwareStatusPanel } from './components/HardwareStatusPanel';
import { CodeStudio } from './components/CodeStudio';
import { DataLoggerView } from './components/DataLoggerView';
import { HelpAndGuide } from './components/HelpAndGuide';

export default function App() {
  const [activeView, setActiveView] = useState<'workspace' | 'help'>('help');
  const [showSensorGraphs, setShowSensorGraphs] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'simulation' | 'emulation'>('simulation');

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
    setSensorSource,
    setOperatingMode,
  } = useDigitalTwin();

  const handleSetMode = (mode: 'simulation' | 'emulation') => {
    setSelectedMode(mode);
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
                    className="text-xs font-mono text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200"
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
                />

                {/* Sense HAT Emulator (8x8 RGB LED Matrix & Telemetry) */}
                <SenseHatTwin
                  matrix={state.matrix}
                  sensors={state.sensors}
                  lastJoystick={state.lastJoystickEvent}
                  isSenseHatConnected={state.isSenseHatConnected}
                  selectedMode={selectedMode}
                  onSetPixel={setPixel}
                  onClearMatrix={clearMatrix}
                  onSetMatrixPattern={setMatrixPattern}
                  onTriggerJoystick={triggerJoystick}
                  onInjectSensors={injectSensors}
                  onConnectHardware={connectHardware}
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
    </div>
  );
}
