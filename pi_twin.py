"""
pi_twin Python Library for Raspberry Pi 4 Physical Computing & Digital Twin
Compatible with curriculum code examples for Sense HAT, GPIO, and LCD.
"""
import sys
import json
import time
import os
from pi_emulator import EmulatorSenseHat, EmulatorGPIO

SenseHat = EmulatorSenseHat
GPIO = EmulatorGPIO

class LCD:
    def __init__(self, cols=16, rows=2):
        self.cols = cols
        self.rows = rows
        self.cursor_row = 0
        self.cursor_col = 0
        self._buffer = [" " * cols for _ in range(rows)]
        self._emit()

    def _emit(self):
        payload = {"type": "lcd_update", "lines": self._buffer}
        print(f"__PI_TWIN_EVENT__:{json.dumps(payload)}", flush=True)

    def clear(self):
        self._buffer = [" " * self.cols for _ in range(self.rows)]
        self.cursor_row = 0
        self.cursor_col = 0
        self._emit()

    def set_cursor(self, row, col):
        self.cursor_row = max(0, min(self.rows - 1, int(row)))
        self.cursor_col = max(0, min(self.cols - 1, int(col)))

    def write(self, text):
        text = str(text)
        line = list(self._buffer[self.cursor_row])
        for i, ch in enumerate(text):
            pos = self.cursor_col + i
            if pos < self.cols:
                line[pos] = ch
        self._buffer[self.cursor_row] = "".join(line)
        self.cursor_col = min(self.cols, self.cursor_col + len(text))
        self._emit()

    def print(self, text):
        self.write(text)

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

__all__ = ["EmulatorSenseHat", "EmulatorGPIO", "SenseHat", "GPIO", "LCD", "System"]
