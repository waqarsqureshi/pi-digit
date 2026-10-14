# Pi-Digit Educational Code Examples & Scripts

Welcome to the Pi-Digit physical computing and embedded systems laboratory curriculum! All examples are organized into dedicated subfolders for clean modularity:

## Directory Structure

```text
examples/
├── python/                  # Python 3 Curriculum Examples
│   ├── 01_hello.py          # Hello World foundation
│   ├── 02_moving_name.py    # Scrolling name marquee on LED matrix & LCD
│   ├── 02_red_pixel.py      # Single LED pixel addressing (0, 0)
│   ├── 03_color_cycle.py    # Color palettes & transitions
│   ├── 04_display_image.py  # 8x8 bitmap graphics & icons
│   ├── 05_temp_poll.py      # Temperature telemetry with calibration
│   ├── 06_read_humidity.py  # HTS221 humidity reading
│   ├── 07_read_pressure.py  # LPS25H barometric pressure
│   ├── 08_imu_accel.py      # 9-DOF LSM9DS1 accelerometer & tilt
│   ├── 09_joystick_events.py# 5-way joystick event listener
│   ├── 10_pwm_waveform.py   # Pulse-width modulation signal generation
│   ├── 11_joystick_move_pixel.py # Interactive pixel navigation with joystick
│   ├── 12_tictactoe.py      # Complete Tic-Tac-Toe game (Joystick + AI)
│   └── 12_lcd_display.py    # 16x2 I2C alphanumeric character LCD
│
├── c/                       # Embedded C Curriculum Examples
│   ├── 01_hello.c           # C Hello World runtime test
│   ├── 02_sense_pixel.c     # Discrete pixel color addressing in C
│   ├── 03_matrix_pattern.c  # Checkerboard matrix rendering loop
│   ├── 04_sensor_read.c     # Environmental telemetry readout in C
│   ├── 05_gpio_blink.c      # GPIO 17 output pin toggling
│   ├── 06_gpio_input.c      # GPIO 27 digital input polling
│   ├── 07_lcd_output.c      # 16x2 I2C character LCD print
│   ├── 08_combined.c        # Unified Sense HAT + GPIO + LCD capstone
│   ├── 09_joystick_pixel.c  # C joystick-driven pixel navigation
│   ├── 10_device_driver.c   # Linux character device driver (/dev/sense_hat)
│   └── Makefile             # GCC compilation build script
│
└── scripts/                 # Standalone Hardware Diagnostics & Tools
    ├── hardware_daemon.py   # Background hardware sync service
    ├── hardware_diagnose.py # Comprehensive hardware self-test suite
    ├── hardware_probe.py    # Live I2C bus device probe
    ├── install-pi.sh        # Automated Pi installer script
    └── sensor_logger.py     # Telemetry logging utility
```

## Running Examples

### In Web Studio:
Click **"Load Example"** in the top toolbar to load any Python or C example directly into the code editor, then click **"Run on Pi"** to execute.

### In Terminal over SSH:
```bash
# Run Python example:
python3 examples/python/11_joystick_move_pixel.py
python3 examples/python/12_tictactoe.py

# Build and run C example:
cd examples/c && make
./01_hello
./09_joystick_pixel
./10_device_driver
```
