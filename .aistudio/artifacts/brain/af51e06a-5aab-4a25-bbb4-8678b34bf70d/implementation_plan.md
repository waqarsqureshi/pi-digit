# Implementation Plan: Pi-Digit Full Platform Refactor & Hardware Integration

Refactor the Pi-Digit Raspberry Pi 4 & Sense HAT Digital Twin into a robust, engineer-grade platform. This plan addresses landing page realignment, architectural wiki expansions, expanded Python and C curriculum examples (including a native C device driver and Tic-Tac-Toe game), a dedicated real-time Camera subsystem with edge detection image processing, a realistic Light/Dark themed Code Studio with file persistence to Pi disk and long-running loop execution, uncurved LED matrix geometry, strict hardware bridge unlink controls, simplified hardware diagnostics, structured logging, and component verification test suites.

---

## 1. Landing Page Realignment (`index.html`)

- **Remove Emulator Launch Buttons**:
  - Remove all "Launch Emulator" buttons and links from `index.html` navigation bar, hero actions, and floating bars.
  - The landing page will focus strictly on physical installation on the Raspberry Pi (`npm start`, prerequisites, headless SSH setup, mDNS network discovery, and architecture overview).
  - Add explicit instructions informing users that the digital twin runs directly on the Raspberry Pi host at `http://<pi-ip>:3000/emulator/` or `http://raspberrypi.local:3000/emulator/`.
- **Online Cloud App Safeguard**:
  - In cloud/remote deployments where no physical Pi is accessible, prevent confusion by keeping the landing page purely informational, linking to the documentation and technical wiki (`/wiki.html`).

---

## 2. Internal Architecture Documentation (`wiki.html`)

Expand `wiki.html` with comprehensive, technical architectural schematics and implementation details:
- **Hardware Daemon Architecture (`hardware_daemon.py`)**:
  - Direct I2C-1 bus polling (`HTS221` temp/humidity at `0x5F`, `LPS25H` pressure at `0x5C`, `LSM9DS1` IMU at `0x6A` & `0x1C`).
  - Native Linux framebuffer access via `/dev/fb1` (RGB565 16-bit packed 128-byte buffer).
  - Linux evdev input subsystem handling via `/dev/input/event*` for the 5-way joystick (`KEY_UP`, `KEY_DOWN`, `KEY_LEFT`, `KEY_RIGHT`, `KEY_ENTER` / `KEY_OK`).
  - Broadcom BCM2711 Hardware PWM generation via `/sys/class/pwm/pwmchip0` and pin multiplexing (`pinctrl set 18 a5`).
- **Full-Stack IPC & Synchronization Pipeline**:
  - Node.js Express server (`server.ts`) managing bidirectional JSON IPC streams (`/tmp/pi_sense_hardware.json` and `/tmp/pi_hw_commands.jsonl`).
  - High-frequency WebSocket pub/sub for real-time telemetry, 64-pixel RGB streaming, and joystick events.
- **C & Python SDK Architecture**:
  - Shared C library `libpi_twin.h` with direct sysfs/I2C/framebuffer bindings and compilation via GCC.
  - Python `SenseHat` compatibility layer with transparent hardware bridging and fallback emulation.
- **Camera Pipeline Architecture**:
  - Video device capture (`/dev/video0`, libcamera, v4l2) streaming over HTTP/WebSocket into real-time canvas processing pipelines.
- **Online Code Editor Usage Guide**:
  - Step-by-step documentation on creating, running, interrupting, and saving student programs.

---

## 3. Curriculum & Code Studio Examples Expansion (`curriculumExamples.ts`)

- **Interactive 5-Way Joystick Tic-Tac-Toe Game (Python)**:
  - 8x8 RGB LED matrix board divided into a 3x3 grid with separator lines.
  - 5-way joystick navigation: Up/Down/Left/Right moves a flashing selector cursor.
  - Middle/Centre press places player token (Red 'X' vs Blue 'O').
  - Win condition detection (rows, columns, diagonals) with celebratory matrix animation.
- **Interactive RGB Pixel Mover (Python)**:
  - Controls an RGB pixel across the 8x8 canvas using the 5-way joystick.
  - Boundary physics (wrap-around or wall collision modes), color cycling on Middle press, and optional snake-like fading trail.
- **Separate LCD vs RGB Matrix Examples**:
  - Split current mixed examples into dedicated categories in the UI and data files:
    - `Sense HAT Matrix Programs`: Checkerboards, animations, games, telemetry meters.
    - `External I2C Character LCD (HD44780)`: Formatted string readouts, custom characters, horizontal scrolling banners, sensor logging display.
- **Expanded C Language Programs**:
  - `C Hardware PWM LED Breathing Effect`: Smooth sinusoidal duty-cycle modulation on GPIO 18 (PWM0).
  - `C 5-Way Joystick Event Polling`: Continuous polling of joystick directions (Up, Down, Left, Right, Middle) and actions (Press, Hold, Release).
  - `C LCD Telemetry Scroller`: Reading structured sensors into formatted 16x2 text with custom degree symbols.
- **Native C Character Device Driver Example**:
  - Educational C character device driver code showing Linux kernel module structure (`module_init`, `module_exit`, `file_operations` struct with `read`, `write`, `open`, `release`, and `ioctl`) for `/dev/sense_led`.
  - Companion userspace test application in C demonstrating opening `/dev/sense_led` and writing raw RGB bytes to the matrix.

---

## 4. Real-Time Camera Subsystem & Edge Detection Window

- **Hardware Camera Probing & Endpoint**:
  - Add camera detection logic in `server.ts` and `hardware_daemon.py` checking for `/dev/video*`, Raspberry Pi Camera Module (CSI-2 via `libcamera`), and USB UVC webcams.
  - Streaming endpoint `/api/camera/stream` providing MJPEG video stream or real-time snapshot frames.
  - Client-side WebRTC/canvas capture fallback when running in browser twin mode without physical camera.
- **Dedicated Pop-Out Camera Window & Modal Viewer**:
  - New component `CameraViewerModal.tsx` accessible via a dedicated Camera tab/button in the emulator ribbon.
  - Ability to pop out into an independent browser window (`/camera/`) or view inside a draggable/resizable modal.
- **Real-Time Edge Detection & Grayscale Gradient Filter**:
  - Canvas-based image processing running real-time 3x3 Sobel convolution kernels (horizontal $G_x$ and vertical $G_y$ gradients) to compute edge magnitude $\sqrt{G_x^2 + G_y^2}$.
  - Grayscale conversion with adjustable edge threshold slider, inverted color mode, and live FPS counter.
- **Long-Running Execution Engine**:
  - Remove rigid 10s execution timeouts for camera, computer vision, and telemetry logging programs.
  - Introduce configurable timeout (or continuous execution with watchdog) and a prominent, instant "Stop Process" (SIGINT / SIGKILL) button in the Code Studio.

---

## 5. Realistic Code Studio Redesign (`CodeStudio.tsx`)

- **Default Light Theme & Dark Theme Switcher**:
  - Modern, realistic developer interface: Default clean light theme (resembling Xcode / VS Code Light with high contrast syntax and crisp line borders).
  - One-click toggle between Light (`light`) and Dark (`dark`) modes, persisted in `localStorage`.
- **File Persistence on Raspberry Pi Disk**:
  - Backend API endpoints `GET /api/files/list`, `POST /api/files/save`, and `POST /api/files/load` to save student code directly to `/home/pi/pi-digit/projects/` (or configurable project path).
  - File tab bar showing file name, file dirty indicator (`●`), "Save to Pi" button, and "New File" modal.
- **Editor Enhancements**:
  - Monospace font, realistic line numbers gutter, active line highlighting, and syntax color formatting for both Python 3 and C.

---

## 6. Digital Twin UI Restyling & Hardware Realism

- **Uncurved LED Matrix Canvas Corners**:
  - Change 8x8 LED matrix canvas from `rounded-2xl` / `rounded-xl` to sharp `rounded-none` or subtle 2px industrial PCB square corners (`rounded-xs`), reflecting the authentic physical Sense HAT surface mount design.
- **Strict Hardware Bridge Unlink State**:
  - Fix the "Unlink Bridge" feature: When unlinked by the user, set `isBridgeForcedUnlinked = true` in state and server, preventing automatic reconnection loops.
  - Explicitly show `"Device Disconnected"` state across the UI whenever hardware is unlinked or physically absent.
- **Remove "Simulate Sensor" Toggle**:
  - Eliminate the artificial "simulate sensor" toggle from the Sense HAT panel.
  - Replace with clear, factual status indicators: `"Hardware Active"` vs `"Device Disconnected (Standby)"`.
- **LCD Hardware Disclaimer Notice**:
  - Add clear, educational architectural notice on `LcdDisplayTwin.tsx`:
    > *"Notice: The physical Raspberry Pi Sense HAT board contains an 8×8 RGB LED Matrix, but does not include an onboard LCD screen. This LCD panel emulates an external HD44780 character LCD display interfaced via the Pi's I2C-1 bus (address 0x27 / 0x3F), demonstrating how external embedded displays operate in real-world robotics and instrumentation."*
- **View Diagnostics Revamp**:
  - Strip out decorative icons, candy pill badges, and AI-like clutter from `HardwareDiagnosticModal.tsx`.
  - Replace with a dense, monospace engineer's diagnostic terminal: bus table (`/dev/i2c-1`), hex device map (`0x46`, `0x5c`, `0x6a`), framebuffer status (`/dev/fb1`), evdev input paths, and kernel memory access permissions (`/dev/gpiomem`).

---

## 7. Structured File Logging & Component Verification Tests

- **File Logging in `logs/`**:
  - Ensure directory `logs/` exists at the project root.
  - `logs/hardware_daemon.log`: Physical hardware events, I2C bus transactions, evdev inputs.
  - `logs/server.log`: HTTP requests, WebSocket client connections, peripheral toggles.
  - `logs/student_exec.log`: Process spawn timestamps, compilation logs, execution exit codes.
- **Component Verification Test Scripts in `tests/`**:
  - `tests/test_sensors.py`: Automated self-test verifying HTS221 temperature/humidity and LPS25H pressure readings with sanity bounds.
  - `tests/test_joystick.py`: Automated test validating Middle, Up, Down, Left, and Right keycodes and press/hold/release action normalization.
  - `tests/test_matrix.py`: Framebuffer and virtual matrix color rendering test (checkerboard, RGB primary sweep, clear).
  - `tests/test_camera.py`: Video capture test checking camera device detection and frame grab.
  - `tests/test_c_sdk.sh`: Shell script compiling and running a test C program against `libpi_twin.h`.

---

## Verification Plan

1. **Compilation & Linting**:
   - Run `lint_applet` and `compile_applet` to verify zero TypeScript/JSX errors.
2. **Landing Page Verification**:
   - Verify `index.html` has zero broken emulator launch buttons and cleanly presents Pi installation steps and documentation links.
3. **Wiki & Architecture Verification**:
   - Verify `/wiki.html` loads comprehensive technical documentation with daemon, IPC, C/Python, and camera pipeline schematics.
4. **Code Studio Light/Dark Theme & Pi File Saving**:
   - Verify Code Studio defaults to Light theme, toggles to Dark theme, and saves/loads files to disk via `/api/files/*`.
5. **Camera & Edge Detection Window**:
   - Open `/emulator/`, launch the Camera pop-out window, test real-time edge detection and grayscale gradient filter with slider controls.
6. **Curriculum & Joystick Programs**:
   - Test running Tic-Tac-Toe game, Pixel Mover, C PWM generator, and C character device driver example.
7. **Diagnostics & LCD Clarity**:
   - Verify uncurved 8x8 LED matrix canvas corners, verify LCD architectural notice, verify unlinking bridge remains disconnected, and verify clean monospace diagnostics modal.
8. **Automated Test Suite**:
   - Run verification scripts in `tests/` and check log outputs in `logs/`.
