import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Check,
  Cpu,
  Grid3X3,
  HelpCircle,
  Info,
  Layers,
  Navigation,
  RefreshCw,
  Terminal,
  Thermometer,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { HardwareDiagnosticReport } from '../types/digitalTwin';

interface HardwareDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: HardwareDiagnosticReport | null;
  onRunDiagnostics: () => Promise<HardwareDiagnosticReport | null>;
  isRunningDiag: boolean;
  onSendToTerminal?: (logText: string) => void;
}

export function HardwareDiagnosticModal({
  isOpen,
  onClose,
  diagnostics,
  onRunDiagnostics,
  isRunningDiag,
  onSendToTerminal,
}: HardwareDiagnosticModalProps) {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'terminal' | 'fixes'>('overview');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleCopyLog = () => {
    if (diagnostics?.terminalLog) {
      navigator.clipboard?.writeText(diagnostics.terminalLog);
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    }
  };

  const handleCopyReport = () => {
    if (!diagnostics) return;
    const summary = `=== RASPBERRY PI & SENSE HAT HARDWARE DIAGNOSTIC REPORT ===
Timestamp: ${new Date(diagnostics.timestamp).toISOString()}
Target Model: ${diagnostics.piModel}
Overall Status: ${diagnostics.overallStatus.toUpperCase()}

1. LED Matrix: ${diagnostics.ledMatrix.ok ? 'ONLINE' : 'OFFLINE'}
   Path: ${diagnostics.ledMatrix.path || 'N/A'}
   Detail: ${diagnostics.ledMatrix.detail || 'N/A'}
   Error: ${diagnostics.ledMatrix.error || 'None'}

2. Sensors (HTS221/LPS25H/LSM9DS1): ${diagnostics.sensors.ok ? 'ONLINE' : 'STANDBY'}
   Detail: ${diagnostics.sensors.detail || 'N/A'}
   Error: ${diagnostics.sensors.error || 'None'}

3. Joystick (evdev): ${diagnostics.joystick.ok ? 'ONLINE' : 'OFFLINE'}
   Path: ${diagnostics.joystick.path || 'N/A'}
   Detail: ${diagnostics.joystick.detail || 'N/A'}

4. I2C Bus: ${diagnostics.i2c.ok ? 'ONLINE' : 'OFFLINE'}
   Addresses detected: ${diagnostics.i2c.addresses?.join(', ') || 'None'}

5. Recommendations:
${diagnostics.recommendations?.map((r, i) => `   ${i + 1}. ${r}`).join('\n') || '   None'}

=== TERMINAL LOG ===
${diagnostics.terminalLog || 'No log'}
`;
    navigator.clipboard?.writeText(summary);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const overall = diagnostics?.overallStatus || 'simulated';
  const isPartial = overall === 'partial';
  const isOk = overall === 'ok';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diag-modal-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#840038]/10 text-[#840038] flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="diag-modal-title" className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  Hardware Diagnostics & Status Report
                </h2>
                {isOk ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE HW FULLY LINKED
                  </span>
                ) : isPartial ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    PARTIAL LINK: LED MATRIX ONLINE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    STANDBY / UNLINKED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                Target: {diagnostics?.piModel || 'Raspberry Pi 4 Model B'} · Linux Kernel & Hardware Buses
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Close diagnostics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Callout Banner */}
        {isPartial && (
          <div className="mx-4 sm:mx-5 mt-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-950 font-mono">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold text-amber-900 block mb-0.5">
                Physical 8×8 RGB LED Matrix is Connected and Working!
              </strong>
              <span>
                The LED matrix (/dev/fb1) is active on your Raspberry Pi. However, the environmental sensors (HTS221 / LPS25H) or joystick did not report live data over I2C. The LED matrix will continue to work while sensor readings use digital twin standby fallback.
              </span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-200 flex items-center gap-1 bg-white">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-xs font-mono font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-[#840038] text-[#840038]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Subsystems Status</span>
          </button>
          <button
            onClick={() => setActiveTab('fixes')}
            className={`px-3 py-2 text-xs font-mono font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'fixes'
                ? 'border-[#840038] text-[#840038]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Recommended Fixes ({diagnostics?.recommendations.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-2 text-xs font-mono font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'terminal'
                ? 'border-[#840038] text-[#840038]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal Diagnostic Log</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* Subsystem 1: 8x8 LED Matrix */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  diagnostics?.ledMatrix.ok
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-rose-50/60 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      diagnostics?.ledMatrix.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">8×8 RGB LED Matrix</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          diagnostics?.ledMatrix.ok
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {diagnostics?.ledMatrix.ok ? 'ONLINE & ACTIVE' : 'NOT DETECTED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 font-mono">
                      {diagnostics?.ledMatrix.message || 'Sense HAT framebuffer device check (/dev/fb1)'}
                    </p>
                    {diagnostics?.ledMatrix.detail && (
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">
                        {diagnostics.ledMatrix.detail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono font-bold text-slate-500 block">
                    Bus / Path
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {diagnostics?.ledMatrix.path || '/dev/fb1'}
                  </span>
                </div>
              </div>

              {/* Subsystem 2: Environmental Sensors */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  diagnostics?.sensors.ok
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-amber-50/60 border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      diagnostics?.sensors.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">Environmental Sensors (HTS221 / LPS25H)</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          diagnostics?.sensors.ok
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {diagnostics?.sensors.ok ? 'ONLINE (HW)' : 'STANDBY / FALLBACK'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 font-mono">
                      {diagnostics?.sensors.message || 'Temperature, Humidity & Pressure readings'}
                    </p>
                    {diagnostics?.sensors.error && (
                      <p className="text-[11px] text-rose-700 mt-1 font-mono bg-rose-50 border border-rose-200 p-1.5 rounded">
                        <strong>Cause:</strong> {diagnostics.sensors.error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono font-bold text-slate-500 block">
                    I2C-1 Addresses
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    0x5F, 0x5C
                  </span>
                </div>
              </div>

              {/* Subsystem 3: 5-Way Joystick */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  diagnostics?.joystick.ok
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      diagnostics?.joystick.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">5-Way Keypad / Joystick</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          diagnostics?.joystick.ok
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}
                      >
                        {diagnostics?.joystick.ok ? 'PHYSICAL EVDEV' : 'VIRTUAL TWIN'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 font-mono">
                      {diagnostics?.joystick.message || 'Interactive 5-way navigation stick'}
                    </p>
                    {diagnostics?.joystick.detail && (
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">
                        {diagnostics.joystick.detail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono font-bold text-slate-500 block">
                    Device Node
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {diagnostics?.joystick.path || '/dev/input/event*'}
                  </span>
                </div>
              </div>

              {/* Subsystem 4: I2C Bus & GPIO Memory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-[#840038]" />
                    <span className="font-bold text-xs text-slate-900 font-mono">I2C BUS (/dev/i2c-1)</span>
                  </div>
                  <span className={`text-xs font-mono font-bold block ${diagnostics?.i2c.ok ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {diagnostics?.i2c.message || 'I2C-1 Controller Status'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                    {diagnostics?.i2c.addresses?.length ? `Slaves: ${diagnostics.i2c.addresses.join(', ')}` : 'Standard 100/400 kHz bus'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-[#840038]" />
                    <span className="font-bold text-xs text-slate-900 font-mono">GPIO MEMORY (/dev/gpiomem)</span>
                  </div>
                  <span className={`text-xs font-mono font-bold block ${diagnostics?.gpio.ok ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {diagnostics?.gpio.message || '28 BCM GPIO Pins'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                    Pinctrl / raspi-gpio multiplexer
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fixes' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong>How to resolve hardware issues on Raspberry Pi:</strong>
                  <p className="mt-0.5 text-[11px] text-sky-800">
                    If your board shows partial connection or permission errors, copy and run these commands in a terminal on your Raspberry Pi:
                  </p>
                </div>
              </div>

              {diagnostics?.recommendations && diagnostics.recommendations.length > 0 ? (
                <div className="space-y-2">
                  {diagnostics.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-slate-500 text-[10px] block">Recommendation #{idx + 1}</span>
                        <code className="text-xs font-bold text-slate-900 break-all">{rec}</code>
                      </div>
                      <button
                        onClick={() => handleCopy(rec, `rec-${idx}`)}
                        className="px-2.5 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-2xs"
                        title="Copy command"
                      >
                        {copiedCmd === `rec-${idx}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-800">No hardware errors detected!</p>
                  <p className="text-[11px] text-slate-500 mt-1">All subsystems and permissions are configured correctly.</p>
                </div>
              )}

              {/* Common helpful Pi commands */}
              <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Common Setup Commands:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-100 rounded border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Check I2C Devices</span>
                      <code className="text-slate-800 font-bold">i2cdetect -y 1</code>
                    </div>
                    <button
                      onClick={() => handleCopy('i2cdetect -y 1', 'cmd-i2c')}
                      className="text-slate-500 hover:text-slate-800 p-1"
                    >
                      {copiedCmd === 'cmd-i2c' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clipboard className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-2 bg-slate-100 rounded border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Check Framebuffer</span>
                      <code className="text-slate-800 font-bold">ls -la /dev/fb*</code>
                    </div>
                    <button
                      onClick={() => handleCopy('ls -la /dev/fb*', 'cmd-fb')}
                      className="text-slate-500 hover:text-slate-800 p-1"
                    >
                      {copiedCmd === 'cmd-fb' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clipboard className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span>Direct Output from `scripts/hardware_diagnose.py`:</span>
                <div className="flex items-center gap-2">
                  {onSendToTerminal && diagnostics?.terminalLog && (
                    <button
                      onClick={() => onSendToTerminal(diagnostics.terminalLog)}
                      className="text-[11px] text-[#840038] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Print in Web Terminal</span>
                    </button>
                  )}
                  <button
                    onClick={handleCopyLog}
                    className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLog ? <Check className="w-3 h-3 text-emerald-600" /> : <Clipboard className="w-3 h-3" />}
                    <span>{copiedLog ? 'Copied' : 'Copy Log'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-80 whitespace-pre shadow-inner leading-relaxed">
                {diagnostics?.terminalLog || 'No diagnostic output available yet. Click "Run Diagnostics" to generate.'}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Updated: {diagnostics ? new Date(diagnostics.timestamp).toLocaleTimeString() : 'Not run'}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={handleCopyReport}
              disabled={!diagnostics}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Copy complete hardware diagnostics report to clipboard"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Full Report!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
            <button
              onClick={() => onRunDiagnostics()}
              disabled={isRunningDiag}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#840038] hover:bg-[#6c002e] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiag ? 'animate-spin' : ''}`} />
              <span>{isRunningDiag ? 'Testing Hardware...' : 'Re-Run Diagnostic Test'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
