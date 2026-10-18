import { useState, useEffect } from 'react';
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
import { HeaderRibbon, WorkspaceLayout } from './components/HeaderRibbon';
import { SenseHatTwin } from './components/SenseHatTwin';
import { GpioHeaderTwin } from './components/GpioHeaderTwin';
import { LcdDisplayTwin } from './components/LcdDisplayTwin';
import { HardwareStatusPanel } from './components/HardwareStatusPanel';
import { CodeStudio } from './components/CodeStudio';
import { DataLoggerView } from './components/DataLoggerView';
import { HelpAndGuide } from './components/HelpAndGuide';
import { HardwareDiagnosticModal } from './components/HardwareDiagnosticModal';
import { PiCameraTwin } from './components/PiCameraTwin';
import { UnifiedWorkspace } from './components/UnifiedWorkspace';
import { CURRICULUM_EXAMPLES } from './data/curriculumExamples';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [activeView, setActiveView] = useState<'workspace' | 'camera' | 'help'>('workspace');
  const [selectedMode, setSelectedMode] = useState<'simulation' | 'emulation'>('emulation');
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayout>('grid');
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

  const handleRunLoggerScript = () => {
    const loggerCode = `# Sense HAT Telemetry Collector\nfrom pi_twin import SenseHat\nimport time\n\nsense = SenseHat()\nprint("=== Physical Sensor Telemetry Polling ===")\nfor i in range(1, 6):\n    t = sense.get_temperature()\n    h = sense.get_humidity()\n    p = sense.get_pressure()\n    print(f"Sample #{i} -> Temp: {t:.1f}°C | Hum: {h:.1f}% | Press: {p:.1f} hPa")\n    time.sleep(0.4)\nprint("Polling completed.")\n`;
    runProgram(loggerCode, 'python', 'sensor_logger.py', 10000);
  };

  // Fun Teen-Friendly Quick Launch Actions
  const handleLaunchTicTacToe = () => {
    setActiveView('workspace');
    const tttEx = CURRICULUM_EXAMPLES.find(
      (e) => e.filename === '12_tictactoe.py' || e.id === 'py-16-tictactoe'
    );
    const code = tttEx
      ? tttEx.code
      : `# 12. Sense HAT Tic-Tac-Toe Game\nfrom sense_hat import SenseHat\nimport time\nsense = SenseHat()\nsense.clear()\nsense.show_message("PLAY")\n`;
    runProgram(code, 'python', '12_tictactoe.py', 180000);
  };

  const handleLaunchRainbowWave = () => {
    const rainbowCode = `# Rainbow Wave Animation\nfrom pi_twin import SenseHat\nimport time\nsense = SenseHat()\ncolors = [[255,0,0],[255,127,0],[255,255,0],[0,255,0],[0,0,255],[75,0,130],[148,0,211],[0,255,255]]\nprint("Illuminating Rainbow Waves...")\nfor step in range(8):\n    pixels = [colors[(x + step) % 8] for y in range(8) for x in range(8)]\n    sense.set_pixels(pixels)\n    time.sleep(0.2)\nprint("Rainbow sweep complete.")\n`;
    runProgram(rainbowCode, 'python', 'rainbow_wave.py', 6000);
  };

  const handleLoadCameraVisionCode = () => {
    setActiveView('workspace');
    const camEx = CURRICULUM_EXAMPLES.find(
      (e) => e.filename === '13_camera_vision.py' || e.id === 'py-13-camera'
    );
    if (camEx) {
      runProgram(camEx.code, 'python', '13_camera_vision.py', 15000);
    }
  };

  const handleRestoreDefaultView = () => {
    try {
      localStorage.removeItem('iot-workspace-applets-v3');
    } catch {}
    window.dispatchEvent(new CustomEvent('restore-default-applets'));
  };

  const handleOpenWiki = () => {
    setActiveView('help');
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-[var(--theme-accent)]/30 selection:text-[var(--theme-accent)] bg-[var(--theme-bg-app)] text-[var(--theme-text-main)]"
    >
      {/* Top Header Ribbon with Theme Switcher, Layout Selector & Navigation */}
      <HeaderRibbon
        state={state}
        activeView={activeView}
        setActiveView={setActiveView}
        layoutMode={layoutMode}
        onSelectLayout={setLayoutMode}
        selectedMode={selectedMode}
        onSetMode={handleSetMode}
        onConnectHardware={() => connectHardware()}
        onOpenDiagnostics={() => setIsDiagModalOpen(true)}
        onRestoreDefaultView={handleRestoreDefaultView}
        onOpenWiki={handleOpenWiki}
        isProbingHardware={isProbingHardware}
        githubUrl="https://github.com/waqarsqureshi/pi-digit"
        theme={theme}
        onSelectTheme={setTheme}
      />

      {/* UNIFIED PRIMARY WORKSPACE (MERGING ALL CANVAS & WORKSPACE CAPABILITIES) */}
      {activeView === 'workspace' && state && (
        <UnifiedWorkspace
          state={state}
          terminalOutputs={terminalOutputs}
          layoutMode={layoutMode}
          onSelectLayout={setLayoutMode}
          onSetPixel={setPixel}
          onClearMatrix={clearMatrix}
          onSetMatrixPattern={setMatrixPattern}
          onTriggerJoystick={triggerJoystick}
          onRunProgram={runProgram}
          onStopProgram={stopProgram}
          onClearTerminal={clearTerminal}
          onExecBashCommand={execBashCommand}
          onConnectHardware={() => connectHardware()}
          onOpenDiagnostics={() => setIsDiagModalOpen(true)}
          onOpenHelp={() => setActiveView('help')}
          isProbingHardware={isProbingHardware}
        />
      )}

      {/* SUB-VIEWS: PI CAMERA STUDIO / HELP MANUAL */}
      {activeView !== 'workspace' && (
        <>
          <main className="flex-1 max-w-[1800px] w-full mx-auto px-2 sm:px-4 py-3 sm:py-4 flex flex-col gap-4">
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
                    <span>← Open Primary Workspace Studio</span>
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
                IoT React Studio · Raspberry Pi 4 Physical Computing & Digital Twin Platform
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView('workspace')}
                  className="text-[var(--theme-accent)] hover:underline font-bold"
                >
                  Workspace Studio
                </button>
                <span>·</span>
                <a
                  href="https://github.com/waqarsqureshi/pi-digit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--theme-accent)] hover:underline font-bold"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </>
      )}

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
