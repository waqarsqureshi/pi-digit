# Pi-Digit Component Verification & Test Suite

This directory contains standalone and automated hardware verification tests for all Raspberry Pi 4 Model B and Sense HAT subsystems:

## Test Scripts

1. **`run_all_tests.py`**
   - **Master Test Runner**: Executes the complete component verification suite in sequence and produces an aggregated summary table with timing and status.
   - Run: `python3 test-codes/run_all_tests.py`

2. **`test_sensors.py`**
   - Validates environmental sensors (HTS221 temperature and humidity, LPS25H barometric pressure) and LSM9DS1 9-DOF IMU accelerometer.
   - Specifically asserts that temperature readings reflect calibrated ambient room temperature (~24°C / 75°F) rather than raw uncalibrated CPU heat (~55°C / 132°F).
   - Run: `python3 test-codes/test_sensors.py` or `python3 test-codes/test_sensors.py --check`

3. **`test_joystick.py`**
   - Tests the 5-way joystick state machine (Up, Down, Left, Right, Middle).
   - Verifies sequential `press -> hold -> release` event handling and alias normalization (`centre`, `center`, `enter` -> `middle`).
   - Run: `python3 test-codes/test_joystick.py` or `python3 test-codes/test_joystick.py --check`

4. **`test_led_matrix.py`**
   - Tests discrete pixel addressing, corner coordinates, full 64-pixel frame buffer transfers (`set_pixels`), and character rasterization (`show_letter`).
   - Run: `python3 test-codes/test_led_matrix.py` or `python3 test-codes/test_led_matrix.py --check`

5. **`test_pwm.py`**
   - Verifies hardware PWM generation on BCM GPIO 18 (Physical Pin 12 / PWM0).
   - Tests dynamic frequency modulation (500 Hz to 2500 Hz) and duty cycle adjustment (20% to 80%).
   - Run: `python3 test-codes/test_pwm.py` or `python3 test-codes/test_pwm.py --check`

6. **`test_lcd.py`**
   - Verifies the 16x2 alphanumeric I2C Character LCD viewport (`lcd.write`, `lcd.set_cursor`, `lcd.clear`, and 16-character row truncation).
   - Run: `python3 test-codes/test_lcd.py`

7. **`test_diagnostics.py`**
   - Hardware detection, Linux kernel driver bindings, I2C bus device scans (`0x46`, `0x5C`, `0x6A`, `0x27`), and system mode triage.
   - Run: `python3 test-codes/test_diagnostics.py`
