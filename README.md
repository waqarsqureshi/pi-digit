# Pi-Digit: Raspberry Pi Digital Twin & Hardware Emulator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://python.org/)
[![Raspberry Pi OS](https://img.shields.io/badge/OS-Raspberry%20Pi%20OS%20(Bookworm%2FBullseye)-c51a4a.svg)](https://raspberrypi.com)

**Pi-Digit** is an open-source physical computing digital twin and remote hardware laboratory for the Raspberry Pi 4, Pi 5, and Sense HAT. It provides bidirectional synchronization between physical hardware (`/dev/fb1`, `/dev/i2c-1`, `/dev/input/event*`, `/dev/gpiomem`) and an interactive in-browser digital twin viewport with an integrated Python & C IDE, automated hardware self-tests, and real-time sensor graphs.

---

## Simple Project Directory Structure

```text
pi-digit/
├── examples/                    # Educational curriculum & sample code
│   ├── python/                  # Python 3 curriculum examples (01_hello.py to 12_tictactoe.py)
│   ├── c/                       # Embedded C examples & Linux device driver (01_hello.c to 10_device_driver.c)
│   ├── scripts/                 # Standalone sample utility scripts (sensor_logger.py)
│   └── README.md                # Guide to running examples
│
├── src/                         # Application source code & system daemon
│   ├── components/              # React UI components (Sense HAT twin, GPIO panel, LCD, Terminal)
│   ├── hooks/                   # Digital twin WebSocket hooks (useDigitalTwin.ts)
│   ├── scripts/                 # Hardware daemon & system service scripts
│   │   ├── hardware_daemon.py   # High-performance 60ms physical hardware sync service
│   │   ├── hardware_diagnose.py # Comprehensive hardware self-test diagnostic tool
│   │   ├── hardware_probe.py    # Interactive I2C bus scanner and register prober
│   │   ├── install-pi.sh        # Turnkey Raspberry Pi OS installer script
│   │   └── pi-digit.service     # Systemd unit definition for auto-boot
│   ├── pi_emulator.py           # Core Sense HAT & GPIO emulation engine
│   ├── pi_twin.py               # Unified Python digital twin API
│   ├── pi_twin.h                # C header bindings for Sense HAT & GPIO
│   └── App.tsx                  # Main React application shell
│
├── test-codes/                  # Automated hardware verification test suite
│   ├── run_all_tests.py         # Master automated verification runner
│   ├── test_sensors.py          # Ambient temperature calibration & IMU test
│   ├── test_joystick.py         # 5-way joystick state machine test (press, hold, release)
│   ├── test_led_matrix.py       # 8x8 RGB LED matrix buffer test
│   ├── test_pwm.py              # Hardware PWM0 (GPIO 18) signal generator test
│   ├── test_lcd.py              # 16x2 I2C Character LCD viewport test
│   ├── test_diagnostics.py      # Kernel driver & I2C device triage test
│   ├── test_examples_and_structure.py # Examples compilation & directory integrity test
│   └── README.md                # Test suite documentation
│
├── server.ts                    # Full-stack Express server, WebSocket bridge, & code runner
├── index.html                   # Modern web entry point
├── wiki.html                    # Complete offline technical documentation & hardware guide
├── package.json                 # Project dependencies & npm run scripts
└── tsconfig.json                # TypeScript configuration
```

---

## Quickstart

### 1. Install & Run Locally

```bash
# Clone the repository
git clone https://github.com/waqarsqureshi/pi-digit.git
cd pi-digit

# Install Node.js dependencies
npm install

# Start the digital twin development server (port 3000)
npm run dev
```

Open your browser to:
- **Digital Twin & Code Studio:** `http://localhost:3000/`
- **Technical Documentation & Wiki:** `http://localhost:3000/wiki.html`

### 2. Run All Automated Verification Tests

Verify all hardware subsystems, temperature calibrations, joystick state machines, and code examples:

```bash
python3 test-codes/run_all_tests.py
```

### 3. Run Hardware Diagnostics

Run the comprehensive Raspberry Pi hardware and I2C bus self-test:

```bash
npm run diag
# or directly:
python3 src/scripts/hardware_diagnose.py
```

---

## Curriculum Examples

All educational example codes are cleanly grouped inside `examples/`:

### Python Examples (`examples/python/`)
```bash
python3 examples/python/01_hello.py             # Hello World foundation
python3 examples/python/05_temp_poll.py         # Calibrated ambient temperature telemetry
python3 examples/python/09_joystick_events.py   # 5-way joystick event loop
python3 examples/python/11_joystick_move_pixel.py # Interactive joystick pixel movement
python3 examples/python/12_tictactoe.py         # Complete Tic-Tac-Toe with AI opponent
```

### C Examples (`examples/c/`)
```bash
cd examples/c
make
./01_hello           # Basic C execution test
./02_sense_pixel     # Discrete RGB pixel manipulation
./09_joystick_pixel  # C joystick-driven matrix navigation
```
Also includes `10_device_driver.c`, a Linux character device driver (`/dev/sense_hat`) with file operations and ioctl hooks for operating systems education.

### Utility Scripts (`examples/scripts/`)
```bash
python3 examples/scripts/sensor_logger.py       # Continuous telemetry logger
```

---

## Installing on a Physical Raspberry Pi 4 / 5

To run with real Sense HAT hardware on Raspberry Pi OS:

```bash
# 1. Clone repository on your Pi
git clone https://github.com/waqarsqureshi/pi-digit.git
cd pi-digit

# 2. Run the automated installer
chmod +x src/scripts/install-pi.sh
sudo bash src/scripts/install-pi.sh

# 3. Build & start the service
npm install
npm run build
npm start
```

The server automatically binds to your Pi's local network IP on port 3000. You can access the digital twin from any computer, tablet, or phone on the same Wi-Fi network!

---

## Hardware Architecture

1. **8×8 RGB LED Matrix (`/dev/fb1`):** Driven by the Atmel ATtiny88 MCU via I2C, mapped as a 16-bit RGB565 Linux framebuffer.
2. **I2C Sensor Bus (`/dev/i2c-1`):** 
   - `HTS221` (0x5F): Temperature and relative humidity.
   - `LPS25H` (0x5C): Barometric pressure and temperature.
   - `LSM9DS1` (0x6A & 0x1C): 9-DOF accelerometer, gyroscope, and magnetometer.
3. **5-Way Joystick:** Linux evdev input device (`/dev/input/event*`) with `KEY_UP`, `KEY_DOWN`, `KEY_LEFT`, `KEY_RIGHT`, and `KEY_ENTER` (Middle click) supporting full `press`, `hold`, and `release` lifecycle.
4. **Calibrated Ambient Temperature:** Automatic SoC thermal compensation (`T_ambient = T_raw - (T_cpu / 2.0)`) resolves the Pi 4 CPU radiant heat bias (~55°C raw → ~22°C ambient).
5. **16×2 Character LCD:** Emulated HD44780 LCD display with PCF8574 I2C interface (address `0x27`).

---

## License

This project is licensed under the [MIT License](LICENSE).
