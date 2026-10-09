"""
pi_twin Python Library for Raspberry Pi 4 Physical Computing & Digital Twin
Compatible with curriculum code examples.
"""
import sys
import json
import time
import os
from sense_hat import SenseHat
import RPi.GPIO as GPIO

class System:
    @staticmethod
    def get_info():
        return {
            "model": "Raspberry Pi 4 Model B Rev 1.4",
            "soc": "BCM2711",
            "os": "Raspberry Pi OS 12 (bookworm)",
            "runtime": "Pi-Digit Digital Twin",
        }

    @staticmethod
    def sleep(seconds):
        time.sleep(seconds)

# Export SenseHat, GPIO, and System
__all__ = ["SenseHat", "GPIO", "System"]
