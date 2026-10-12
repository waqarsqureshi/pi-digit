# pi-digit

Pi-Digit is an educational Raspberry Pi 4 digital twin and emulator. It provides a web dashboard plus a Python compatibility layer that lets student code drive a simulated Sense HAT, GPIO header, LCD, joystick, and PWM controls, while also syncing with real Pi hardware when available. The project is aimed at learning physical computing with a live visual workspace, diagnostics, and sample programs rather than being a general-purpose app.

## What this is

Pi-Digit combines a browser-based workspace with hardware bridge scripts so you can:

- run and visualize Sense HAT-style programs in the browser
- control an 8x8 RGB LED matrix, GPIO pins, LCD output, joystick events, and PWM
- switch between simulation and emulation modes
- inspect Raspberry Pi hardware health with diagnostics and probe tools
- use example scripts for sensors, LED matrix patterns, PWM, and joystick input

## Stack

- **Language(s):** TypeScript, Python, Shell, HTML
- **Framework / runtime:** React 19 + Vite, Node/tsx Express server, Python hardware bridge scripts
- **Notable libraries:** `@google/genai`, `express`, `ws`, `react`, `lucide-react`, `prismjs`, `dotenv`

## How it's organized

```text
src/                 React UI for the twin/dashboard
  App.tsx            Main workspace + help views, hardware panels, code runner
  main.tsx           React entry point
scripts/             Raspberry Pi install, probe, diagnostics, and daemon tools
  hardware_daemon.py  Bidirectional hardware <-> UI sync service
  hardware_diagnose.py  Hardware health checker and report generator
  hardware_probe.py   Deeper platform/bus/library probing
  install-pi.sh       Turnkey Raspberry Pi installer
  pi-digit.service    systemd service unit
RPi/                 Drop-in RPi.GPIO compatibility module
  GPIO.py            Re-exports emulator-backed GPIO/PWM
example-codes/       Example curriculum scripts for Sense HAT/GPIO/LCD
test-codes/          Diagnostic examples for sensors, LEDs, joystick, PWM
pi_emulator.py       Core emulator/bridge for Sense HAT, GPIO, PWM, LCD
pi_twin.py           Convenience API aliasing emulator classes
sense_hat.py         Sense HAT compatibility shim
server.ts            Node server that serves the app and runtime bridge
index.html           Vite entry HTML and app metadata
metadata.json        App metadata for the hosted environment
```

**How it fits together:** The React app in `src/App.tsx` is the user-facing control center: it renders the Sense HAT matrix, GPIO header, LCD, telemetry, diagnostics, and code studio. The Python layer (`pi_emulator.py`, `pi_twin.py`, `sense_hat.py`, `RPi/GPIO.py`) makes student code think it is talking to real Raspberry Pi hardware, but behind the scenes it can emit events to the web UI and/or write to the physical framebuffer, GPIO, and PWM interfaces. The hardware daemon in `scripts/hardware_daemon.py` closes the loop by polling the actual Pi’s sensors and consuming queued UI commands so the browser and hardware stay in sync.

## How to run it

From the repo files, the main paths are:

```bash
npm install
npm run dev
# or
npm run start

npm run build

npm run diag

bash scripts/install-pi.sh
```

Obvious requirements:
- Node.js 18+ (installer enforces this)
- On Raspberry Pi: `i2c`, Sense HAT packages, and permissions for `i2c`, `input`, `gpio`, and `video`
- Optional hardware service:
  - `scripts/pi-digit.service` runs `tsx server.ts`
  - `scripts/hardware_daemon.py` is the physical hardware sync process

## What it does

Pi-Digit is built around a live Raspberry Pi physical-computing workflow:

- **Digital twin dashboard:** The web app shows the state of the Sense HAT matrix, GPIO header, LCD, and telemetry in real time.
- **Student code execution:** The server can execute Python and C student programs, capture output, and translate supported actions into matrix pixels, GPIO output, LCD updates, joystick events, and PWM changes.
- **Sense HAT compatibility:** `sense_hat.py`, `pi_twin.py`, and `pi_emulator.py` provide import-compatible APIs so example scripts can use `SenseHat`, `GPIO`, `PWM`, and `LCD` style interfaces.
- **Physical hardware bridging:** On a Raspberry Pi, the bridge can write to `/dev/fb1`, GPIO, and PWM interfaces and read live sensor data from Sense HAT hardware when present.
- **Diagnostics and setup:** The repo includes scripts to probe hardware, diagnose missing drivers or permissions, and install the app as a systemd service.
- **Curriculum examples:** The `example-codes/` and `test-codes/` directories contain scripts for blinking LEDs, reading sensors, joystick events, PWM, and LCD output.

## Key files

- `server.ts` — Express/WebSocket backend, program runner, hardware API endpoints
- `src/App.tsx` — main UI workspace and hardware panels
- `pi_emulator.py` — emulator and hardware bridge for Sense HAT, GPIO, PWM, and LCD behavior
- `pi_twin.py` — convenience layer for curriculum code examples
- `scripts/hardware_daemon.py` — bidirectional hardware sync service
- `scripts/hardware_diagnose.py` — Sense HAT and Raspberry Pi hardware diagnostic tool
- `scripts/hardware_probe.py` — deeper hardware probe utility
- `scripts/install-pi.sh` — installer for Raspberry Pi deployment

## Example usage

### Run the web app
```bash
npm install
npm run dev
```

### Run hardware diagnostics
```bash
npm run diag
```

### Use the compatibility layer in student code
```python
from pi_twin import SenseHat

sense = SenseHat()
sense.clear()
sense.set_pixel(0, 0, 255, 0, 0)
print(sense.get_temperature())
```

### Test the LED matrix
```bash
python3 test-codes/test_led_matrix.py
```

### Poll live sensors
```bash
python3 test-codes/test_sensors.py
```

## Try asking

- What does `pi_emulator.py` do differently from the real Sense HAT library?
- How does the hardware daemon sync the browser UI with physical Raspberry Pi sensors?
- Which files implement the LCD, GPIO, joystick, and PWM behavior in this project?
