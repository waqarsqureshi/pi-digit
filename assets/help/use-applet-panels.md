# Use Applet Panels in the Emulator Workspace

The emulator workspace is organized into applet panels. Each panel can be opened, minimized, maximized, or closed.

## 1) Open and arrange applets

1. Go to `/emulator/`.
2. Open applets from the workspace controls.
3. Use panel actions to:
   - minimize
   - maximize
   - close
4. Re-open closed applets from controls (or undo if shown).

## 2) What each applet does

- **8x8 LED Matrix**  
  Draw pixels and patterns; validate matrix output quickly.

- **Sense HAT 5-Way Joystick**  
  Test direction and press actions, including event diagnostics.

- **Environmental Sensors**  
  Shows temperature, humidity, pressure telemetry.

- **Motion/IMU**  
  Displays accelerometer/gyro/heading style data.

- **40-Pin GPIO Header Twin**  
  Toggle and inspect pin states in the digital twin.

- **Hardware PWM Generator**  
  Configure frequency/duty and inspect waveform behavior.

- **System & Bus Link Monitor**  
  View runtime health and hardware link status.

- **Pi Camera Stream (optional)**  
  Enables camera stream when available and allowed.

## 3) Recommended classroom flow

1. Open **Matrix + GPIO + Monitor** first.
2. Run a small script and confirm output in each panel.
3. Add **Joystick** and **PWM** when teaching input and timing.
4. Enable **Camera** only when needed to keep load lower.

## 4) If applets seem inactive

1. Check **Monitor** status and run `diagnose`.
2. Confirm server started from project root (`~/pi-digit`).
3. On Pi, verify hardware packages and I2C configuration.
4. In cloud-only mode, expect simulation-only behavior for hardware-dependent applets.
