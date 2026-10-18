# Pi-Digit

Pi-Digit is a Raspberry Pi digital twin and hardware emulator for exploring and testing physical-computing projects. Its browser workspace can run in simulation mode without a Pi, or connect to a Raspberry Pi and supported peripherals such as a Sense HAT, GPIO devices, and a camera.

## How it works

- **Web interface:** React and TypeScript, built with Vite. The main workspace is served at `/`; a separate emulator view is available at `/emulator/`.
- **Application server:** `server.ts` runs Express and a WebSocket endpoint (`/ws`). It serves the UI, exposes REST endpoints for hardware and program actions, and broadcasts device state and telemetry.
- **Hardware support:** Python utilities in `scripts/` and `src/scripts/` provide the hardware daemon, diagnostics, and camera service. Hardware access depends on the Raspberry Pi OS configuration and connected devices.
- **Learning resources:** `examples/` contains Python and C examples; `wiki.html` is served at `/wiki`.

## Run locally

Use a Node.js version supported by Vite 8 (Node.js 20.19+ or 22.12+).

```bash
git clone https://github.com/waqarsqureshi/pi-digit.git
cd pi-digit
npm install
npm run dev
```

Open `http://localhost:3000/`. The server listens on port 3000 by default; set `PORT` to use a different port. The app starts in software mode when physical hardware is unavailable.

For a production build and server:

```bash
npm run build
NODE_ENV=production npm start
```

### Cloud deployment (marketing frontend without Python)

If you are deploying the marketing frontend and documentation to Google Cloud (or any host without Python), set:

```bash
CLOUD_NO_PYTHON=1
```

In this mode, the landing page, wiki, and simulator UI still run, while Python-backed features (hardware daemon, camera daemon, Python program execution, and Python diagnostics) are intentionally disabled on that host.

For full emulator behavior with hardware integration, deploy the project on a Raspberry Pi using the installer below.

Useful checks and tools:

```bash
npm run lint                 # TypeScript check
python3 test-codes/run_all_tests.py
npm run diag                 # Raspberry Pi hardware diagnostics
```

The Python verification suite covers hardware-oriented components and examples; some checks require compatible Raspberry Pi hardware. `npm run diag` is intended for use on a Pi.

## Raspberry Pi installation

On a supported Raspberry Pi OS system, the installer installs system prerequisites and Node dependencies, builds the app, and configures a `pi-digit` systemd service:

```bash
git clone https://github.com/waqarsqureshi/pi-digit.git
cd pi-digit
sudo bash scripts/install-pi.sh
```

The service uses port 3000 by default. Open `http://<pi-address>:3000/` from a device on the same network. Review the installer before running it; it changes system packages, hardware settings, and systemd configuration.

## Performance and usage notes

- The camera is optional and starts only when enabled. It transfers JPEG frames to the browser, where image filters run on the canvas; camera use adds network, CPU, and memory load. Turn it off when not in use, especially on lower-powered devices.
- Live hardware telemetry is sent over WebSockets. The UI uses a slower REST polling fallback only when the WebSocket is unavailable.
- Hardware features depend on device access and OS configuration. Without compatible hardware, use the app's simulation mode; diagnostics and physical-device tests may report unavailable components.

## Project layout

```text
server.ts             Express server, REST API, WebSocket bridge, program runner
src/App.tsx           React application shell
src/components/       Workspace panels and hardware views
src/hooks/            WebSocket and digital-twin state
src/types/            Shared hardware and UI types
scripts/              Raspberry Pi daemon, installer, and service files
src/scripts/           Diagnostics and camera utilities
examples/              Python, C, and utility examples
test-codes/            Hardware-oriented verification suite
wiki.html              Offline technical guide
```

## License

Pi-Digit is licensed under the [MIT License](LICENSE).
