import React from 'react';
import { Monitor, RefreshCw, Sun, PowerOff, Zap, CheckCircle2, Info } from 'lucide-react';
import { LcdState } from '../types/digitalTwin';

interface LcdDisplayTwinProps {
  lcd?: LcdState;
  selectedMode: 'simulation' | 'emulation';
  isPhysicalConnected: boolean;
  onClearLcd?: () => void;
  onConnectHardware?: () => void;
  isProbingHardware?: boolean;
}

export function LcdDisplayTwin({
  lcd,
  selectedMode,
  isPhysicalConnected,
  onClearLcd,
  onConnectHardware,
  isProbingHardware = false,
}: LcdDisplayTwinProps) {
  const isEmulationDisconnected = selectedMode === 'emulation' && !isPhysicalConnected;

  // The LCD only displays text if code has explicitly run and set lines
  const hasTextFromCode = Boolean(lcd?.lines && lcd.lines.some((l) => l && l.trim().length > 0));

  let line0 = '                ';
  let line1 = '                ';

  if (!isEmulationDisconnected && hasTextFromCode && lcd?.lines) {
    line0 = (lcd.lines[0] || '').padEnd(16, ' ').substring(0, 16);
    line1 = (lcd.lines[1] || '').padEnd(16, ' ').substring(0, 16);
  } else if (isEmulationDisconnected) {
    line0 = ' [DISCONNECTED] ';
    line1 = ' NO HARDWARE BUS';
  }

  const isBacklit = !isEmulationDisconnected && (lcd?.backlight !== false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col gap-3 text-slate-800 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-[#840038]" />
              <span>16x2 I2C Character LCD</span>
            </h3>
            {isEmulationDisconnected ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-300">
                DISCONNECTED (EMULATION)
              </span>
            ) : selectedMode === 'emulation' ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                EMULATION (LIVE PI 4)
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-sky-100 text-sky-800 border border-sky-300">
                HARDWARE TWIN (HD44780 @ 0x27)
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            {isEmulationDisconnected
              ? 'Physical hardware not connected. Probing hardware pins is required in Emulation Mode.'
              : hasTextFromCode
              ? 'Displaying text written by program execution'
              : 'Display ready and blank. Run Example 12 or 13 to output text.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEmulationDisconnected && onConnectHardware && (
            <button
              onClick={onConnectHardware}
              disabled={isProbingHardware}
              className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
            >
              {isProbingHardware ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Probing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Connect Hardware</span>
                </>
              )}
            </button>
          )}

          {!isEmulationDisconnected && onClearLcd && hasTextFromCode && (
            <button
              onClick={onClearLcd}
              className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
              title="Clear LCD Screen"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Educational Hardware Architecture Note */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-lg p-2.5 text-[11px] text-amber-950 flex items-start gap-2 shadow-2xs">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-amber-900">Hardware Notice:</span> An LCD display does not physically exist on the Raspberry Pi Sense HAT board (which contains the 8×8 RGB matrix). This viewport is a high-fidelity emulation showing how an external HD44780 16×2 LCD connected to the I2C bus (address 0x27) behaves in the real world when programs send I2C commands.
        </div>
      </div>

      {/* LCD Hardware Bezel */}
      <div className="bg-slate-850 bg-slate-900 p-3 sm:p-4 rounded-xl border-4 border-slate-700 shadow-md flex flex-col items-center">
        {/* PCB Screws and Status */}
        <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1.5 px-1">
          <span>I2C ADDR: 0x27 (PCF8574T)</span>
          <span className="flex items-center gap-1">
            {isEmulationDisconnected ? (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <PowerOff className="w-3 h-3" />
                <span>POWER: OFF (HARDWARE NOT CONNECTED)</span>
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Sun className="w-3 h-3" />
                <span>BACKLIGHT: {isBacklit ? 'ON' : 'OFF'}</span>
              </span>
            )}
          </span>
        </div>

        {/* Realistic Glass LCD Screen */}
        <div
          className={`w-full max-w-[460px] py-4 px-5 rounded-lg border-2 font-mono tracking-widest text-base sm:text-lg select-none shadow-inner transition-colors duration-300 ${
            isEmulationDisconnected
              ? 'bg-slate-950 text-slate-600 border-slate-900 shadow-none'
              : isBacklit
              ? 'bg-[#0044aa] text-white border-[#002266] shadow-[inset_0_0_18px_rgba(0,100,255,0.6)]'
              : 'bg-slate-900 text-slate-600 border-slate-950'
          }`}
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            textShadow: isBacklit && !isEmulationDisconnected ? '0 0 6px rgba(255, 255, 255, 0.85)' : 'none',
          }}
        >
          {/* Row 0 */}
          <div className="flex justify-between items-center whitespace-pre border-b border-blue-400/20 pb-1">
            <span>{line0}</span>
          </div>
          {/* Row 1 */}
          <div className="flex justify-between items-center whitespace-pre pt-1">
            <span>{line1}</span>
          </div>
        </div>

        {/* Footer Hardware Info or Connect Button */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-400 mt-2.5 px-1 gap-2">
          <span>SDA: GPIO 2 (Pin 3) · SCL: GPIO 3 (Pin 5)</span>
          {isEmulationDisconnected ? (
            <div className="flex items-center gap-2">
              <span className="text-rose-400 font-semibold">● Signals Inactive (Emulation Disconnected)</span>
              {onConnectHardware && (
                <button
                  onClick={onConnectHardware}
                  disabled={isProbingHardware}
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-[10px] transition-colors"
                >
                  ⚡ Probe Hardware Pins
                </button>
              )}
            </div>
          ) : (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>
                {hasTextFromCode ? 'Code Output Synchronized' : 'Ready for Code Execution'}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
