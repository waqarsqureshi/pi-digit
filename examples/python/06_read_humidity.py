# 06. Read Humidity Telemetry
import sys
import os
import time

_SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src'))
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

try:
    from py_twin import SenseHat
except ImportError:
    from pi_twin import SenseHat

sense = SenseHat()
print("Sense HAT HTS221 Relative Humidity Telemetry:")

for sample in range(1, 8):
    humidity = sense.get_humidity()
    print(f"Sample #{sample:02d}: Relative Humidity = {humidity:.1f} % rH")
    time.sleep(0.4)

print("Relative humidity logging finished.")
