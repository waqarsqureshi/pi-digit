import { useState } from 'react';
import { useDigitalTwin } from './hooks/useDigitalTwin';
import { useTheme } from './hooks/useTheme';
import { HeaderRibbon, WorkspaceLayout } from './components/HeaderRibbon';
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
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-accent-text)] text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>← Back to Workspace</span>
                  </button>
                </div>
                <HelpAndGuide onGoToWorkspace={() => setActiveView('workspace')} />
              </div>
            )}
          </main>

          <footer className="border-t border-[var(--theme-border)] bg-[var(--theme-bg-card)] py-4 px-6 text-xs text-[var(--theme-text-muted)] text-center transition-colors">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>
                Pi-Digit · Raspberry Pi Digital Twin and physical computing workspace
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView('workspace')}
                  className="text-[var(--theme-accent)] hover:underline font-semibold"
                >
                  Workspace
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
