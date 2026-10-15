import { useState, useRef, useEffect } from 'react';
import { Terminal, Shield, CheckCircle2, CornerDownLeft, Network, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface SshTerminalProps {
  onExecCommand: (cmd: string) => Promise<string>;
}

interface CommandLog {
  id: string;
  type: 'cmd' | 'output' | 'system';
  text: string;
}

export function SshTerminal({ onExecCommand }: SshTerminalProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hostInput, setHostInput] = useState('pi@raspberrypi.local');
  const [passwordInput, setPasswordInput] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [logs, setLogs] = useState<CommandLog[]>([
    {
      id: 'log-1',
      type: 'system',
      text: `Linux raspberrypi 6.6.20+rpt-rpi-v8 #1 SMP PREEMPT Debian 12 (bookworm) aarch64\nPi-Digit Hardware Bash Terminal: ACTIVE\n[Network Notice: Pi-Digit daemon running on Raspberry Pi, accessible over local network via browser and SSH]\nType 'help' or click quick commands to execute Python scripts or system diagnostics.\n`,
    },
  ]);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only scroll within the terminal's internal container, preserving the user's viewport
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnected(true);
    setLogs([
      {
        id: 'log-1',
        type: 'system',
        text: `OpenSSH_9.2p1 Debian-2+deb12u2, OpenSSL 3.0.11\nConnecting to ${hostInput} (port 22) on local subnet...\nSession authenticated.`,
      },
      {
        id: 'log-2',
        type: 'system',
        text: `Linux raspberrypi 6.6.20+rpt-rpi-v8 #1 SMP PREEMPT Debian 12 (bookworm) aarch64\nPi-Digit Hardware Emulation Bridge: ACTIVE\nType 'help' or click quick commands to interact with the Raspberry Pi hardware.\n`,
      },
    ]);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setLogs([]);
  };

  const handleRunCommand = async (cmdToRun: string) => {
    const cmd = cmdToRun.trim();
    if (!cmd) return;

    setLogs((prev) => [
      ...prev,
      { id: 'cmd-' + Date.now(), type: 'cmd', text: `pi@raspberrypi:~$ ${cmd}` },
    ]);
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommandInput('');

    if (cmd === 'clear') {
      setLogs([]);
      return;
    }

    if (cmd === 'help') {
      const helpText = `Pi-Digit Bash Terminal Commands:
  • python3 10_pwm_waveform.py - Generates PWM on GPIO 18 (streams to live Oscilloscope)
  • python3 02_red_pixel.py   - Moves red pixel diagonally across Sense HAT matrix
  • python3 03_color_cycle.py  - Cycles full 8x8 matrix through rainbow colors
  • python3 sensor_logger.py   - Polls and logs sensor telemetry batch
  • pinout                    - Displays Raspberry Pi 40-pin header layout
  • i2cdetect -y 1            - Scans I2C bus for Sense HAT (0x46, 0x5c, 0x6a)
  • vcgencmd measure_temp     - Reads current BCM2711 SoC temperature
  • cat /proc/cpuinfo         - Reads Raspberry Pi 4 CPU specifications
  • uname -a                  - Displays Linux kernel version
  • ls -la                    - Lists files in student home directory
  • clear                     - Clears terminal output`;
      setLogs((prev) => [...prev, { id: 'out-' + Date.now(), type: 'output', text: helpText }]);
      return;
    }

    const output = await onExecCommand(cmd);
    setLogs((prev) => [...prev, { id: 'out-' + Date.now(), type: 'output', text: output }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCommandInput(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommandInput('');
        } else {
          setHistoryIndex(nextIdx);
          setCommandInput(commandHistory[nextIdx]);
        }
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4 text-slate-800">
      {/* Header with Network Constraint Clarification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#840038]" />
            <span>Raspberry Pi SSH Bash Terminal Emulator</span>
          </h2>
          <span className="text-xs text-slate-500 block mt-0.5">
            Secure Shell (SSH) connection directly into the Pi-Digit physical computing runtime.
          </span>
        </div>

        {isConnected && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>pi@raspberrypi:~$</span>
            </span>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors flex items-center gap-1"
            >
              <span>{isCollapsed ? 'Expand Terminal' : 'Collapse'}</span>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-[#840038] hover:text-white text-slate-700 rounded border border-slate-300 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && !isConnected && (
        /* SSH Login Gateway Screen with Explicit Network Requirement Notice */
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center max-w-xl mx-auto w-full my-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#840038]/10 border border-[#840038]/30 flex items-center justify-center text-[#840038] mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-mono mb-1">
            Connect to Raspberry Pi via SSH
          </h3>
          <p className="text-xs text-slate-600 text-center mb-4">
            Log in to the local Raspberry Pi 4 to initiate the interactive bash shell and digital twin emulator.
          </p>

          {/* Explicit Local Network Requirement Callout (User Requested) */}
          <div className="w-full p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 mb-5 flex items-start gap-2.5">
            <Network className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <strong className="text-amber-900 block font-sans">
                Network Requirement for Hardware Connection:
              </strong>
              <p className="leading-relaxed text-[11px] text-amber-900/90">
                This connection will only link to physical hardware if <strong>both this web application and the Raspberry Pi are on the same local network</strong> (Wi-Fi or LAN subnet), or if you are <strong>running this application locally on the Raspberry Pi</strong> (<code className="font-mono bg-amber-100 px-1 rounded">http://localhost:3000</code>).
              </p>
            </div>
          </div>

          <form onSubmit={handleConnect} className="w-full flex flex-col gap-3">
            <div>
              <label className="text-xs font-mono font-bold text-slate-700 block mb-1">
                Target Host / User:
              </label>
              <input
                type="text"
                value={hostInput}
                onChange={(e) => setHostInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#840038]"
              />
              <span className="text-[10px] text-slate-400 font-mono block mt-1">
                Use hostname <code className="text-slate-600">pi@raspberrypi.local</code> or IP <code className="text-slate-600">pi@192.168.x.x</code>
              </span>
            </div>

            <div>
              <label className="text-xs font-mono font-bold text-slate-700 block mb-1">
                Password:
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="raspberry (default)"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#840038]"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-2 bg-[#840038] hover:bg-[#6c002e] text-white rounded font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <span>Authenticate & Enter Emulator Shell</span>
            </button>
          </form>
        </div>
      )}

      {!isCollapsed && isConnected && (
        /* Connected Interactive Bash Terminal Session */
        <div className="flex flex-col gap-3">
          {/* Quick-Launch Command Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
            <span className="text-slate-500 shrink-0 text-[11px] font-bold">Quick Commands:</span>
            <button
              onClick={() => handleRunCommand('python3 02_moving_name.py')}
              className="px-2 py-1 rounded bg-amber-50 hover:bg-[#840038] text-amber-900 hover:text-white border border-amber-300 transition-colors shrink-0 text-[11px] font-bold"
            >
              python3 02_moving_name.py (Name Marquee)
            </button>
            <button
              onClick={() => handleRunCommand('python3 10_pwm_waveform.py')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors shrink-0 text-[11px]"
            >
              python3 10_pwm_waveform.py (PWM Oscilloscope)
            </button>
            <button
              onClick={() => handleRunCommand('python3 02_red_pixel.py')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors shrink-0 text-[11px]"
            >
              python3 02_red_pixel.py (Sense HAT)
            </button>
            <button
              onClick={() => handleRunCommand('python3 03_color_cycle.py')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors shrink-0 text-[11px]"
            >
              python3 03_color_cycle.py (Color Cycle)
            </button>
            <button
              onClick={() => handleRunCommand('python3 sensor_logger.py')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors shrink-0 text-[11px]"
            >
              python3 sensor_logger.py (Log Telemetry)
            </button>
            <button
              onClick={() => handleRunCommand('pinout')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors shrink-0 text-[11px]"
            >
              pinout
            </button>
            <button
              onClick={() => handleRunCommand('i2cdetect -y 1')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors shrink-0 text-[11px]"
            >
              i2cdetect -y 1
            </button>
            <button
              onClick={() => handleRunCommand('vcgencmd measure_temp')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors shrink-0 text-[11px]"
            >
              vcgencmd measure_temp
            </button>
            <button
              onClick={() => handleRunCommand('help')}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#840038] text-slate-700 hover:text-white border border-slate-300 transition-colors shrink-0 text-[11px]"
            >
              help
            </button>
          </div>

          {/* Terminal Screen Glass */}
          <div
            ref={terminalContainerRef}
            style={{
              backgroundColor: 'var(--terminal-bg)',
              borderColor: 'var(--terminal-border)',
              color: 'var(--terminal-text)',
            }}
            className="rounded-lg border p-4 font-mono text-xs min-h-[220px] max-h-[380px] overflow-y-auto flex flex-col gap-1 shadow-inner select-text transition-colors duration-200"
          >
            {logs.map((log) => (
              <div
                key={log.id}
                className={`whitespace-pre-wrap leading-relaxed ${
                  log.type === 'system'
                    ? 'text-[var(--terminal-prompt)]'
                    : log.type === 'cmd'
                    ? 'text-[var(--theme-accent)] font-bold'
                    : 'text-[var(--terminal-text)]'
                }`}
              >
                {log.text}
              </div>
            ))}
          </div>

          {/* Bash Input Line */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunCommand(commandInput);
            }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
          >
            <span className="text-amber-400 font-bold select-none shrink-0">
              pi@raspberrypi:~$
            </span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type bash command (e.g. python3 10_pwm_waveform.py)..."
              className="flex-1 bg-transparent text-white focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-[#840038] hover:bg-[#6c002e] text-white rounded text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <CornerDownLeft className="w-3 h-3 text-amber-300" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
