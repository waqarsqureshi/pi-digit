# 07. Read Barometric Pressure
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
print("Sense HAT LPS25H Barometric Pressure Sensor:")

for i in range(1, 8):
    pressure = sense.get_pressure()
    # 1013.25 hPa is standard sea level pressure
    altitude_approx = 44330 * (1 - (pressure / 1013.25)**(1/5.255))
    print(f"[{i:02d}] Pressure: {pressure:.2f} hPa | Approx Altitude: {altitude_approx:.1f} m")
    time.sleep(0.4)

print("Barometer sample batch complete.")
