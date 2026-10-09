import { useState } from 'react';
import {
  X,
  Share2,
  Globe,
  Cpu,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Download,
  AlertTriangle,
  Network,
  CheckCircle2,
  Layers,
  Laptop,
  Monitor,
} from 'lucide-react';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWorkspace: () => void;
}

export function PublishModal({ isOpen, onClose, onOpenWorkspace }: PublishModalProps) {
  const [activeTab, setActiveTab] = useState<'website' | 'pi-install'>('website');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentWebUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-tiodjc2mcmxb5keiefof2c-251082578033.europe-west1.run.app';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadScript = () => {
    const scriptContent = `#!/usr/bin/env bash
# ==============================================================================
# Pi-Digit / Pi-Local Digital Twin - Turnkey Installer for Raspberry Pi 4 / 3 / 5
# ==============================================================================

set -e
echo "==> Installing Pi-Local Digital Twin on Raspberry Pi..."

SUDO=""
if [ "$EUID" -ne 0 ]; then
  SUDO="sudo"
fi

# 1. Update and install dependencies
$SUDO apt-get update -y
$SUDO apt-get install -y curl wget git gcc build-essential python3 python3-pip python3-dev i2c-tools
$SUDO apt-get install -y sense-hat python3-sense-hat python3-rpi.gpio || true

# 2. Check Node.js
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi

# 3. Enable I2C interface
if command -v raspi-config &> /dev/null; then
  $SUDO raspi-config nonint do_i2c 0
fi

# 4. Install dependencies & build
npm install
npm run build

# 5. Start daemon
echo "==> Starting Pi-Digit daemon on port 3000..."
npx tsx server.ts
`;
    const blob = new Blob([scriptContent], { type: 'application/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install-pi.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadService = () => {
    const serviceContent = `[Unit]
Description=Pi-Digit Raspberry Pi Digital Twin & Hardware Daemon
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/pi-digit
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npx tsx server.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;
    const blob = new Blob([serviceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pi-digit.service';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#840038] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Publish, Share & Deploy Pi-Digit</h2>
              <p className="text-xs text-rose-100/80">
                Test the simulator online as a website or install on a physical Raspberry Pi 4
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 shrink-0 gap-2">
          <button
            onClick={() => setActiveTab('website')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-mono font-bold border-b-2 transition-all ${
              activeTab === 'website'
                ? 'border-[#840038] text-[#840038]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>1. Test Online Simulator (Website)</span>
          </button>

          <button
            onClick={() => setActiveTab('pi-install')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-mono font-bold border-b-2 transition-all ${
              activeTab === 'pi-install'
                ? 'border-[#840038] text-[#840038]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>2. Install on Raspberry Pi 4 / 3 / 5</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {activeTab === 'website' ? (
            /* TAB 1: TEST SIMULATOR AS A WEBSITE */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Your Web Simulator is Live and Ready for Public Testing!</span>
                </div>
                <p className="text-emerald-800 leading-relaxed text-[11px]">
                  Anyone can test this digital twin in their web browser without purchasing or configuring any Raspberry Pi hardware. All Sense HAT and GPIO features run in high-fidelity simulation mode.
                </p>
              </div>

              {/* Public URL Box */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 font-mono uppercase text-[10px] tracking-wider">
                  Public Shareable Web Address:
                </label>
                <div className="flex items-center gap-2 bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-xs border border-slate-800">
                  <Globe className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
                  <span className="truncate flex-1 text-amber-200">{currentWebUrl}</span>
                  <button
                    onClick={() => handleCopy(currentWebUrl, 'url')}
                    className="px-3 py-1.5 rounded-lg bg-[#840038] hover:bg-[#6c002e] text-white font-sans font-medium flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                  >
                    {copiedId === 'url' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Share this link with classmates, teachers, or testers. Works on Chrome, Firefox, Safari, Edge, tablets, and phones.
                </span>
              </div>

              {/* Features Included for Testers */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-900 mb-2 font-sans text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#840038]" />
                  <span>What Testers Can Explore Immediately Online:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-start gap-1.5 bg-white p-2 rounded border border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>10 Built-in Examples:</strong> LED blink, Sense HAT pixel animations, RGB color cycles, sensor polling.</span>
                  </div>
                  <div className="flex items-start gap-1.5 bg-white p-2 rounded border border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>8×8 RGB LED Matrix:</strong> Real-time animation, interactive 5-way joystick navigation.</span>
                  </div>
                  <div className="flex items-start gap-1.5 bg-white p-2 rounded border border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>40-Pin GPIO Header:</strong> Interactive logic analyzer, breadboard LEDs, tactile buttons, buzzer.</span>
                  </div>
                  <div className="flex items-start gap-1.5 bg-white p-2 rounded border border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Bash Terminal:</strong> Run Linux diagnostics (<code className="text-slate-800">pinout</code>, <code className="text-slate-800">uname -a</code>, <code className="text-slate-800">vcgencmd</code>).</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  Ready to test? Return to the interactive side-by-side workspace:
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onOpenWorkspace();
                  }}
                  className="px-4 py-2 bg-[#840038] hover:bg-[#6c002e] text-white rounded-xl font-medium shadow-sm transition-colors"
                >
                  Launch Workspace Now
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: INSTALL ON PHYSICAL RASPBERRY PI 4 */
            <div className="space-y-4">
              {/* CRITICAL NETWORK HIGHLIGHT (USER REQUESTED) */}
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 flex flex-col gap-2 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <Network className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-amber-900 font-sans">
                      Essential Connection Rule:
                    </div>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                      To SSH into the Raspberry Pi or connect the web app to physical hardware:
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-xs flex items-center justify-between border border-slate-800">
                  <span className="text-amber-300 font-bold">ssh pi@raspberrypi.local</span>
                  <button
                    onClick={() => handleCopy('ssh pi@raspberrypi.local', 'ssh-cmd')}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    {copiedId === 'ssh-cmd' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-amber-100/80 border border-amber-300 rounded-md p-2 text-[11px] font-semibold text-amber-950">
                  ⚡ <strong>Make sure the Pi and the computer are on the same network</strong> (connected to the same Wi-Fi router or via Ethernet cable).
                </div>
              </div>

              {/* Turnkey Installer Script Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-slate-900 font-sans text-xs">
                      1-Step Automated Pi Installer:
                    </h4>
                  </div>
                  <button
                    onClick={handleDownloadScript}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#840038]" />
                    <span>Download install-pi.sh</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Run this all-in-one command on your Raspberry Pi terminal to install Node.js 20, Python Sense HAT drivers, build the app, and start the daemon:
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] flex items-center justify-between group overflow-x-auto">
                  <span className="text-cyan-300 select-all">
                    git clone https://github.com/lab/pi-digit.git && cd pi-digit && ./scripts/install-pi.sh
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        'git clone https://github.com/lab/pi-digit.git && cd pi-digit && ./scripts/install-pi.sh',
                        'install-cmd'
                      )
                    }
                    className="text-slate-400 hover:text-white shrink-0 ml-2"
                  >
                    {copiedId === 'install-cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Manual 4-Step Walkthrough */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs font-sans">
                  Or Follow Step-by-Step Manual Setup:
                </h4>
                <div className="grid grid-cols-1 gap-2 font-mono text-[11px]">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-1">
                    <span className="font-bold text-slate-800 font-sans">Step 1: Open Terminal on Your Laptop</span>
                    <span className="text-slate-500 font-sans text-[10px]">
                      Make sure the Pi and the computer are on the same network:
                    </span>
                    <div className="bg-slate-900 text-amber-300 p-1.5 rounded flex items-center justify-between">
                      <span>ssh pi@raspberrypi.local</span>
                      <button onClick={() => handleCopy('ssh pi@raspberrypi.local', 'm1')}>
                        {copiedId === 'm1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-1">
                    <span className="font-bold text-slate-800 font-sans">Step 2: Install System Packages</span>
                    <div className="bg-slate-900 text-cyan-300 p-1.5 rounded flex items-center justify-between overflow-x-auto">
                      <span className="truncate">sudo apt update && sudo apt install -y nodejs npm git gcc python3 python3-pip i2c-tools</span>
                      <button onClick={() => handleCopy('sudo apt update && sudo apt install -y nodejs npm git gcc python3 python3-pip i2c-tools', 'm2')}>
                        {copiedId === 'm2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-1">
                    <span className="font-bold text-slate-800 font-sans">Step 3: Clone & Start Daemon</span>
                    <div className="bg-slate-900 text-emerald-300 p-1.5 rounded flex items-center justify-between">
                      <span>npm install && npm run build && npm start</span>
                      <button onClick={() => handleCopy('npm install && npm run build && npm start', 'm3')}>
                        {copiedId === 'm3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-1">
                    <span className="font-bold text-slate-800 font-sans">Step 4: Open in Browser on Your Laptop</span>
                    <div className="bg-slate-900 text-amber-300 p-1.5 rounded flex items-center justify-between">
                      <span>http://raspberrypi.local:3000</span>
                      <button onClick={() => handleCopy('http://raspberrypi.local:3000', 'm4')}>
                        {copiedId === 'm4' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Pi Capabilities: Systemd and Kiosk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 font-sans">Auto-Start on Boot</span>
                    <button
                      onClick={handleDownloadService}
                      className="text-[#840038] hover:underline flex items-center gap-1 text-[10px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>.service</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">Runs as background systemd service when Pi turns on:</p>
                  <code className="block bg-slate-900 text-slate-200 p-1.5 rounded font-mono text-[10px]">
                    sudo systemctl enable --now pi-digit
                  </code>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Monitor className="w-3.5 h-3.5 text-slate-700" />
                    <span className="font-bold text-slate-800 font-sans">Pi HDMI Kiosk Mode</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">Full-screen display on connected Pi monitor / touchscreen:</p>
                  <code className="block bg-slate-900 text-slate-200 p-1.5 rounded font-mono text-[10px]">
                    chromium-browser --kiosk http://localhost:3000
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
