# 05. Temperature Sensor Polling
# Queries the physical Sense HAT HTS221/LPS25H sensor
import sys
import os
import time

_SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src'))
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

try:
    from py_twin import SenseHat
except ImportError:
    from pi_emulator import SenseHat

sense = SenseHat()
print("=== Sense HAT Live Temperature Polling ===")
print("Reading temperature from physical sensors...")

for i in range(1, 11):
    temp_c = sense.get_temperature()
    temp_f = (temp_c * 9/5) + 32
    print(f"Reading #{i:02d} -> {temp_c:.2f}°C ({temp_f:.2f}°F)")
    time.sleep(0.5)

print("Temperature polling finished.")
