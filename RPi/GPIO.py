"""
RPi.GPIO Python Module for Pi-Digit Digital Twin
Emulates Raspberry Pi 4 GPIO pins and wire-free peripheral LEDs.
"""
import sys
import json
import os

BCM = 11
BOARD = 10
OUT = 0
IN = 1
HIGH = 1
LOW = 0
PUD_UP = 22
PUD_DOWN = 21

_mode = BCM
_pins = {}

def _emit(event_type, **kwargs):
    payload = {"type": event_type, **kwargs}
    print(f"__PI_TWIN_EVENT__:{json.dumps(payload)}", flush=True)

def setmode(mode):
    global _mode
    _mode = mode

def getmode():
    return _mode

def setwarnings(flag):
    pass

def setup(channel, direction, initial=0, pull_up_down=None):
    _pins[channel] = {"direction": direction, "value": initial}
    if direction == OUT and initial != 0:
        output(channel, initial)

def output(channel, value):
    val = 1 if value else 0
    _pins[channel] = {"direction": OUT, "value": val}
    _emit("gpio_output", bcm=channel, value=val)

def input(channel):
    try:
        if os.path.exists('/tmp/pi_twin_gpio.json'):
            with open('/tmp/pi_twin_gpio.json', 'r') as f:
                data = json.load(f)
                for p in data:
                    if p.get('bcm') == channel:
                        return p.get('value', 0)
    except Exception:
        pass
    return _pins.get(channel, {}).get("value", 0)

def cleanup():
    _pins.clear()

class PWM:
    def __init__(self, channel, frequency):
        self.channel = channel
        self.frequency = frequency
        self.duty_cycle = 0

    def start(self, duty_cycle):
        self.duty_cycle = duty_cycle
        _emit("pwm_output", bcm=self.channel, duty=duty_cycle, freq=self.frequency)

    def ChangeDutyCycle(self, duty_cycle):
        self.duty_cycle = duty_cycle
        _emit("pwm_output", bcm=self.channel, duty=duty_cycle, freq=self.frequency)

    def ChangeFrequency(self, frequency):
        self.frequency = frequency
        _emit("pwm_output", bcm=self.channel, duty=self.duty_cycle, freq=self.frequency)

    def stop(self):
        self.duty_cycle = 0
        _emit("pwm_output", bcm=self.channel, duty=0, freq=self.frequency)
