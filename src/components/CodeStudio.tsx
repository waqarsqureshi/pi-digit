import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  Upload,
  Download,
  FolderCode,
  Terminal,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
  Check,
  Code2,
  HelpCircle,
} from 'lucide-react';
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

function highlightTokens(line: string, language: ProgramLanguage): React.ReactNode[] {
  if (!line) return [' '];

  // Comment check
  if (language === 'python' && line.trimStart().startsWith('#')) {
    return [<span key="comment" className="text-[#6a9955] italic">{line}</span>];
  }
  if (language === 'c' && (line.trimStart().startsWith('//') || line.trimStart().startsWith('/*'))) {
    return [<span key="comment" className="text-[#6a9955] italic">{line}</span>];
  }

  // Token regex for strings, numbers, keywords, identifiers, and symbols
  const tokenRegex = /(".*?"|'.*?'|#.*|\/\/.*|\b(?:def|class|import|from|return|if|elif|else|for|while|in|try|except|finally|with|as|lambda|pass|break|continue|True|False|None|and|or|not|is|int|void|char|float|double|struct|const|static|sizeof)\b|\b\d+(?:\.\d+)?\b|\b(?:SenseHat|GPIO|EmulatorSenseHat|EmulatorGPIO|LCD|System)\b|[A-Za-z_][A-Za-z0-9_]*|[^\s\w]+|\s+)/g;

  const matches = line.match(tokenRegex) || [line];
  const pythonKeywords = new Set(['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'try', 'except', 'finally', 'with', 'as', 'lambda', 'pass', 'break', 'continue', 'True', 'False', 'None', 'and', 'or', 'not', 'is']);
  const cKeywords = new Set(['int', 'void', 'char', 'float', 'double', 'struct', 'const', 'static', 'sizeof', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', '#include', '#define']);
  const hardwareTypes = new Set(['SenseHat', 'GPIO', 'EmulatorSenseHat', 'EmulatorGPIO', 'LCD', 'System']);

  return matches.map((token, idx) => {
    if (token.startsWith('#') || token.startsWith('//')) {
      return <span key={idx} className="text-[#6a9955] italic">{token}</span>;
    }
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return <span key={idx} className="text-[#ce9178]">{token}</span>;
    }
    if (/^\d+(?:\.\d+)?$/.test(token) || /^0x[0-9a-fA-F]+$/.test(token)) {
      return <span key={idx} className="text-[#b5cea8]">{token}</span>;
    }
    if (pythonKeywords.has(token) || cKeywords.has(token)) {
      return <span key={idx} className="text-[#c586c0] font-semibold">{token}</span>;
    }
    if (hardwareTypes.has(token)) {
      return <span key={idx} className="text-[#4ec9b0] font-semibold">{token}</span>;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token) && idx + 1 < matches.length && matches[idx + 1].trim().startsWith('(')) {
      return <span key={idx} className="text-[#dcdcaa]">{token}</span>;
    }
    return <span key={idx} className="text-[#d4d4d4]">{token}</span>;
  });
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const bashContainerRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea, syntax highlight pre, and line numbers
  const handleEditorScroll = () => {
    if (textareaRef.current) {
      const top = textareaRef.current.scrollTop;
      const left = textareaRef.current.scrollLeft;
      if (preRef.current) {
        preRef.current.scrollTop = top;
        preRef.current.scrollLeft = left;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = top;
      }
    }
  };

  useEffect(() => {
    if (activeBottomTab === 'output' && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalOutputs, activeBottomTab]);

  useEffect(() => {
    if (activeBottomTab === 'terminal' && bashContainerRef.current) {
      bashContainerRef.current.scrollTop = bashContainerRef.current.scrollHeight;
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
  python3 10_pwm_waveform.py - Generates PWM on GPIO 18 (streams to live Oscilloscope)
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
        const nextIdx = bashHistoryIndex + 1 < bashHistory.length ? bashHistoryIndex + 1 : bashHistoryIndex;
        setBashHistoryIndex(nextIdx);
        setBashInput(bashHistory[bashHistory.length - 1 - nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (bashHistoryIndex > 0) {
        const nextIdx = bashHistoryIndex - 1;
        setBashHistoryIndex(nextIdx);
        setBashInput(bashHistory[bashHistory.length - 1 - nextIdx] || '');
      } else if (bashHistoryIndex === 0) {
        setBashHistoryIndex(-1);
        setBashInput('');
      }
    }
  };

  const currentExample = CURRICULUM_EXAMPLES.find((e) => e.id === selectedExampleId);
  const lineCount = currentCode.split('\n').length;
  const isRunning = program.status === 'running';

  const pythonExamples = CURRICULUM_EXAMPLES.filter((e) => e.language === 'python');
  const cExamples = CURRICULUM_EXAMPLES.filter((e) => e.language === 'c');

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".py,.c,.h,.txt,.sh"
        className="hidden"
      />

      {/* Main IDE Container (VS Code Studio Look) */}
      <div className="bg-[#1e1e1e] border border-slate-700/60 rounded-xl overflow-hidden shadow-xs flex flex-col">
        {/* Top IDE Toolbar */}
        <div className="px-3 py-2 bg-[#252526] border-b border-[#333333] flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* File Tab & Curriculum Selector */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Active File Tab */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-[#1e1e1e] border border-[#3e3e42] rounded-md text-slate-200 text-xs font-medium shadow-2xs">
              <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono text-slate-100 font-semibold truncate max-w-[150px] sm:max-w-[200px]">
                {currentFilename}
              </span>
              <span className="text-[10px] text-slate-400 uppercase px-1 py-0.2 bg-white/5 rounded">
                {currentLanguage === 'python' ? 'Python' : 'C'}
              </span>
            </div>

            {/* Curriculum Labs Trigger */}
            <button
              onClick={() => setIsExamplesMenuOpen(!isExamplesMenuOpen)}
              className="px-2.5 py-1 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-[#3e3e42] cursor-pointer"
              title="Browse curriculum sample programs"
            >
              <FolderCode className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden sm:inline">Labs ({CURRICULUM_EXAMPLES.length})</span>
              <span className="sm:hidden">Labs</span>
              {isExamplesMenuOpen ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {saveStatus && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{saveStatus}</span>
              </span>
            )}
          </div>

          {/* Right Action Controls: Open, Save, Timeout, Run */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleOpenFileClick}
              className="px-2.5 py-1 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-300 hover:text-white text-xs font-medium transition-colors border border-[#3e3e42] flex items-center gap-1 cursor-pointer"
              title="Open code file from local disk"
            >
              <Upload className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Open</span>
            </button>

            <button
              onClick={handleSaveToDisk}
              className="px-2.5 py-1 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-300 hover:text-white text-xs font-medium transition-colors border border-[#3e3e42] flex items-center gap-1 cursor-pointer"
              title="Save current code to local disk"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Save</span>
            </button>

            <div className="flex items-center gap-1 text-slate-400 text-xs ml-0.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <select
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                className="bg-[#1e1e1e] border border-[#3e3e42] rounded-md px-1.5 py-0.5 text-slate-200 text-xs focus:outline-none cursor-pointer"
                title="Execution timeout in seconds"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={20}>20s</option>
              </select>
            </div>

            {isRunning ? (
              <button
                onClick={onStopProgram}
                className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleRun}
                className="px-3.5 py-1 bg-[#840038] hover:bg-[#9d0043] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Run</span>
              </button>
            )}

            <a
              href="/wiki.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-300 hover:text-white border border-[#3e3e42] transition-colors flex items-center justify-center cursor-pointer"
              title="Open Official Documentation & Architecture Wiki"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            </a>
          </div>
        </div>

        {/* Retractable Examples Drawer */}
        {isExamplesMenuOpen && (
          <div className="p-3.5 bg-[#252526] border-b border-[#333333] grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs animate-in slide-in-from-top-1 duration-150">
            {/* Python Examples */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-[#3c3c3c]">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Python 3 Scripts ({pythonExamples.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to load</span>
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                {pythonExamples.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleSelectExample(ex.id)}
                    className={`text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      selectedExampleId === ex.id
                        ? 'bg-[#840038] text-white font-medium shadow-2xs'
                        : 'text-slate-300 hover:bg-[#333333] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{ex.title}</span>
                    <span className="text-[10px] font-mono opacity-60 ml-1">.py</span>
                  </button>
                ))}
              </div>
            </div>

            {/* C Examples */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-[#3c3c3c]">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>GCC C Programs ({cExamples.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to load</span>
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                {cExamples.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleSelectExample(ex.id)}
                    className={`text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      selectedExampleId === ex.id
                        ? 'bg-[#840038] text-white font-medium shadow-2xs'
                        : 'text-slate-300 hover:bg-[#333333] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{ex.title}</span>
                    <span className="text-[10px] font-mono opacity-60 ml-1">.c</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 pt-1.5 border-t border-[#3c3c3c] text-xs text-slate-400 flex items-center justify-between">
              <span className="truncate text-slate-300 font-mono text-[11px]">
                {currentExample?.description}
              </span>
              <button
                onClick={() => setIsExamplesMenuOpen(false)}
                className="text-amber-300 hover:text-amber-200 text-xs font-medium cursor-pointer ml-2 shrink-0"
              >
                Close Drawer ▲
              </button>
            </div>
          </div>
        )}

        {/* Code Editor Area with Real-Time Syntax Highlighting */}
        <div className="relative flex bg-[#1e1e1e] text-slate-100 overflow-hidden text-xs font-mono min-h-[300px] max-h-[360px]">
          {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="w-10 py-2.5 bg-[#181818] text-[#858585] select-none text-right pr-2.5 font-mono border-r border-[#2d2d2d] shrink-0 text-[11px] overflow-hidden"
          >
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Syntax Highlighted Pre + Synced Editable Textarea */}
          <div className="relative flex-1 overflow-hidden">
            {/* Syntax Highlight Layer */}
            <pre
              ref={preRef}
              aria-hidden="true"
              className="absolute inset-0 p-2.5 font-mono text-xs leading-5 pointer-events-none whitespace-pre overflow-hidden selection:bg-[#264f78]"
              style={{ margin: 0 }}
            >
              <code>
                {currentCode.split('\n').map((line, i) => (
                  <div key={i} className="leading-5">
                    {highlightTokens(line, currentLanguage)}
                  </div>
                ))}
              </code>
            </pre>

            {/* Transparent Textarea overlay with synced scroll */}
            <textarea
              ref={textareaRef}
              value={currentCode}
              onChange={(e) => setCurrentCode(e.target.value)}
              onScroll={handleEditorScroll}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-2.5 bg-transparent text-transparent caret-white font-mono text-xs leading-5 resize-none focus:outline-none overflow-auto whitespace-pre selection:bg-[#264f78]/50"
              style={{
                fontFamily: 'inherit',
                lineHeight: '1.25rem',
              }}
            />
          </div>
        </div>

        {/* Modern Bottom Panel: OUTPUT vs TERMINAL Tabs */}
        <div className="border-t border-[#2d2d2d] flex flex-col bg-[#181818]">
          {/* Panel Header Tabs */}
          <div className="px-3 py-1.5 bg-[#252526] border-b border-[#333333] flex items-center justify-between text-xs">
            {/* Left: Modern Segmented Tab Switcher */}
            <div className="inline-flex p-0.5 bg-[#1a1a1a] rounded-lg border border-[#333333]">
              <button
                onClick={() => setActiveBottomTab('output')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeBottomTab === 'output'
                    ? 'bg-[#2d2d30] text-white shadow-2xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Output</span>
                {program.status === 'running' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveBottomTab('terminal')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeBottomTab === 'terminal'
                    ? 'bg-[#2d2d30] text-white shadow-2xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3 h-3 text-slate-400" />
                <span>Terminal</span>
                <span className="text-[10px] text-emerald-400 font-mono">(bash)</span>
              </button>
            </div>

            {/* Right: Status & Clear */}
            <div className="flex items-center gap-2 text-xs">
              {activeBottomTab === 'output' && (
                <>
                  {program.status === 'completed' && (
                    <span className="text-[11px] text-emerald-400 font-mono font-medium">
                      Exit Code: 0
                    </span>
                  )}
                  {(program.status === 'error' || program.status === 'terminated') && (
                    <span className="text-[11px] text-rose-400 font-mono font-medium">
                      Exit Code: {program.exitCode ?? 1}
                    </span>
                  )}
                  <button
                    onClick={onClearTerminal}
                    className="px-2 py-1 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-300 hover:text-white text-xs font-medium transition-colors border border-[#3e3e42] flex items-center gap-1 cursor-pointer"
                    title="Clear program output console"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </>
              )}

              {activeBottomTab === 'terminal' && (
                <>
                  <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">
                    pi@raspberrypi.local
                  </span>
                  <button
                    onClick={() => setBashLogs([])}
                    className="px-2 py-1 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-300 hover:text-white text-xs font-medium transition-colors border border-[#3e3e42] flex items-center gap-1 cursor-pointer"
                    title="Clear bash terminal history"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* TAB 1: OUTPUT CONSOLE */}
          {activeBottomTab === 'output' && (
            <div
              ref={terminalContainerRef}
              style={{ backgroundColor: 'var(--terminal-bg)', color: 'var(--terminal-text)' }}
              className="p-3 text-xs font-mono overflow-y-auto flex flex-col gap-1 min-h-[170px] max-h-[220px] select-text transition-colors duration-200"
            >
              {terminalOutputs.length === 0 ? (
                <div className="text-slate-500 italic text-xs p-1">
                  Ready. Click &quot;Run&quot; above to execute the script in this console.
                </div>
              ) : (
                terminalOutputs.map((out) => (
                  <div
                    key={out.id}
                    className={`leading-relaxed whitespace-pre-wrap ${
                      out.stream === 'stderr'
                        ? 'text-rose-400'
                        : out.stream === 'system'
                        ? 'text-amber-300'
                        : 'text-[var(--terminal-text)]'
                    }`}
                  >
                    {out.text}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE BASH TERMINAL */}
          {activeBottomTab === 'terminal' && (
            <div
              style={{ backgroundColor: 'var(--terminal-bg)' }}
              className="flex flex-col min-h-[170px] max-h-[240px] transition-colors duration-200"
            >
              {/* Quick Bash Commands Bar */}
              <div className="px-2.5 py-1.5 bg-[#252526] border-b border-[#2d2d2d] flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
                <span className="text-slate-400 shrink-0 font-medium text-[11px]">Quick:</span>
                <button
                  onClick={() => handleRunBashCommand('python3 02_moving_name.py')}
                  className="px-2 py-0.5 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-amber-300 border border-[#3e3e42] transition-colors shrink-0 text-xs font-medium cursor-pointer"
                >
                  Name (.py)
                </button>
                <button
                  onClick={() => handleRunBashCommand('python3 10_pwm_waveform.py')}
                  className="px-2 py-0.5 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-200 border border-[#3e3e42] transition-colors shrink-0 text-xs cursor-pointer"
                >
                  PWM (.py)
                </button>
                <button
                  onClick={() => handleRunBashCommand('python3 02_red_pixel.py')}
                  className="px-2 py-0.5 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-200 border border-[#3e3e42] transition-colors shrink-0 text-xs cursor-pointer"
                >
                  Pixel (.py)
                </button>
                <button
                  onClick={() => handleRunBashCommand('python3 03_color_cycle.py')}
                  className="px-2 py-0.5 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-200 border border-[#3e3e42] transition-colors shrink-0 text-xs cursor-pointer"
                >
                  Rainbow (.py)
                </button>
                <button
                  onClick={() => handleRunBashCommand('pinout')}
                  className="px-2 py-0.5 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-200 border border-[#3e3e42] transition-colors shrink-0 text-xs font-mono cursor-pointer"
                >
                  pinout
                </button>
                <button
                  onClick={() => handleRunBashCommand('i2cdetect -y 1')}
                  className="px-2 py-0.5 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-200 border border-[#3e3e42] transition-colors shrink-0 text-xs font-mono cursor-pointer"
                >
                  i2cdetect -y 1
                </button>
                <button
                  onClick={() => handleRunBashCommand('vcgencmd measure_temp')}
                  className="px-2 py-0.5 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-slate-200 border border-[#3e3e42] transition-colors shrink-0 text-xs font-mono cursor-pointer"
                >
                  temp
                </button>
                <button
                  onClick={() => handleRunBashCommand('help')}
                  className="px-2 py-0.5 rounded-md bg-[#2d2d30] hover:bg-[#37373d] text-amber-300 border border-[#3e3e42] transition-colors shrink-0 text-xs font-medium cursor-pointer"
                >
                  help
                </button>
              </div>

              {/* Scrolling Terminal Output Buffer */}
              <div
                ref={bashContainerRef}
                className="flex-1 p-3 text-xs font-mono overflow-y-auto flex flex-col gap-1 select-text max-h-[160px]"
              >
                {bashLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`leading-relaxed whitespace-pre-wrap ${
                      log.type === 'system'
                        ? 'text-cyan-400'
                        : log.type === 'cmd'
                        ? 'text-amber-300 font-semibold'
                        : 'text-slate-200'
                    }`}
                  >
                    {log.text}
                  </div>
                ))}
              </div>

              {/* Bash Prompt Input Line */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunBashCommand(bashInput);
                }}
                className="px-3 py-2 bg-[#181818] border-t border-[#2d2d2d] flex items-center gap-2 text-xs font-mono"
              >
                <span className="text-amber-400 font-semibold select-none shrink-0">
                  pi@raspberrypi:~$
                </span>
                <input
                  type="text"
                  value={bashInput}
                  onChange={(e) => setBashInput(e.target.value)}
                  onKeyDown={handleBashKeyDown}
                  placeholder="Type bash command (e.g. python3 10_pwm_waveform.py)..."
                  className="flex-1 bg-transparent text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-[#840038] hover:bg-[#a00045] text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  ↵ Run
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
