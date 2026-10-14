# 12. External Character LCD Display Viewport
# Sends text commands to 16x2 / 20x4 I2C Character Display
import sys
import os
import time

_SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src'))
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

try:
    from py_twin import LCD
except ImportError:
    from pi_twin import LCD

lcd = LCD()
print("Writing to Character LCD display...")

lcd.clear()
lcd.write("Raspberry Pi 4")
lcd.set_cursor(1, 0)
lcd.write("Digital Twin OK!")

time.sleep(2)
print("LCD text synchronized on browser viewport.")
