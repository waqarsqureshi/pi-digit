# Pi-Digit Hardware Scripts & Tooling

This directory contains standalone diagnostic, provisioning, and synchronization utility scripts for the Raspberry Pi 4 Model B and Sense HAT:

## Available Scripts

1. **`hardware_daemon.py`**
   - Bidirectional hardware synchronization daemon running as a systemd service (`pi-digit.service`).
   - Syncs physical Sense HAT matrix framebuffer, 5-way joystick evdev events, and I2C sensors with the Web UI Digital Twin in real time.
   - Applies automatic BCM2711 SoC temperature calibration to environmental readings.

2. **`hardware_diagnose.py`**
   - Comprehensive diagnostic test of Raspberry Pi 4 hardware components.
   - Checks I2C-1 bus, ATTiny88 MCU (0x46), HTS221/LPS25H (0x5C), LSM9DS1 (0x6A), GPIO pin availability, and Sense HAT driver bindings.

3. **`hardware_probe.py`**
   - High-speed interactive hardware prober.
   - Probes live I2C addresses, reads raw register values, and prints instant hardware status.

4. **`install-pi.sh`**
   - Automated physical Raspberry Pi installation script.
   - Installs required system packages (`python3-sense-hat`, `i2c-tools`, `python3-pip`, `build-essential`), enables I2C interface in `/boot/firmware/config.txt`, and sets up the background service.

5. **`sensor_logger.py`**
   - Real-time environmental and IMU telemetry logger.
   - Periodically samples temperature, humidity, pressure, and orientation, logging structured data to CSV/JSON.
