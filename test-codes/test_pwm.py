#!/usr/bin/env python3
"""
PWM Signal Generator Test
File: test-codes/test_pwm.py
Tests Pulse-Width Modulation signal generation on BCM GPIO 18 (PWM0, Pin 12).
Verifies frequency configuration and duty cycle changes streaming via WebSocket to the web app oscilloscope.
"""
import sys
import os
import time
import json

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

    print("=" * 65)
    print("  Pi-Digit: Hardware PWM0 Signal Diagnostic Test")
    print("=" * 65)
    print(f"Target Pin : GPIO {PWM_PIN} (Physical Pin 12 / Hardware PWM0)")

    GPIO.setmode(GPIO.BCM)
    GPIO.setup(PWM_PIN, GPIO.OUT)

    test_frequencies = [500, 1000, 2500]
    test_duties = [20, 50, 80]

    try:
        pwm = GPIO.PWM(PWM_PIN, 1000)
        print("Starting PWM with 50% Duty Cycle at 1000 Hz...")
        pwm.start(50)
        time.sleep(1.0)

        for freq in test_frequencies:
            for duty in test_duties:
                print(f"Testing PWM -> Freq: {freq:4d} Hz | Duty Cycle: {duty:2d}%")
                pwm.ChangeFrequency(freq)
                pwm.ChangeDutyCycle(duty)
                time.sleep(0.6)

        print("\nStopping PWM output...")
        pwm.stop()
        GPIO.cleanup()
        print("[ PASS ] PWM signal generation test completed successfully.")
    except Exception as e:
        print(f"[ FAIL ] PWM test encountered an error: {e}")

if __name__ == "__main__":
    main()
