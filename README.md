# Raspberry Pi Digital Twin & Hardware Emulator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://python.org/)
[![Raspberry Pi OS](https://img.shields.io/badge/OS-Raspberry%20Pi%20OS%20(Bookworm%2FBullseye)-c51a4a.svg)](https://raspberrypi.com)

The **Raspberry Pi Digital Twin Emulator** is an open-source educational computing and remote telemetry platform for Raspberry Pi 4, Pi 5, Pi 400, and Pi 3B+. It binds physical hardware interfaces—including the Sense HAT 8×8 RGB LED matrix (`/dev/fb1`), I2C sensor bus (`/dev/i2c-1`), 40-pin GPIO header (`/dev/gpiomem`), and character LCD—with a real-time interactive web dashboard.

---

## Project Structure

```text
pi-digital-twin/
│
├── index.html              # Main website: Modern landing page introducing emulator & install guides
├── wiki.html               # Technical Wiki & Documentation: Architecture, API guides, practical examples
├── README.md               # Repository documentation and overview
├── LICENSE                 # MIT License
│
├── assets/                 # Shared static assets (Independent of Python/backend)
│   ├── css/
│   │   ├── main.css        # Landing page styling
│   │   ├── wiki.css        # Documentation typography & sticky TOC
│   │   └── shared.css      # Shared design system & variables
│   ├── js/
│   │   ├── main.js         # Landing page interactivity & clipboard copy
│   │   └── wiki.js         # Wiki instant search & TOC scrollspy
│   └── images/
│       ├── pi-logo.svg     # Official SVG brand icon
│       └── sense-hat-diagram.svg # Hardware architecture schematic
│
├── src/                    # Python Digital Twin runtime & py_twin Library
│   ├── py_twin/            # Unified py_twin package: SenseHat, GPIO, PWM, LCD, System
│   │   └── __init__.py
│   ├── py_twin.py          # py_twin module alias
│   ├── pi_twin.py          # Digital Twin interface module
│   ├── pi_emulator.py      # Dual-mode hardware bridging & emulated runtime
│   ├── sense_hat.py        # Drop-in Sense HAT library interface
│   ├── sensor_logger.py    # Live sensor telemetry logger
│   ├── RPi/                # RPi.GPIO compatibility library
│   └── pi_twin.h           # C digital twin hardware bindings header
│
└── emulator/               # Hardware Emulator Application
    ├── index.html          # Emulator web interface entry point
    ├── install.sh          # Turnkey automated installer for Raspberry Pi OS
    ├── requirements.txt    # Python hardware daemon dependencies
    └── launch.sh           # Desktop / CLI startup script
```

---

## Key Capabilities

1. **8×8 RGB LED Matrix (`/dev/fb1`):** Direct 16-bit RGB565 framebuffer binding with 24-bit TrueColor web synchronization.
2. **Environmental Sensor Telemetry:** Real-time polling of HTS221 (Temp/Humidity) and LPS25H (Atmospheric Pressure) over I2C Bus 1.
3. **40-Pin GPIO Expansion:** Real-time state inspection of all 40 physical header pins with pull-up/pull-down resistor states and PWM modulation via `/dev/gpiomem`.
4. **16×2 HD44780 Character LCD:** Emulated character display with PCF8574 I2C backpack support (address `0x27`).
5. **Integrated Code Studio & Shell:** Multi-tab in-browser IDE for Python 3 and C (GCC C99) with live stdout/stderr execution streaming.
6. **Automated Hardware Diagnostics:** Self-healing diagnostic tool checking kernel device tree overlays (`rpi-sense`), permissions, and buses.

---

## Quickstart: Install on Raspberry Pi

### Option 1: One-Line Installer
Log into your Raspberry Pi terminal and execute:

```bash
curl -sSL https://raw.githubusercontent.com/waqarsqureshi/pi-digit/main/emulator/install.sh | bash
```

You can view the installation script source on GitHub at:
[https://github.com/waqarsqureshi/pi-digit/blob/main/emulator/install.sh](https://github.com/waqarsqureshi/pi-digit/blob/main/emulator/install.sh)

### Option 2: Clone and Setup Manually

```bash
# 1. Clone repository
git clone https://github.com/waqarsqureshi/pi-digit.git
cd pi-digit

# 2. Run automated configuration script
chmod +x emulator/install.sh
bash emulator/install.sh

# 3. Reboot if kernel overlays were freshly enabled
sudo reboot

# 4. Start the emulator
npm start
```

Once running, access the interfaces in your browser:
- **Main Website:** `http://localhost:3000/`
- **Emulator Interface:** `http://localhost:3000/emulator/`
- **Documentation & Wiki:** `http://localhost:3000/wiki.html`

---

## Writing Code

The emulator supports standard Raspberry Pi code out of the box:

```python
from sense_hat import SenseHat
import time

sense = SenseHat()
sense.clear()

# Read live temperature & humidity
temp = sense.get_temperature()
humidity = sense.get_humidity()

print(f"Temperature: {temp:.1f} °C | Humidity: {humidity:.1f} %")

# Display a scrolling message
sense.show_message("Raspberry Pi Twin", scroll_speed=0.08, text_colour=[0, 255, 120])
```

---

## Technical Documentation

For in-depth hardware architecture specifications, register maps, C/GPIO examples, and troubleshooting guides, open [`wiki.html`](wiki.html) in any browser or visit the hosted wiki.

---

## License

This project is licensed under the [MIT License](LICENSE).
