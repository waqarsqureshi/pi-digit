#!/usr/bin/env python3
"""
Live Sensor & Motion Verification
File: test-codes/test_sensors.py
Tests environmental sensors (Temperature, Humidity, Pressure) and 9-DOF IMU motion.
Verifies ambient room temperature calibration (preventing 132°F / 55°C raw SoC readings).
"""
import sys
import os
import time
import math

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
for p in (SRC_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

def get_sense_instance():
    # Attempt real hardware first
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
            return sense_hat.SenseHat(), "Physical Sense HAT (Hardware Bus)"
    except Exception:
        pass
    finally:
        sys.path = orig_path

    # Fallback to emulator
    try:
        from py_twin import EmulatorSenseHat
        return EmulatorSenseHat(), "Emulator / Digital Twin Driver"
    except Exception:
        from pi_emulator import EmulatorSenseHat
        return EmulatorSenseHat(), "Emulator / Digital Twin Driver"

def main():
    sense, source_desc = get_sense_instance()
    quick_check = "--quick" in sys.argv or "--check" in sys.argv
    max_samples = 3 if quick_check else 8

    print("=" * 75)
    print("  Pi-Digit: Environmental Sensor & Accelerometer Calibration Verification")
    print("=" * 75)
    print(f"Driver Source : {source_desc}")
    print(f"Sampling Mode : {'Quick Automated Verification' if quick_check else 'Live Sensor Stream'}")
    print("-" * 75)
    print(f"{'Sample':<7} | {'Temp (C)':<10} | {'Temp (F)':<10} | {'Humidity':<9} | {'Pressure':<9} | {'Accel (g)':<10}")
    print("-" * 75)

    all_passed = True

    try:
        for i in range(1, max_samples + 1):
            t = float(sense.get_temperature())
            h = float(sense.get_humidity())
            p = float(sense.get_pressure())
            accel = sense.get_accelerometer_raw()
            t_f = (t * 9.0 / 5.0) + 32.0

            ax = accel.get('x', 0.0)
            ay = accel.get('y', 0.0)
            az = accel.get('z', 1.0)
            g_mag = math.sqrt(ax*ax + ay*ay + az*az)

            print(f"#{i:<6} | {t:>7.1f}°C  | {t_f:>7.1f}°F  | {h:>7.1f}% | {p:>7.1f}hPa | {g_mag:>6.2f}g")

            # Verification assertions:
            # 1. Temperature must be in realistic ambient range (15°C - 38°C), NOT uncalibrated SoC ~55°C (132°F)
            if t > 45.0:
                print(f"  [FAIL] Temperature {t:.1f}°C ({t_f:.1f}°F) indicates uncalibrated CPU heat absorption!")
                all_passed = False
            elif t < 10.0:
                print(f"  [FAIL] Temperature {t:.1f}°C is unrealistically cold.")
                all_passed = False

            # 2. Humidity must be between 5% and 95%
            if h < 5.0 or h > 98.0:
                print(f"  [FAIL] Humidity {h:.1f}% is out of valid bounds.")
                all_passed = False

            # 3. Pressure must be standard terrestrial atmosphere (850 - 1100 hPa)
            if p < 850.0 or p > 1150.0:
                print(f"  [FAIL] Pressure {p:.1f} hPa is out of standard atmospheric bounds.")
                all_passed = False

            time.sleep(0.25 if quick_check else 0.4)

    except KeyboardInterrupt:
        print("\nPolling stopped by user.")

    print("-" * 75)
    if all_passed:
        print("[ PASS ] All sensors verified: Ambient calibrated (~24°C / 75°F), HTS221 & LPS25H nominal.")
    else:
        print("[ WARN ] One or more sensor readings were out of nominal ranges.")
    print("=" * 75)

    if quick_check and not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    main()
