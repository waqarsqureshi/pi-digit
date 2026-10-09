#!/usr/bin/env python3
"""
Live Sensor & Motion Verification
File: test-codes/test_sensors.py
Continuously polls the Sense HAT IMU (Accelerometer, Gyroscope, Orientation)
and environmental sensors (Temperature, Humidity, Pressure).
Move or tilt your Raspberry Pi 4 to verify real accelerometer values change in real time!
"""
import sys
import os
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

def get_sense_instance():
    # Attempt real hardware first
    orig_path = list(sys.path)
    clean_path = [p for p in orig_path if p and p != '' and p != '.' and not os.path.exists(os.path.join(p, 'pi_emulator.py'))]
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
    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    from pi_emulator import EmulatorSenseHat
    return EmulatorSenseHat(), "Emulator / Digital Twin Driver"

def main():
    sense, source_desc = get_sense_instance()
    print("=" * 70)
    print("  Pi-Digit: Live Sensor & Accelerometer Motion Polling")
    print("=" * 70)
    print(f"Driver Source : {source_desc}")
    print("Instruction   : Tilt or move the Raspberry Pi to observe changing Accelerometer values.")
    print("-" * 70)
    print(f"{'Sample':<7} | {'Temp':<7} | {'Humidity':<9} | {'Pressure':<9} | {'Accel X':<8} {'Accel Y':<8} {'Accel Z':<8} | {'Heading':<7}")
    print("-" * 70)

    try:
        for i in range(1, 16):
            t = sense.get_temperature()
            h = sense.get_humidity()
            p = sense.get_pressure()
            accel = sense.get_accelerometer_raw()
            orient = sense.get_orientation()
            yaw = orient.get('yaw', 0.0)

            ax = accel.get('x', 0.0)
            ay = accel.get('y', 0.0)
            az = accel.get('z', 0.0)

            print(f"#{i:<6} | {t:>5.1f}°C | {h:>7.1f}% | {p:>7.1f}hPa | {ax:>7.2f}g {ay:>7.2f}g {az:>7.2f}g | {yaw:>6.1f}°")
            time.sleep(0.4)

    except KeyboardInterrupt:
        print("\nPolling stopped by user.")

    print("-" * 70)
    print("Sensor polling completed.")
    print("=" * 70)

if __name__ == "__main__":
    main()
