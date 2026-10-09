# 10. Hardware PWM Signal Generator (GPIO 18 / PWM0)
# Generates Pulse-Width Modulation signals and streams live waveform to the Web App Oscilloscope!
import sys
import os
import time

# Ensure project root is in python search path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    import RPi.GPIO as GPIO
except ImportError:
    from pi_emulator import EmulatorGPIO as GPIO

PWM_PIN = 18  # BCM 18 is Hardware PWM0 (Physical Pin 12)

print("=== Raspberry Pi 4 Hardware PWM Generator ===")
print(f"Initializing GPIO {PWM_PIN} (Pin 12) for PWM signal generation...")

GPIO.setmode(GPIO.BCM)
GPIO.setup(PWM_PIN, GPIO.OUT)

# Create PWM instance at 1000 Hz
pwm = GPIO.PWM(PWM_PIN, 1000)

print("\nStep 1: Starting PWM with 25% duty cycle at 1000 Hz...")
pwm.start(25)
time.sleep(1.5)

print("Step 2: Increasing duty cycle to 50%...")
pwm.ChangeDutyCycle(50)
time.sleep(1.5)

print("Step 3: Increasing duty cycle to 75% at 2000 Hz...")
pwm.ChangeFrequency(2000)
pwm.ChangeDutyCycle(75)
time.sleep(1.5)

print("Step 4: Sweeping duty cycle from 10% to 90%...")
for duty in [10, 30, 50, 70, 90]:
    print(f"  -> PWM Duty: {duty}%")
    pwm.ChangeDutyCycle(duty)
    time.sleep(0.5)

print("Step 5: Stopping PWM generator...")
pwm.stop()
GPIO.cleanup()
print("PWM waveform demonstration completed.")
