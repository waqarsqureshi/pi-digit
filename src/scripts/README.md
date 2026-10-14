# Pi-Digit Hardware Daemon & System Scripts

This directory contains the core physical hardware daemon, diagnosis, probe, and installation scripts for the Raspberry Pi 4 Model B and Sense HAT:

## Available Scripts

1. **`hardware_daemon.py`**
   - High-performance background hardware synchronization daemon (`pi-digit.service`).
   - Syncs physical Sense HAT matrix framebuffer (`/dev/fb1`), 5-way joystick evdev input events, and I2C sensors with the Web UI Digital Twin every 60ms.
   - Computes real-time BCM2711 SoC temperature compensation for calibrated ambient readings.

2. **`hardware_diagnose.py`**
   - Comprehensive diagnostic test of Raspberry Pi 4 hardware subsystems.
   - Checks I2C-1 bus, ATTiny88 MCU (0x46), HTS221/LPS25H (0x5C), LSM9DS1 (0x6A), GPIO pin availability, and Sense HAT driver bindings.
   - Invoked directly via `npm run diag` or through the Web UI "Run Diagnostics" button.

3. **`hardware_probe.py`**
   - Interactive I2C bus scanner and register prober.
   - Probes live I2C addresses (0x03 - 0x77), reads raw sensor registers, and outputs real-time connectivity status.

4. **`install-pi.sh`**
   - Automated physical Raspberry Pi installation script.
   - Installs required apt packages (`python3-sense-hat`, `i2c-tools`, `python3-pip`, `build-essential`), enables I2C interfaces, and installs the `pi-digit.service` systemd unit.

5. **`pi-digit.service`**
   - Systemd service definition to keep `hardware_daemon.py` running continuously on boot.
