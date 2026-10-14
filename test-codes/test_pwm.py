#!/usr/bin/env python3
"""
PWM Signal Generator Test
File: test-codes/test_pwm.py
Tests Pulse-Width Modulation signal generation on BCM GPIO 18 (PWM0, Pin 12).
Verifies frequency configuration and duty cycle changes.
"""
import sys
import os
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
for p in (SRC_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

def get_gpio():
    try:
        from py_twin import EmulatorGPIO
        return EmulatorGPIO
    except Exception:
        try:
            from pi_emulator import EmulatorGPIO
            return EmulatorGPIO
        except Exception:
            import RPi.GPIO as GPIO
            return GPIO

def main():
    GPIO = get_gpio()
    PWM_PIN = 18
    quick_check = "--quick" in sys.argv or "--check" in sys.argv

    print("=" * 65)
    print("  Pi-Digit: Hardware PWM0 Signal Diagnostic Test")
    print("=" * 65)
    print(f"Target Pin : GPIO {PWM_PIN} (Physical Pin 12 / Hardware PWM0)")

    GPIO.setmode(GPIO.BCM)
    GPIO.setup(PWM_PIN, GPIO.OUT)

    test_frequencies = [500, 1000] if quick_check else [500, 1000, 2500]
    test_duties = [25, 75] if quick_check else [20, 50, 80]

    all_passed = True

    try:
        pwm = GPIO.PWM(PWM_PIN, 1000)
        print("Starting PWM with 50% Duty Cycle at 1000 Hz...")
        pwm.start(50)
        time.sleep(0.3 if quick_check else 0.8)

        for freq in test_frequencies:
            for duty in test_duties:
                print(f"Testing PWM -> Freq: {freq:4d} Hz | Duty Cycle: {duty:2d}%")
                pwm.ChangeFrequency(freq)
                pwm.ChangeDutyCycle(duty)
                time.sleep(0.15 if quick_check else 0.4)

        print("\nStopping PWM output...")
        pwm.stop()
        print("  [PASS] PWM signal generator started, modulated, and stopped cleanly.")

    except Exception as e:
        print(f"  [FAIL] PWM test exception: {e}")
        all_passed = False
    finally:
        try:
            GPIO.cleanup()
        except Exception:
            pass

    print("-" * 65)
    if all_passed:
        print("[ PASS ] PWM hardware subsystem verified.")
    else:
        print("[ FAIL ] PWM verification failed.")
        sys.exit(1)
    print("=" * 65)

if __name__ == "__main__":
    main()
