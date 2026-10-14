# Pi-Digit Example Scripts & Utility Tools

This directory contains standalone educational scripts and utility tools:

## Available Example Scripts

1. **`sensor_logger.py`**
   - Real-time environmental and IMU telemetry logger.
   - Periodically samples temperature, humidity, pressure, and orientation, logging structured readings to stdout/CSV.
   - Demonstrates continuous non-blocking polling and data filtering.

> **Note on System Daemons:**
> System-level daemon, hardware diagnosis, and installer scripts are located under [`src/scripts/`](../../src/scripts/) (`hardware_daemon.py`, `hardware_diagnose.py`, `hardware_probe.py`, `install-pi.sh`).
