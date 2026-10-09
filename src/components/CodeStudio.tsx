import { useState, useRef, useEffect } from 'react';
import { CURRICULUM_EXAMPLES } from '../data/curriculumExamples';
import {
  ProgramLanguage,
  ProgramExecution,
  TerminalOutput,
} from '../types/digitalTwin';

interface CodeStudioProps {
  program: ProgramExecution;
  terminalOutputs: TerminalOutput[];
  onRunProgram: (code: string, language: ProgramLanguage, filename: string, timeoutMs: number) => void;
  onStopProgram: () => void;
  onClearTerminal: () => void;
  onExecBashCommand?: (cmd: string) => Promise<string>;
}

interface BashLog {
  id: string;
  type: 'cmd' | 'output' | 'system';
  text: string;
}

export function CodeStudio({
  program,
  terminalOutputs,
  onRunProgram,
  onStopProgram,
  onClearTerminal,
  onExecBashCommand,
}: CodeStudioProps) {
  const [selectedExampleId, setSelectedExampleId] = useState<string>(CURRICULUM_EXAMPLES[0].id);
  const [currentCode, setCurrentCode] = useState<string>(CURRICULUM_EXAMPLES[0].code);
  const [currentLanguage, setCurrentLanguage] = useState<ProgramLanguage>(CURRICULUM_EXAMPLES[0].language);
  const [currentFilename, setCurrentFilename] = useState<string>(CURRICULUM_EXAMPLES[0].filename);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(10);
  const [isExamplesMenuOpen, setIsExamplesMenuOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Bottom panel tab: 'output' vs 'terminal' (VS Code style)
  const [activeBottomTab, setActiveBottomTab] = useState<'output' | 'terminal'>('output');

  // Bash Shell State
  const [bashLogs, setBashLogs] = useState<BashLog[]>([
    {
      id: 'bash-init-1',
      type: 'system',
      text: `Linux raspberrypi 6.6.20+rpt-rpi-v8 #1 SMP PREEMPT Debian 12 (bookworm) aarch64\nPi-Digit Bash Terminal: READY\nRemote Access: ssh pi@raspberrypi.local\n(Make sure the Pi and the computer are on the same network)\nType 'help' or select a quick command below to run.`,
    },
  ]);
  const [bashInput, setBashInput] = useState<string>('');
  const [bashHistory, setBashHistory] = useState<string[]>([]);
  const [bashHistoryIndex, setBashHistoryIndex] = useState<number>(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const bashBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeBottomTab === 'output') {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutputs, activeBottomTab]);

  useEffect(() => {
    if (activeBottomTab === 'terminal') {
      bashBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bashLogs, activeBottomTab]);

  const handleSelectExample = (id: string) => {
    const ex = CURRICULUM_EXAMPLES.find((e) => e.id === id);
    if (ex) {
      setSelectedExampleId(ex.id);
      setCurrentCode(ex.code);
      setCurrentLanguage(ex.language);
      setCurrentFilename(ex.filename);
      setIsExamplesMenuOpen(false);
    }
  };

  const handleRun = () => {
    setActiveBottomTab('output');
    onRunProgram(currentCode, currentLanguage, currentFilename, timeoutSeconds * 1000);
  };

  // Save Code to Local Drive
  const handleSaveToDisk = () => {
    try {
      const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFilename || (currentLanguage === 'python' ? 'script.py' : 'main.c');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch {
      setSaveStatus('Save Error');
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  // Open / Upload Code from Local Drive
  const handleOpenFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === 'string') {
        setCurrentCode(content);
        setCurrentFilename(file.name);
        if (file.name.endsWith('.c') || file.name.endsWith('.h')) {
          setCurrentLanguage('c');
        } else if (file.name.endsWith('.py')) {
          setCurrentLanguage('python');
        }
        setSaveStatus(`Opened ${file.name}`);
        setTimeout(() => setSaveStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Bash Terminal Command Execution
  const handleRunBashCommand = async (cmdToRun: string) => {
    const cmd = cmdToRun.trim();
    if (!cmd) return;

    setBashLogs((prev) => [
      ...prev,
      { id: 'cmd-' + Date.now(), type: 'cmd', text: `pi@raspberrypi:~$ ${cmd}` },
    ]);
    setBashHistory((prev) => [...prev, cmd]);
    setBashHistoryIndex(-1);
    setBashInput('');

    if (cmd === 'clear') {
      setBashLogs([]);
      return;
    }

    if (cmd === 'help') {
      const helpText = `Available Pi-Digit Commands:
  python3 10_gpio_blink.py   - Blinks GPIO 17 LED (updates Digital Twin)
  python3 02_red_pixel.py    - Animates pixel on 8x8 Sense HAT matrix
  python3 03_color_cycle.py  - Cycles 8x8 matrix rainbow colors
  python3 sensor_logger.py   - Queries HTS221 & LPS25H sensor telemetry
  pinout                     - Shows Raspberry Pi 40-pin GPIO map
  i2cdetect -y 1             - Scans I2C bus 1 (Sense HAT at 0x46)
  vcgencmd measure_temp      - Measures BCM2711 SoC temperature
  uname -a                   - Kernel & architecture details
  ssh pi@raspberrypi.local   - SSH syntax (Pi and PC must be on same network)
  clear                      - Clears screen`;
      setBashLogs((prev) => [...prev, { id: 'out-' + Date.now(), type: 'output', text: helpText }]);
      return;
    }

    if (onExecBashCommand) {
      const output = await onExecBashCommand(cmd);
      setBashLogs((prev) => [...prev, { id: 'out-' + Date.now(), type: 'output', text: output }]);
    }
  };

  const handleBashKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (bashHistory.length > 0) {
        const nextIdx = bashHistoryIndex === -1 ? bashHistory.length - 1 : Math.max(0, bashHistoryIndex - 1);
        setBashHistoryIndex(nextIdx);
        setBashInput(bashHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (bashHistoryIndex !== -1) {
        const nextIdx = bashHistoryIndex + 1;
        if (nextIdx >= bashHistory.length) {
          setBashHistoryIndex(-1);
          setBashInput('');
        } else {
          setBashHistoryIndex(nextIdx);
          setBashInput(bashHistory[nextIdx]);
        }
      }
    }
  };

  const pythonExamples = CURRICULUM_EXAMPLES.filter((e) => e.language === 'python');
  const cExamples = CURRICULUM_EXAMPLES.filter((e) => e.language === 'c');
  const lineCount = currentCode.split('\n').length;
  const isRunning = program.status === 'running' || program.status === 'compiling';
  const currentExample = CURRICULUM_EXAMPLES.find((e) => e.id === selectedExampleId);

  return (
    <div className="flex flex-col gap-3 text-slate-800 min-w-0">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".py,.c,.h,.txt,.sh"
        className="hidden"
      />

      {/* Main IDE Container (VS Code Studio Look) */}
      <div className="bg-[#1e1e1e] border border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Top IDE Toolbar */}
        <div className="px-3 py-2 bg-[#252526] border-b border-[#333333] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* File Badge & Labs Selector */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsExamplesMenuOpen(!isExamplesMenuOpen)}
              className="px-2.5 py-1 rounded bg-[#333333] hover:bg-[#3e3e42] text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors border border-slate-600"
            >
              <span>Curriculum Labs</span>
              <span className="text-[10px] text-slate-400">
                {isExamplesMenuOpen ? '▲' : '▼'}
              </span>
            </button>

            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-slate-200 font-mono text-xs">
              <span className="text-amber-400 font-bold">{currentFilename}</span>
              <span className="text-[10px] text-slate-400 uppercase font-sans">
                {currentLanguage === 'python' ? 'Python 3' : 'C'}
              </span>
            </div>

            {saveStatus && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {saveStatus}
              </span>
            )}
          </div>

          {/* Right Action Controls: Open, Save, Timeout, Run */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenFileClick}
              className="px-2 py-1 rounded bg-[#2d2d2d] hover:bg-[#3a3a3a] text-slate-300 hover:text-white text-xs font-mono transition-colors border border-[#3e3e42]"
              title="Open code file from local disk"
            >
              Open
            </button>

            <button
              onClick={handleSaveToDisk}
              className="px-2 py-1 rounded bg-[#2d2d2d] hover:bg-[#3a3a3a] text-slate-300 hover:text-white text-xs font-mono transition-colors border border-[#3e3e42]"
              title="Save current code to local disk"
            >
              Save
            </button>

            <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px] ml-1">
              <span>Timeout:</span>
              <select
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                className="bg-[#1e1e1e] border border-[#3e3e42] rounded px-1.5 py-0.5 text-slate-200 text-xs focus:outline-none"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={20}>20s</option>
              </select>
            </div>

            {isRunning ? (
              <button
                onClick={onStopProgram}
                className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>■ Stop</span>
              </button>
            ) : (
              <button
                onClick={handleRun}
                className="px-3 py-1 bg-[#840038] hover:bg-[#a00045] text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>▶ Run</span>
              </button>
            )}
          </div>
        </div>

        {/* Retractable Examples Drawer */}
        {isExamplesMenuOpen && (
          <div className="p-3 bg-[#252526] border-b border-[#333333] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in slide-in-from-top-1 duration-150">
            {/* Python Examples */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-mono font-bold text-amber-400 pb-1 border-b border-[#3c3c3c] flex justify-between">
                <span>PYTHON 3 ({pythonExamples.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">Select to load</span>
              </span>
              <div className="grid grid-cols-1 gap-1 max-h-44 overflow-y-auto pr-1">
                {pythonExamples.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleSelectExample(ex.id)}
                    className={`text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between font-mono ${
                      selectedExampleId === ex.id
                        ? 'bg-[#840038] text-white font-medium'
                        : 'text-slate-300 hover:bg-[#333333] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{ex.title}</span>
                    <span className="text-[10px] opacity-60 ml-1">.py</span>
                  </button>
                ))}
              </div>
            </div>

            {/* C Examples */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-mono font-bold text-cyan-400 pb-1 border-b border-[#3c3c3c] flex justify-between">
                <span>GCC C ({cExamples.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">Select to load</span>
              </span>
              <div className="grid grid-cols-1 gap-1 max-h-44 overflow-y-auto pr-1">
                {cExamples.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleSelectExample(ex.id)}
                    className={`text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between font-mono ${
                      selectedExampleId === ex.id
                        ? 'bg-[#840038] text-white font-medium'
                        : 'text-slate-300 hover:bg-[#333333] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{ex.title}</span>
                    <span className="text-[10px] opacity-60 ml-1">.c</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 pt-1 border-t border-[#3c3c3c] text-[10px] font-mono text-slate-400 flex justify-between">
              <span className="truncate">{currentExample?.description}</span>
              <button
                onClick={() => setIsExamplesMenuOpen(false)}
                className="text-amber-400 hover:underline shrink-0 ml-2"
              >
                Close [▲]
              </button>
            </div>
          </div>
        )}

        {/* Code Editor Area */}
        <div className="flex bg-[#1e1e1e] text-slate-100 overflow-hidden text-xs font-mono min-h-[300px] max-h-[350px]">
          {/* Line Numbers */}
          <div className="w-10 py-2.5 bg-[#181818] text-[#858585] select-none text-right pr-2.5 font-mono border-r border-[#2d2d2d] shrink-0 text-[11px]">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={currentCode}
            onChange={(e) => setCurrentCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full p-2.5 bg-transparent text-slate-200 font-mono leading-5 resize-none focus:outline-none overflow-y-auto selection:bg-[#264f78] whitespace-pre"
          />
        </div>

        {/* VS Code Bottom Panel: OUTPUT vs TERMINAL Tabs */}
        <div className="border-t border-[#2d2d2d] flex flex-col bg-[#181818]">
          {/* Panel Header Tabs */}
          <div className="px-3 py-1 bg-[#252526] border-b border-[#333333] flex items-center justify-between text-xs font-mono">
            {/* Left: Tab Switcher */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveBottomTab('output')}
                className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                  activeBottomTab === 'output'
                    ? 'border-amber-400 text-white font-bold bg-[#1e1e1e]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Output</span>
                {program.status === 'running' && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveBottomTab('terminal')}
                className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                  activeBottomTab === 'terminal'
                    ? 'border-amber-400 text-white font-bold bg-[#1e1e1e]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Terminal</span>
                <span className="ml-1 text-[10px] text-emerald-400 font-normal lowercase">(bash)</span>
              </button>
            </div>

            {/* Right: Status & Clear */}
            <div className="flex items-center gap-2 text-xs">
              {activeBottomTab === 'output' && (
                <>
                  {program.status === 'completed' && (
                    <span className="text-[10px] text-emerald-400 font-mono font-medium">
                      Exit Code: 0
                    </span>
                  )}
                  {(program.status === 'error' || program.status === 'terminated') && (
                    <span className="text-[10px] text-rose-400 font-mono font-medium">
                      Exit Code: {program.exitCode ?? 1}
                    </span>
                  )}
                  <button
                    onClick={onClearTerminal}
                    className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#3e3e42] text-slate-300 text-[10px] font-mono transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}

              {activeBottomTab === 'terminal' && (
                <>
                  <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">
                    pi@raspberrypi.local
                  </span>
                  <button
                    onClick={() => setBashLogs([])}
                    className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#3e3e42] text-slate-300 text-[10px] font-mono transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* TAB 1: OUTPUT CONSOLE */}
          {activeBottomTab === 'output' && (
            <div className="p-2.5 text-xs font-mono overflow-y-auto flex flex-col gap-1 min-h-[170px] max-h-[220px] select-text bg-[#1e1e1e]">
              {terminalOutputs.length === 0 ? (
                <div className="text-slate-500 italic text-[11px] p-1">
                  Ready. Click &quot;▶ Run&quot; above to execute the script in this console.
                </div>
              ) : (
                terminalOutputs.map((out) => (
                  <div
                    key={out.id}
                    className={`leading-relaxed whitespace-pre-wrap ${
                      out.stream === 'stderr'
                        ? 'text-rose-400'
                        : out.stream === 'system'
                        ? 'text-amber-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {out.text}
                  </div>
                ))
              )}
              <div ref={terminalBottomRef} />
            </div>
          )}

          {/* TAB 2: INTERACTIVE BASH TERMINAL */}
          {activeBottomTab === 'terminal' && (
            <div className="flex flex-col bg-[#1e1e1e] min-h-[170px] max-h-[240px]">
              {/* Quick Bash Commands Bar */}
              <div className="px-2.5 py-1.5 bg-[#252526] border-b border-[#2d2d2d] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono shrink-0">
                <span className="text-slate-400 shrink-0 font-medium">Quick:</span>
                <button
                  onClick={() => handleRunBashCommand('python3 10_gpio_blink.py')}
                  className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 border border-[#3e3e42] transition-colors shrink-0"
                >
                  python3 10_gpio_blink.py
                </button>
                <button
                  onClick={() => handleRunBashCommand('python3 02_red_pixel.py')}
                  className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 border border-[#3e3e42] transition-colors shrink-0"
                >
                  python3 02_red_pixel.py
                </button>
                <button
                  onClick={() => handleRunBashCommand('python3 03_color_cycle.py')}
                  className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 border border-[#3e3e42] transition-colors shrink-0"
                >
                  python3 03_color_cycle.py
                </button>
                <button
                  onClick={() => handleRunBashCommand('pinout')}
                  className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 border border-[#3e3e42] transition-colors shrink-0"
                >
                  pinout
                </button>
                <button
                  onClick={() => handleRunBashCommand('i2cdetect -y 1')}
                  className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 border border-[#3e3e42] transition-colors shrink-0"
                >
                  i2cdetect -y 1
                </button>
                <button
                  onClick={() => handleRunBashCommand('vcgencmd measure_temp')}
                  className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 border border-[#3e3e42] transition-colors shrink-0"
                >
                  vcgencmd measure_temp
                </button>
                <button
                  onClick={() => handleRunBashCommand('uname -a')}
                  className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 border border-[#3e3e42] transition-colors shrink-0"
                >
                  uname -a
                </button>
                <button
                  onClick={() => handleRunBashCommand('help')}
                  className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 border border-[#3e3e42] transition-colors shrink-0"
                >
                  help
                </button>
              </div>

              {/* Scrolling Terminal Output Buffer */}
              <div className="flex-1 p-2.5 text-xs font-mono overflow-y-auto flex flex-col gap-1 select-text">
                {bashLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`leading-relaxed whitespace-pre-wrap ${
                      log.type === 'system'
                        ? 'text-cyan-400'
                        : log.type === 'cmd'
                        ? 'text-amber-300 font-bold'
                        : 'text-slate-200'
                    }`}
                  >
                    {log.text}
                  </div>
                ))}
                <div ref={bashBottomRef} />
              </div>

              {/* Bash Prompt Input Line */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunBashCommand(bashInput);
                }}
                className="px-3 py-1.5 bg-[#181818] border-t border-[#2d2d2d] flex items-center gap-2 text-xs font-mono"
              >
                <span className="text-amber-400 font-bold select-none shrink-0">
                  pi@raspberrypi:~$
                </span>
                <input
                  type="text"
                  value={bashInput}
                  onChange={(e) => setBashInput(e.target.value)}
                  onKeyDown={handleBashKeyDown}
                  placeholder="Type bash command (e.g. python3 10_gpio_blink.py)..."
                  className="flex-1 bg-transparent text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-[#840038] hover:bg-[#a00045] text-white rounded text-xs font-bold transition-colors"
                >
                  ↵
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
