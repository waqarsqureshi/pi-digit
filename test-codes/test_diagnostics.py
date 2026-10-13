#!/usr/bin/env python3
"""
Pi-Digit Hardware Diagnostics & Self-Test Suite
File: test-codes/test_diagnostics.py
Tests physical hardware connectivity, I2C buses, Sense HAT sensors,
accelerometer/IMU motion, LED matrix, and GPIO linkage.
"""
import sys
import os
import time
import json
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
for p in (SRC_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

def print_header(title):
    print("=" * 65)
    print(f"  {title.upper()}")
    print("=" * 65)

def print_result(test_name, passed, detail=""):
    status = " [ PASS ] " if passed else " [ WARN ] "
    symbol = "✓" if passed else "⚠"
    print(f"{status} {symbol} {test_name:<34} : {detail}")

def safe_import_system_sense_hat():
    """Safely loads system sense_hat, bypassing local project mock files."""
    orig_path = list(sys.path)
    clean_path = [
        p for p in orig_path
        if p and p != '' and p != '.'
        and not os.path.exists(os.path.join(p, 'pi_emulator.py'))
        and not os.path.exists(os.path.join(p, 'src', 'pi_emulator.py'))
        and not (os.path.basename(p.rstrip('/\\')) == 'src' and os.path.exists(os.path.join(p, 'pi_emulator.py')))
    ]
    try:
        sys.path = clean_path
        sys.modules.pop('sense_hat', None)
        import sense_hat
        if hasattr(sense_hat, 'SenseHat') and 'pi_emulator' not in getattr(sense_hat.SenseHat, '__module__', ''):
            return sense_hat.SenseHat()
    except Exception:
        pass
    finally:
        sys.path = orig_path
    
    # Try local emulator library as fallback
    try:
        for p in (SRC_DIR, PROJECT_ROOT):
            if p not in sys.path:
                sys.path.insert(0, p)
        from py_twin import EmulatorSenseHat
        return EmulatorSenseHat()
    except Exception:
        try:
            from pi_emulator import EmulatorSenseHat
            return EmulatorSenseHat()
        except Exception:
            return None

def main():
    print_header("Raspberry Pi 4 & Sense HAT Hardware Diagnostics")
    print(f"Host System   : {os.uname().sysname} {os.uname().release} ({os.uname().machine})")
    print(f"Python Runtime: {sys.version.split()[0]}")
    print(f"Timestamp     : {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 65)

    results = []

    # 1. Raspberry Pi Model Check
    model_name = "Generic / Virtual Linux Host"
    is_rpi = False
    model_file = "/sys/firmware/devicetree/base/model"
    if os.path.exists(model_file):
        try:
            with open(model_file, "r") as f:
                model_name = f.read().strip().replace('\x00', '')
                if "raspberry pi" in model_name.lower():
                    is_rpi = True
        except Exception:
            pass
    print_result("Host Platform Detection", is_rpi, model_name)
    results.append(("Platform Detection", is_rpi))

    # 2. I2C Bus 1 Check
    i2c_bus_ok = os.path.exists("/dev/i2c-1")
    i2c_detail = "/dev/i2c-1 character device present" if i2c_bus_ok else "/dev/i2c-1 missing (enable via raspi-config)"
    print_result("I2C-1 Bus Controller", i2c_bus_ok, i2c_detail)
    results.append(("I2C-1 Controller", i2c_bus_ok))

    # 3. I2C Sense HAT Device Detection
    detected_addrs = []
    if i2c_bus_ok:
        try:
            res = subprocess.run(["i2cdetect", "-y", "1"], capture_output=True, text=True, timeout=2)
            for addr in ["46", "5c", "5f", "6a", "1c", "27"]:
                if addr in res.stdout:
                    detected_addrs.append("0x" + addr)
        except Exception:
            # Fallback checking sysfs
            for addr in ["0046", "005c", "006a"]:
                if os.path.exists(f"/sys/bus/i2c/devices/1-{addr}"):
                    detected_addrs.append("0x" + addr[2:])

    has_sense_hat_chips = len(detected_addrs) > 0
    chip_detail = f"Found: {', '.join(detected_addrs)}" if detected_addrs else "No devices acknowledged on I2C bus 1"
    print_result("I2C Chip Scan (0x46, 0x5C, 0x6A)", has_sense_hat_chips, chip_detail)
    results.append(("I2C Chip Scan", has_sense_hat_chips))

    # 4. Sense HAT Python Driver Binding
    sense = safe_import_system_sense_hat()
    sense_loaded = sense is not None
    is_real_driver = sense is not None and not getattr(sense, '__class__', '').__name__ == 'EmulatorSenseHat'
    driver_detail = "Native OS driver active" if is_real_driver else ("Emulator driver active" if sense_loaded else "Driver failed to load")
    print_result("Sense HAT Library Interface", sense_loaded, driver_detail)
    results.append(("Sense HAT Driver", sense_loaded))

    # 5. Temperature & Humidity (HTS221)
    temp_val = None
    humidity_val = None
    if sense:
        try:
            temp_val = sense.get_temperature()
            humidity_val = sense.get_humidity()
        except Exception as e:
            driver_detail += f" (Err: {e})"

    has_temp = temp_val is not None and temp_val > 0
    t_detail = f"{temp_val:.1f}°C, Humidity: {humidity_val:.1f}% rH" if has_temp else "Failed to read environmental sensor"
    print_result("Temperature & Humidity (HTS221)", has_temp, t_detail)
    results.append(("HTS221 Sensor", has_temp))

    # 6. Barometric Pressure (LPS25H)
    pressure_val = None
    if sense:
        try:
            pressure_val = sense.get_pressure()
        except Exception:
            pass

    has_press = pressure_val is not None and pressure_val > 800
    p_detail = f"{pressure_val:.1f} hPa (mbar)" if has_press else "Failed to read pressure sensor"
    print_result("Barometric Pressure (LPS25H)", has_press, p_detail)
    results.append(("LPS25H Sensor", has_press))

    # 7. 9-DOF IMU Accelerometer & Motion (LSM9DS1)
    accel = None
    orient = None
    if sense:
        try:
            accel = sense.get_accelerometer_raw()
            orient = sense.get_orientation()
        except Exception:
            pass

    has_accel = accel is not None and ('x' in accel and 'y' in accel and 'z' in accel)
    if has_accel:
        a_detail = f"Accel: X={accel['x']:.2f}g, Y={accel['y']:.2f}g, Z={accel['z']:.2f}g | Yaw={orient.get('yaw', 0):.1f}°"
    else:
        a_detail = "Failed to query accelerometer / orientation"
    print_result("9-DOF IMU Accelerometer (LSM9DS1)", has_accel, a_detail)
    results.append(("LSM9DS1 Accelerometer", has_accel))

    # 8. 8x8 RGB LED Matrix Framebuffer
    fb_path = "/dev/fb1" if os.path.exists("/dev/fb1") else ("/dev/fb0" if os.path.exists("/dev/fb0") else None)
    has_fb = fb_path is not None
    fb_detail = f"Framebuffer device found at {fb_path}" if has_fb else "No auxiliary framebuffer (/dev/fb1)"
    print_result("8x8 RGB LED Framebuffer", has_fb, fb_detail)
    results.append(("LED Framebuffer", has_fb))

    # 9. GPIO Controller & Pin Accessibility
    gpio_ok = os.path.exists("/dev/gpiomem") or os.path.exists("/dev/gpiochip0")
    try:
        res = subprocess.run(["pinctrl", "get", "17"], capture_output=True, text=True, timeout=1)
        if "17" in res.stdout:
            gpio_ok = True
    except Exception:
        pass
    gpio_detail = "GPIO controller accessible (/dev/gpiomem / pinctrl)" if gpio_ok else "GPIO controller not accessible"
    print_result("40-Pin GPIO Controller", gpio_ok, gpio_detail)
    results.append(("GPIO Controller", gpio_ok))

    # 10. Background Sync Service
    daemon_running = os.path.exists("/tmp/pi_sense_hardware.json")
    daemon_detail = "Telemetry file active in /tmp" if daemon_running else "Daemon file /tmp/pi_sense_hardware.json not found"
    print_result("Pi-Digit Background Sync Service", daemon_running, daemon_detail)
    results.append(("Background Daemon", daemon_running))

    # Final Summary
    print_header("Diagnostic Summary")
    passed_count = sum(1 for _, ok in results if ok)
    total_count = len(results)
    print(f"Tests Passed: {passed_count} / {total_count}")

    if has_accel and has_temp and has_sense_hat_chips:
        print("\n>>> CONCLUSION: Physical Sense HAT is CONNECTED and FULLY OPERATIONAL! <<<")
        print(">>> Real-time sensor and accelerometer signals are streaming. <<<")
    elif is_rpi and not has_sense_hat_chips:
        print("\n>>> CONCLUSION: Running on Raspberry Pi, but Sense HAT is not responding on I2C-1. <<<")
        print(">>> Troubleshooting:")
        print("    1. Run: sudo raspi-config -> Interface Options -> I2C -> Enable")
        print("    2. Check that Sense HAT is firmly pressed down onto all 40 GPIO pins")
        print("    3. Run: i2cdetect -y 1 (look for 0x46, 0x5c, 0x6a)")
    else:
        print("\n>>> CONCLUSION: Operating in Virtual Digital Twin Emulation Mode. <<<")
        print(">>> Connect to a physical Raspberry Pi 4 to activate real hardware bus. <<<")
    print("=" * 65)

if __name__ == "__main__":
    main()
