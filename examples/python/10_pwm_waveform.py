# 10. Hardware PWM Signal Generator (GPIO 18 / PWM0)
# Generates Pulse-Width Modulation signals and streams live waveform to the Web App Oscilloscope!
import sys
import os
import time

# Ensure project src and root are in python search path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
for p in (SRC_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    import RPi.GPIO as GPIO
    source_label = "RPi.GPIO (hardware)"
except ImportError:
    try:
        from py_twin import EmulatorGPIO as GPIO
        source_label = "py_twin EmulatorGPIO"
    except ImportError:
        from pi_twin import EmulatorGPIO as GPIO
        source_label = "pi_twin EmulatorGPIO"

PWM_PIN = 18  # BCM 18 is Hardware PWM0 (Physical Pin 12)

print("=== Raspberry Pi Hardware PWM Generator ===", flush=True)
print(f"Source: {source_label}", flush=True)
print(f"Initializing GPIO {PWM_PIN} (Pin 12) for PWM signal generation...", flush=True)

GPIO.setmode(GPIO.BCM)
GPIO.setup(PWM_PIN, GPIO.OUT)

# Create PWM instance at 1000 Hz
pwm = GPIO.PWM(PWM_PIN, 1000)

try:
    print("\nStep 1: Starting PWM with 25% duty cycle at 1000 Hz...", flush=True)
    pwm.start(25)
    time.sleep(1.5)

    print("Step 2: Increasing duty cycle to 50%...", flush=True)
    pwm.ChangeDutyCycle(50)
    time.sleep(1.5)

    print("Step 3: Increasing duty cycle to 75% at 2000 Hz...", flush=True)
    pwm.ChangeFrequency(2000)
    pwm.ChangeDutyCycle(75)
    time.sleep(1.5)

    print("Step 4: Sweeping duty cycle from 10% to 90%...", flush=True)
    for duty in [10, 30, 50, 70, 90]:
        print(f"  -> PWM Duty: {duty}% @ {2000} Hz", flush=True)
        pwm.ChangeDutyCycle(duty)
        time.sleep(0.5)

    print("Step 5: Returning to safe idle and stopping PWM generator...", flush=True)
finally:
    try:
        pwm.ChangeDutyCycle(0)
        pwm.stop()
    except Exception:
        pass
    GPIO.cleanup()
    print("PWM waveform demonstration completed.", flush=True)
