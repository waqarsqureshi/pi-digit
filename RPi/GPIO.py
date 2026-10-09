"""
RPi.GPIO Python Module for Pi-Digit Digital Twin and Physical Computing.
Supports dual-mode execution:
1. Controls physical Raspberry Pi GPIO pins (via pinctrl/sysfs).
2. Mirrors state to Web Emulator UI.
"""
from pi_emulator import EmulatorGPIO as GPIO, EmulatorPWM as PWM

# Re-export module attributes expected by student code
BCM = GPIO.BCM
BOARD = GPIO.BOARD
OUT = GPIO.OUT
IN = GPIO.IN
HIGH = GPIO.HIGH
LOW = GPIO.LOW
PUD_UP = GPIO.PUD_UP
PUD_DOWN = GPIO.PUD_DOWN
PUD_OFF = GPIO.PUD_OFF

setmode = GPIO.setmode
setwarnings = GPIO.setwarnings
setup = GPIO.setup
output = GPIO.output
input = GPIO.input
cleanup = GPIO.cleanup

__all__ = [
    'BCM', 'BOARD', 'OUT', 'IN', 'HIGH', 'LOW', 'PUD_UP', 'PUD_DOWN', 'PUD_OFF',
    'setmode', 'setwarnings', 'setup', 'output', 'input', 'cleanup', 'PWM', 'GPIO'
]
