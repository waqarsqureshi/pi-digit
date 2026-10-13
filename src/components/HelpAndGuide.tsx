import { useState } from 'react';
import {
  BookOpen,
  Terminal,
  HelpCircle,
  Network,
  DownloadCloud,
  Cpu,
  ShieldAlert,
  ChevronDown,
  Info,
  CheckCircle2,
  Laptop,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Play,
  ArrowRight,
  Globe,
  Layers,
} from 'lucide-react';

interface HelpAndGuideProps {
  onGoToWorkspace?: () => void;
}

export function HelpAndGuide({ onGoToWorkspace }: HelpAndGuideProps) {
  // Default to 'sec-getting-started' as requested
  const [activeSection, setActiveSection] = useState<string>('sec-getting-started');
  const [isTocOpen, setIsTocOpen] = useState<boolean>(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopy = (cmd: string, id: string) => {
    navigator.clipboard?.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 text-slate-800 font-sans pb-12">
      {/* Wiki Action Ribbon */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b-2 border-b-[#840038]">
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-[#840038]" />
          <span className="font-serif italic text-slate-600">
            Pi-Digit Documentation Wiki & Reference Manual
          </span>
        </div>

        {/* Quick Topic Jump Dropdown */}
        <div className="flex items-center gap-2">
          {onGoToWorkspace && (
            <button
              onClick={onGoToWorkspace}
              className="px-2.5 py-1 bg-[#840038] hover:bg-[#6c002e] text-white text-[11px] font-mono font-bold rounded flex items-center gap-1 transition-colors shadow-xs"
            >
              <Layers className="w-3 h-3 text-amber-300" />
              <span>Open Interactive Workspace</span>
            </button>
          )}

          <span className="text-slate-500 font-mono text-[11px]">Jump to Section:</span>
          <div className="relative">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-medium pl-2.5 pr-7 py-1 rounded border border-slate-300 cursor-pointer focus:outline-none"
            >
              <option value="sec-getting-started">⭐ Getting Started: Install on Pi & Open in Browser</option>
              <option value="all">Full Wiki Article (All Sections)</option>
              <option value="sec-overview">1. Overview & Concept</option>
              <option value="sec-architecture">2. Remote & Headless Architecture (Why SSH?)</option>
              <option value="sec-install">3. Installing & Running on Raspberry Pi</option>
              <option value="sec-connect">4. How to Connect: PC Browser vs SSH</option>
              <option value="sec-modes">5. Emulation vs. Simulation Guide</option>
              <option value="sec-wirefree">6. Sense HAT & Hardware PWM Peripheral Architecture</option>
              <option value="sec-pipeline">7. Educational 5-Stage Interaction Pipeline</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Wiki Document Body */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
        {/* Wiki Article Header */}
        <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-slate-900 tracking-tight">
              Pi-Digit: Technical Architecture and Remote Lab Manual
            </h1>
            <p className="text-xs text-slate-500 mt-1 italic">
              From the Pi-Digit Physical Computing Reference Library (Raspberry Pi 4 Model B & Sense HAT)
            </p>
          </div>

          {onGoToWorkspace && (
            <button
              onClick={onGoToWorkspace}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-[#840038] hover:bg-[#6c002e] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
            </button>
          )}
        </div>

        {/* Full Wiki Link Banner */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-rose-950">
            <span className="font-bold text-xs sm:text-sm">Complete Technical Documentation &amp; Wiki:</span>
            <span className="text-slate-600 hidden md:inline">&mdash; Architecture diagrams, register maps, and step-by-step Pi installation</span>
          </div>
          <a
            href="/wiki.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#840038] hover:bg-[#6c002e] text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 text-xs shadow-xs"
          >
            <span>Open Full Wiki (wiki.html)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* PROMINENT GETTING STARTED CALLOUT CARD (DEFAULT VIEW) */}
        {(activeSection === 'sec-getting-started' || activeSection === 'all') && (
          <section id="sec-getting-started" className="p-5 sm:p-6 bg-gradient-to-br from-amber-50/80 via-white to-rose-50/50 border-2 border-[#840038]/30 rounded-xl shadow-xs flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200/80 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#840038] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  🚀
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-slate-900 leading-tight">
                    Getting Started: How to Install on Raspberry Pi & Open in Browser
                  </h2>
                  <p className="text-xs text-slate-600 font-sans">
                    Complete quickstart guide to flash, deploy the daemon, and interact from any laptop browser.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                Quickstart Default
              </span>
            </div>

            {/* 4 Quick Steps Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Step 1 */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col gap-2 shadow-xs hover:border-[#840038]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#840038] text-white">
                    STEP 1
                  </span>
                  <Terminal className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">SSH into Raspberry Pi</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Open terminal (PowerShell on Windows, Terminal on Mac/Linux) and log in to your Pi:
                </p>
                <div className="bg-amber-50 border border-amber-300/80 rounded px-2 py-1 text-[10px] text-amber-900 font-sans font-medium flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Make sure the Pi and the computer are on the same network.</span>
                </div>
                <div className="mt-auto bg-slate-900 text-slate-100 p-2 rounded font-mono text-[11px] flex items-center justify-between group">
                  <span className="text-amber-300 truncate">ssh pi@raspberrypi.local</span>
                  <button
                    onClick={() => handleCopy('ssh pi@raspberrypi.local', 's1')}
                    className="text-slate-400 hover:text-white shrink-0 ml-1"
                    title="Copy command"
                  >
                    {copiedCmd === 's1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col gap-2 shadow-xs hover:border-[#840038]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#840038] text-white">
                    STEP 2
                  </span>
                  <DownloadCloud className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Automated Installer Script</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Run the turnkey installer script to configure groups, install <code>python3-sense-hat</code>, and enable kernel overlays.
                </p>
                <div className="mt-auto bg-slate-900 text-slate-100 p-2 rounded font-mono text-[11px] flex items-center justify-between group">
                  <span className="text-cyan-300 truncate">sudo apt install -y python3-sense-hat python3-rpi.gpio ...</span>
                  <button
                    onClick={() => handleCopy('sudo apt update && sudo apt install -y python3-sense-hat python3-rpi.gpio python3-smbus i2c-tools nodejs npm git gcc && sudo raspi-config nonint do_i2c 0', 's2')}
                    className="text-slate-400 hover:text-white shrink-0 ml-1"
                    title="Copy command"
                  >
                    {copiedCmd === 's2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col gap-2 shadow-xs hover:border-[#840038]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#840038] text-white">
                    STEP 3
                  </span>
                  <Play className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Clone & Start Daemon</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Clone repo, install npm packages, and launch daemon server on port 3000:
                </p>
                <div className="mt-auto bg-slate-900 text-slate-100 p-2 rounded font-mono text-[11px] flex items-center justify-between group">
                  <span className="text-emerald-300 truncate">npm install && npm start</span>
                  <button
                    onClick={() => handleCopy('git clone https://github.com/lab/pi-digit.git && cd pi-digit && npm install && npm start', 's3')}
                    className="text-slate-400 hover:text-white shrink-0 ml-1"
                    title="Copy command"
                  >
                    {copiedCmd === 's3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col gap-2 shadow-xs hover:border-[#840038]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#840038] text-white">
                    STEP 4
                  </span>
                  <Globe className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Open in Browser</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  On your laptop or tablet on the same Wi-Fi, open your browser and navigate to:
                </p>
                <div className="mt-auto bg-slate-900 text-amber-300 p-2 rounded font-mono text-[11px] flex items-center justify-between group">
                  <span className="truncate">http://raspberrypi.local:3000</span>
                  <button
                    onClick={() => handleCopy('http://raspberrypi.local:3000', 's4')}
                    className="text-slate-400 hover:text-white shrink-0 ml-1"
                    title="Copy URL"
                  >
                    {copiedCmd === 's4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Deep Dive Copy-Paste Terminal Block */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">Terminal Commands (Ready to Copy & Run on Raspberry Pi):</span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      'sudo apt update && sudo apt install -y python3-sense-hat python3-rpi.gpio python3-smbus i2c-tools nodejs npm git gcc\nsudo raspi-config nonint do_i2c 0\ngit clone https://github.com/waqarsqureshi/pi-digit.git\ncd pi-digit\nnpm install\nnpm run build\nnpm start',
                      'all_cmds'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
                >
                  {copiedCmd === 'all_cmds' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[10px]">Copy All</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="overflow-x-auto text-slate-300 leading-relaxed text-[11px]">
{`# 0. SSH into Raspberry Pi from your PC (make sure both are on the same Wi-Fi/LAN)
ssh pi@raspberrypi.local

# 1. Update APT and install Raspberry Pi hardware libraries:
#    • python3-sense-hat : Official Sense HAT library (8x8 LED matrix, 5-way joystick, IMU/temp)
#    • python3-rpi.gpio  : 40-pin GPIO pin header and hardware PWM controller
#    • python3-smbus     : I2C bus Python interface
#    • i2c-tools         : Hardware bus diagnostic utilities (i2cdetect)
#    • nodejs npm git gcc: Web daemon & C compilation tools
sudo apt update
sudo apt install -y python3-sense-hat python3-rpi.gpio python3-smbus i2c-tools nodejs npm git gcc

# 2. Enable the I2C interface (essential for Sense HAT sensors and LED matrix)
sudo raspi-config nonint do_i2c 0

# 3. Clone the Pi-Digit repository
git clone https://github.com/waqarsqureshi/pi-digit.git
cd pi-digit

# 4. Install npm dependencies and build the web application
cd ~/pi-digit
npm install
npm run build

# 5. Start the server (Listens on port 3000)
# Working directory must be ~/pi-digit
npm start`}
              </pre>

              {/* Hardware Libraries Verification Notice */}
              <div className="mt-2 p-3 bg-slate-800/80 border border-slate-700 rounded-lg flex flex-col gap-1.5 text-[11px] text-slate-300">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Raspberry Pi Libraries Checklist — Do I need to install anything?</span>
                </span>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-1 text-[10px] sm:text-[11px]">
                  <li className="text-emerald-300 font-semibold">
                    <strong>Automated Setup via installer script:</strong> The bundled script <code>bash emulator/install.sh</code> detects dependencies and configures system packages automatically.
                  </li>
                  <li>
                    <strong className="text-cyan-300">Manual Package Installation:</strong> If configuring manually on Raspberry Pi OS:
                    <div className="my-1 p-1.5 rounded bg-slate-950 font-mono text-amber-300 text-[10px]">
                      sudo apt update &amp;&amp; sudo apt install -y python3-sense-hat python3-rpi.gpio python3-smbus i2c-tools
                    </div>
                  </li>
                  <li>
                    <strong className="text-cyan-300">&bull; python3-sense-hat:</strong> Required for the physical 8&times;8 RGB LED matrix, 5-way joystick (<code className="text-amber-200">sense.stick</code>), and onboard sensors (HTS221, LPS25H, LSM9DS1).
                  </li>
                  <li>
                    <strong className="text-cyan-300">&bull; python3-rpi.gpio:</strong> Required for 40-pin GPIO header configuration and hardware PWM signal generation (<code className="text-amber-200">GPIO.PWM(18, 1000)</code>).
                  </li>
                  <li>
                    <strong className="text-cyan-300">&bull; I2C Bus Activation:</strong> Enable the hardware I2C interface via <code className="text-amber-200">sudo raspi-config nonint do_i2c 0</code>.
                  </li>
                </ul>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
                <div>
                  <span className="text-emerald-400 font-bold">&check; Once running: </span>
                  <span>Point your computer browser to </span>
                  <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">http://raspberrypi.local:3000/emulator/</code>
                  <span> or </span>
                  <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">http://localhost:3000/emulator/</code>
                </div>
                {onGoToWorkspace && (
                  <button
                    onClick={onGoToWorkspace}
                    className="text-amber-300 hover:underline font-bold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Launch Workspace Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Top Split: Wikipedia Infobox on Right + Lead Section & Table of Contents on Left */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Lead Paragraph & Wikipedia Table of Contents (7 or 8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4 text-xs leading-relaxed text-slate-700">
            <p className="text-sm text-slate-800 leading-relaxed font-sans">
              <strong>Pi-Digit</strong> is an educational digital twin and remote hardware emulator designed for physical computing courses using the <strong>Raspberry Pi 4 Model B</strong> and <strong>Raspberry Pi Sense HAT</strong>. It bridges remote, headless embedded systems programming with a live browser-based visual representation of hardware peripherals, eliminating the requirement for fragile breadboard wiring and dedicated HDMI monitors.
            </p>

            {/* MediaWiki Style Table of Contents (TOC) */}
            <div className="border border-slate-300 bg-slate-50 rounded-md p-3 my-2 max-w-md shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                <span className="font-bold text-slate-800 text-xs">Contents</span>
                <button
                  onClick={() => setIsTocOpen(!isTocOpen)}
                  className="text-[11px] text-[#840038] hover:underline font-mono"
                >
                  [{isTocOpen ? 'hide' : 'show'}]
                </button>
              </div>

              {isTocOpen && (
                <ol className="space-y-1 text-xs text-slate-700 font-sans">
                  <li>
                    <button
                      onClick={() => setActiveSection('sec-getting-started')}
                      className="text-[#840038] hover:underline font-bold text-left"
                    >
                      ⭐ Getting Started: Install on Pi & Open in Browser
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveSection('sec-overview')}
                      className="text-[#840038] hover:underline text-left"
                    >
                      1. Overview & System Objectives
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveSection('sec-architecture')}
                      className="text-[#840038] hover:underline text-left"
                    >
                      2. Headless Architecture: Why SSH and Where is the GUI?
                    </button>
                    <ol className="pl-4 space-y-0.5 text-[11px] text-slate-600">
                      <li>2.1 The Two Machines: PC/Laptop vs. Raspberry Pi</li>
                      <li>2.2 Where to Run Commands (Terminal on Your PC)</li>
                      <li>2.3 How Headless SSH Drives the Graphical Digital Twin</li>
                    </ol>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveSection('sec-install')}
                      className="text-[#840038] hover:underline text-left"
                    >
                      3. Installation and Deployment on the Raspberry Pi
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveSection('sec-connect')}
                      className="text-[#840038] hover:underline text-left"
                    >
                      4. Connecting Your Computer to the Raspberry Pi
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveSection('sec-modes')}
                      className="text-[#840038] hover:underline text-left"
                    >
                      5. Operating Modes: Hardware Emulation vs. Simulation
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveSection('sec-wirefree')}
                      className="text-[#840038] hover:underline text-left"
                    >
                      6. Wire-Free Physical Computing Peripherals
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveSection('sec-pipeline')}
                      className="text-[#840038] hover:underline text-left"
                    >
                      7. The 5-Stage Interaction Pipeline
                    </button>
                  </li>
                </ol>
              )}
            </div>
          </div>

          {/* Right Column: Wikipedia-Style Side Infobox (4 cols) */}
          <div className="lg:col-span-4 w-full border border-slate-300 bg-slate-50 rounded-lg overflow-hidden text-xs shadow-xs font-sans">
            <div className="bg-[#840038] text-white p-2.5 text-center font-bold font-serif text-sm">
              Pi-Digit Digital Twin
            </div>

            <div className="p-3 bg-white border-b border-slate-200 flex flex-col items-center gap-1 text-center">
              <div className="w-12 h-12 rounded bg-rose-50 border border-[#840038]/30 flex items-center justify-center text-[#840038]">
                <Cpu className="w-7 h-7" />
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1">
                Raspberry Pi 4 Model B Hardware Emulator
              </span>
            </div>

            <table className="w-full text-left text-[11px] divide-y divide-slate-200">
              <tbody>
                <tr>
                  <th className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700 w-1/3">Target SoC</th>
                  <td className="py-1.5 px-3 text-slate-800">Broadcom BCM2711, Quad-core Cortex-A72</td>
                </tr>
                <tr>
                  <th className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">Add-on HAT</th>
                  <td className="py-1.5 px-3 text-slate-800">Raspberry Pi Sense HAT (I2C-1)</td>
                </tr>
                <tr>
                  <th className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">Sensors</th>
                  <td className="py-1.5 px-3 text-slate-800">HTS221, LPS25H, LSM9DS1 (9-DOF IMU)</td>
                </tr>
                <tr>
                  <th className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">Display GUI</th>
                  <td className="py-1.5 px-3 text-slate-800">Web Browser on Student PC / Tablet</td>
                </tr>
                <tr>
                  <th className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">Remote Shell</th>
                  <td className="py-1.5 px-3 text-slate-800">SSH (Port 22, headless terminal)</td>
                </tr>
                <tr>
                  <th className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">Sync Bus</th>
                  <td className="py-1.5 px-3 text-slate-800">WebSockets on Port 3000</td>
                </tr>
                <tr>
                  <th className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">Languages</th>
                  <td className="py-1.5 px-3 text-slate-800">Python 3 (`pi_twin`), C (GCC `pi_twin.h`)</td>
                </tr>
                <tr>
                  <th className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">Operating OS</th>
                  <td className="py-1.5 px-3 text-slate-800">Raspberry Pi OS 12 (Bookworm) 64-bit</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 1: OVERVIEW */}
        {(activeSection === 'all' || activeSection === 'sec-overview') && (
          <section id="sec-overview" className="border-t border-slate-200 pt-5 flex flex-col gap-3">
            <h2 className="text-xl font-serif text-slate-900 border-b border-slate-200 pb-1">
              1. Overview & System Objectives
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">
              In educational computing laboratories, students write embedded code (such as LED blinking, sensor polling, and button interrupts) targeting physical microcomputers. Traditional laboratory setups suffer from common hardware hurdles:
            </p>
            <ul className="text-xs text-slate-700 list-disc list-inside space-y-1 pl-2">
              <li>Each Raspberry Pi traditionally requires its own dedicated HDMI monitor, keyboard, and mouse.</li>
              <li>Students make wiring mistakes on breadboards, causing loose connections or burned-out GPIO pin drivers.</li>
              <li>Students studying remotely cannot see physical hardware LEDs or Sense HAT matrix changes.</li>
            </ul>
            <p className="text-xs text-slate-700 leading-relaxed">
              Pi-Digit solves this by separating <strong>physical hardware execution</strong> on the Raspberry Pi from <strong>interactive visual observation</strong> on the student's personal computer.
            </p>
          </section>
        )}

        {/* SECTION 2: REMOTE ARCHITECTURE (WHY SSH? WHERE IS GUI?) - Direct answer to User */}
        {(activeSection === 'all' || activeSection === 'sec-architecture') && (
          <section id="sec-architecture" className="border-t border-slate-200 pt-5 flex flex-col gap-3">
            <h2 className="text-xl font-serif text-slate-900 border-b border-slate-200 pb-1">
              2. Headless Architecture: Why SSH and Where is the GUI?
            </h2>

            {/* Wikipedia Notice Box */}
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start gap-3 my-1">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1 text-amber-900 text-sm font-serif">
                  Key Concept: The Headless Raspberry Pi Workflow
                </strong>
                <p className="leading-relaxed">
                  In a modern computer engineering lab, the Raspberry Pi is deployed <em>headless</em> (meaning it sits in a lab rack or on a bench with no monitor plugged into it). The graphical user interface (GUI) runs in your personal computer's web browser, while SSH gives you command-line access to compile and run programs directly on the Raspberry Pi.
                </p>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-800 font-sans mt-2">
              2.1 The Two Machines: PC/Laptop vs. Raspberry Pi
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Understanding this division of labor is crucial:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Laptop className="w-4 h-4 text-[#840038]" />
                  <span>Machine 1: Your PC / Laptop</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-1">
                  <li><strong>Hosts the GUI:</strong> You open Chrome, Firefox, or Safari on your PC and navigate to <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900 font-mono">http://raspberrypi.local:3000</code>.</li>
                  <li><strong>Displays the Digital Twin:</strong> Shows the 8x8 Sense HAT matrix, sensor graphs, and blinking LEDs in high resolution on your PC screen.</li>
                  <li><strong>Runs the SSH Client:</strong> You open PowerShell (Windows), Terminal (Mac), or bash (Linux) to SSH into the Pi.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Cpu className="w-4 h-4 text-emerald-700" />
                  <span>Machine 2: The Physical Raspberry Pi 4</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-1">
                  <li><strong>Runs Headless:</strong> Only requires a power cable and a Wi-Fi or Ethernet connection to the local network. No monitor needed.</li>
                  <li><strong>Controls Physical Hardware:</strong> Physically drives the GPIO pins and Sense HAT I2C sensors.</li>
                  <li><strong>Runs the Pi-Digit Daemon:</strong> Broadcasts all pin level changes to your PC browser over WebSockets in under 20 milliseconds.</li>
                </ul>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-800 font-sans mt-2">
              2.2 Where to Run Commands (Terminal on Your PC)
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Students often ask: <em>"Where do I type the SSH command?"</em> You type it in your <strong>personal computer's command terminal</strong> (or use the built-in <strong>Pi SSH Terminal</strong> tab in this web app):
            </p>

            <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto my-1">
              <span className="text-amber-400 font-bold block mb-1"># Note: Make sure the Pi and the computer are on the same network (Wi-Fi or LAN)!</span>
              <span className="text-slate-400"># On your Windows (PowerShell/CMD), Mac (Terminal), or Linux PC:</span><br />
              <span className="text-amber-300">user@my-laptop:~$ </span>
              <span className="text-white">ssh pi@raspberrypi.local</span><br />
              <span className="text-slate-400"># Enter password (default: raspberry). You are now inside the Raspberry Pi:</span><br />
              <span className="text-emerald-400">pi@raspberrypi:~$ </span>
              <span className="text-cyan-300">python3 example-codes/10_pwm_waveform.py</span>
            </div>

            <h3 className="text-base font-bold text-slate-800 font-sans mt-2">
              2.3 How Headless SSH Drives the Graphical Digital Twin
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              When you run <code className="bg-slate-100 border px-1 rounded font-mono">python3 example-codes/10_pwm_waveform.py</code> over SSH in your terminal:
            </p>
            <ol className="text-xs text-slate-700 list-decimal list-inside space-y-1 pl-2">
              <li>The Python script executes on the Raspberry Pi CPU using <code className="font-mono">RPi.GPIO</code> / <code className="font-mono">pi_twin</code>.</li>
              <li>The hardware generates high-speed PWM square waves on GPIO 18 (PWM0, Pin 12).</li>
              <li>The Pi-Digit daemon captures the duty cycle and frequency and broadcasts a WebSocket packet.</li>
              <li><strong>The browser window on your PC receives the event and immediately renders the live waveform on the PWM Oscilloscope!</strong></li>
            </ol>
            <p className="text-xs text-slate-600 italic">
              Result: You write code in your familiar terminal or IDE, and your browser window provides a real-time visual twin of the Sense HAT matrix, joystick, sensors, and hardware PWM signals without needing delicate breadboard wiring or an HDMI monitor connected to the Pi.
            </p>
          </section>
        )}

        {/* SECTION 3: INSTALLATION & RUNNING */}
        {(activeSection === 'all' || activeSection === 'sec-install') && (
          <section id="sec-install" className="border-t border-slate-200 pt-5 flex flex-col gap-3">
            <h2 className="text-xl font-serif text-slate-900 border-b border-slate-200 pb-1">
              3. Installation and Deployment on the Raspberry Pi
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">
              To install Pi-Digit on a physical Raspberry Pi 4 Model B running Raspberry Pi OS 12 (Bookworm):
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-700 font-bold block mb-1 font-sans">
                  3.1 Raspberry Pi Hardware Libraries & System Dependencies:
                </span>
                <p className="text-slate-500 font-sans text-[11px] mb-1">
                  Install the official Sense HAT driver, GPIO/PWM libraries, I2C tools, Node.js runtime, and GCC:
                </p>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px]">
{`sudo apt update
sudo apt install -y python3-sense-hat python3-rpi.gpio python3-smbus i2c-tools nodejs npm git gcc`}
                </pre>
              </div>

              <div>
                <span className="text-slate-700 font-bold block mb-1 font-sans">
                  3.2 Enable the Hardware I2C Interface:
                </span>
                <p className="text-slate-500 font-sans text-[11px] mb-1">
                  Required to allow the Raspberry Pi SoC to communicate with the Sense HAT sensors (0x46, 0x5c, 0x6a):
                </p>
                <pre className="p-3 bg-slate-900 text-amber-300 rounded-lg overflow-x-auto text-[11px]">
{`# Enable I2C kernel module without reboot
sudo raspi-config nonint do_i2c 0`}
                </pre>
              </div>

              <div>
                <span className="text-slate-700 font-bold block mb-1 font-sans">
                  3.3 Clone the Repository & Build:
                </span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px]">
{`git clone https://github.com/waqarsqureshi/pi-digit.git
cd pi-digit
npm install
npm run build`}
                </pre>
              </div>

              <div>
                <span className="text-slate-700 font-bold block mb-1 font-sans">
                  3.4 Set Working Directory (pwd) &amp; Start the Daemon Server:
                </span>
                <pre className="p-3 bg-slate-900 text-emerald-300 rounded-lg overflow-x-auto text-[11px]">
{`# 1. Verify you are in the repository folder:
cd ~/pi-digit
pwd
# Must output: /home/<user>/pi-digit

# 2. Start the daemon:
npm start

# Automatically outputs detected LAN IP (or 127.0.0.1 if offline):
# ➜ Localhost : http://127.0.0.1:3000/emulator/
# ➜ Network   : http://<your-pi-ip>:3000/emulator/ (connect from your laptop/PC)
# ➜ Hostname  : http://raspberrypi.local:3000/emulator/`}
                </pre>
              </div>

              <div>
                <span className="text-slate-700 font-bold block mb-1 font-sans">
                  3.5 Hardware Verification & Diagnostics (Optional but Recommended):
                </span>
                <p className="text-slate-500 font-sans text-[11px] mb-1">
                  Run the diagnostic suite in <code className="text-amber-800">test-codes/</code> to verify all sensors, matrix, and PWM:
                </p>
                <pre className="p-3 bg-slate-900 text-cyan-300 rounded-lg overflow-x-auto text-[11px]">
{`# 1. Probe I2C bus:
i2cdetect -y 1

# 2. Run automated self-test diagnostics:
python3 test-codes/test_diagnostics.py

# 3. Stream live accelerometer and motion telemetry:
python3 test-codes/test_sensors.py`}
                </pre>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: CONNECTING */}
        {(activeSection === 'all' || activeSection === 'sec-connect') && (
          <section id="sec-connect" className="border-t border-slate-200 pt-5 flex flex-col gap-3">
            <h2 className="text-xl font-serif text-slate-900 border-b border-slate-200 pb-1">
              4. Connecting Your Computer to the Raspberry Pi
            </h2>

            {/* Wikipedia Notice Box on Network Requirement */}
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start gap-3 my-1">
              <Network className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1 text-amber-900 text-sm font-serif">
                  Mandatory Network Prerequisite
                </strong>
                <p className="leading-relaxed">
                  This connection will only work if <strong>both your computer (running the browser) and the Raspberry Pi are on the same local network</strong> (same Wi-Fi network or classroom LAN subnet) — <strong>OR</strong> if you are <strong>running the application locally on the Raspberry Pi</strong> at <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">http://localhost:3000</code>.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Once both devices are on the same local network (or running locally on the Pi), follow these two steps:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs my-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="text-slate-900 font-bold block mb-1">
                  Step 1: Open the Graphical Dashboard
                </strong>
                <p className="text-slate-600 mb-2">
                  Open any web browser on your PC or Mac and enter:
                </p>
                <code className="p-2 bg-slate-900 text-amber-300 rounded block font-mono">
                  http://raspberrypi.local:3000
                </code>
                <p className="text-[11px] text-slate-500 mt-1">
                  (Or replace with your Pi's IP address, e.g. <code className="font-mono">http://192.168.1.42:3000</code>).
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="text-slate-900 font-bold block mb-1">
                  Step 2: Open Developer Shell (SSH)
                </strong>
                <p className="text-slate-600 mb-2">
                  In your computer terminal, connect to the Pi:
                </p>
                <code className="p-2 bg-slate-900 text-cyan-300 rounded block font-mono">
                  ssh pi@raspberrypi.local
                </code>
                <p className="text-[11px] text-slate-500 mt-1">
                  Or click the built-in <strong>Pi SSH Terminal</strong> tab right inside this browser window!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 5: MODES */}
        {(activeSection === 'all' || activeSection === 'sec-modes') && (
          <section id="sec-modes" className="border-t border-slate-200 pt-5 flex flex-col gap-3">
            <h2 className="text-xl font-serif text-slate-900 border-b border-slate-200 pb-1">
              5. Operating Modes: Hardware Emulation vs. Simulation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs my-1">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="text-[#840038] font-bold block mb-1">
                  Simulation Mode (Virtual Hardware)
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Used when no physical Sense HAT or Pi board is plugged in. Virtual sensors generate realistic ambient temperature, humidity, and barometric telemetry. The 8x8 LED matrix is interactive and allows custom drawing. Ideal for remote learning and algorithm testing.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <strong className="text-emerald-700 font-bold block mb-1">
                  Emulation Mode (Physical Hardware)
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Used when running directly on a physical Raspberry Pi 4 with a real Sense HAT attached over the I2C-1 bus. Reads actual ambient laboratory conditions. <strong>If no physical board is detected</strong>, the system explicitly displays <em>NOT CONNECTED</em>, sets sensors to inactive (<code className="font-mono">--</code>), and disables matrix LEDs to prevent confusion.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 6: SENSE HAT & PWM PERIPHERALS */}
        {(activeSection === 'all' || activeSection === 'sec-wirefree') && (
          <section id="sec-wirefree" className="border-t border-slate-200 pt-5 flex flex-col gap-3">
            <h2 className="text-xl font-serif text-slate-900 border-b border-slate-200 pb-1">
              6. Sense HAT & Hardware PWM Peripheral Architecture
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">
              In this lab configuration, the <strong>Raspberry Pi Sense HAT</strong> is mounted directly onto the 40-pin GPIO header. All visual feedback, physical inputs, and signal measurements are mapped directly to standard Sense HAT peripherals and hardware PWM:
            </p>
            <div className="p-3.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs space-y-2 my-1">
              <div>• <strong className="text-rose-400">8x8 RGB LED Matrix:</strong> 64 individually addressable RGB LEDs driven via Framebuffer/I2C (<code className="text-amber-300">sense.set_pixel(x, y, r, g, b)</code>).</div>
              <div>• <strong className="text-amber-400">5-Way Joystick:</strong> Directional controller with Up, Down, Left, Right, and Centre/Enter clicks (<code className="text-amber-300">sense.stick.get_events()</code>).</div>
              <div>• <strong className="text-emerald-400">Environmental Sensors (HTS221 & LPS25H):</strong> Reads ambient laboratory temperature, relative humidity, and barometric pressure.</div>
              <div>• <strong className="text-cyan-400">9-DOF IMU Motion (LSM9DS1):</strong> Real-time 3-axis accelerometer (<code className="text-amber-300">sense.get_accelerometer_raw()</code>), gyroscope, and magnetometer heading.</div>
              <div>• <strong className="text-sky-300">Hardware PWM0 on GPIO 18 (Pin 12):</strong> Generates hardware square waves, streamed live via WebSocket to the web app's built-in oscilloscope visualizer (<code className="text-amber-300">GPIO.PWM(18, 1000)</code>).</div>
            </div>
          </section>
        )}

        {/* SECTION 7: INTERACTION PIPELINE */}
        {(activeSection === 'all' || activeSection === 'sec-pipeline') && (
          <section id="sec-pipeline" className="border-t border-slate-200 pt-5 flex flex-col gap-3">
            <h2 className="text-xl font-serif text-slate-900 border-b border-slate-200 pb-1">
              7. The 5-Stage Interaction Pipeline
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">
              Every hardware event in Pi-Digit flows through a verified five-stage chain:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono text-center my-1">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[#840038] font-bold block mb-1">1. SOURCE CODE</span>
                <span className="text-[10px] text-slate-600">Student writes Python or C program</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-cyan-700 font-bold block mb-1">2. PI-TWIN SDK</span>
                <span className="text-[10px] text-slate-600">Calls <code className="text-slate-900">GPIO.output()</code></span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-amber-700 font-bold block mb-1">3. BACKEND DAEMON</span>
                <span className="text-[10px] text-slate-600">Validates pin permissions</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-purple-700 font-bold block mb-1">4. HARDWARE BUS</span>
                <span className="text-[10px] text-slate-600">Physical pin drives HIGH (3.3V)</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-emerald-700 font-bold block mb-1">5. DIGITAL TWIN</span>
                <span className="text-[10px] text-slate-600">Sense HAT Matrix & PWM Oscilloscope update on PC screen</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
