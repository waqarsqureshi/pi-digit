"""
RPi.GPIO Python Module for Pi-Digit Digital Twin and Physical Computing.
Supports dual-mode execution:
1. Controls physical Raspberry Pi GPIO pins (via pinctrl/sysfs).
2. Mirrors state to Web Emulator UI.
"""
from pi_emulator import EmulatorGPIO as GPIO

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

class PWM:
    def __init__(self, channel, frequency_hz):
        self.channel = channel
        self.freq = frequency_hz
        self.duty = 0
        GPIO.setup(channel, GPIO.OUT)

    def start(self, duty_cycle):
        self.duty = duty_cycle
        GPIO.output(self.channel, 1 if duty_cycle > 0 else 0)

    def ChangeDutyCycle(self, duty_cycle):
        self.duty = duty_cycle
        GPIO.output(self.channel, 1 if duty_cycle > 0 else 0)

    def ChangeFrequency(self, frequency_hz):
        self.freq = frequency_hz

    def stop(self):
        GPIO.output(self.channel, 0)

__all__ = [
    'BCM', 'BOARD', 'OUT', 'IN', 'HIGH', 'LOW', 'PUD_UP', 'PUD_DOWN', 'PUD_OFF',
    'setmode', 'setwarnings', 'setup', 'output', 'input', 'cleanup', 'PWM', 'GPIO'
]
