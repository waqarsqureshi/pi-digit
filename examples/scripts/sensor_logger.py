# Sense HAT Sensor Telemetry Logger
import sys
import os
import time

_SRC_DIR = os.path.dirname(os.path.abspath(__file__))
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)

try:
    from py_twin import SenseHat
except ImportError:
    from pi_twin import SenseHat

sense = SenseHat()

print("=== Sense HAT Telemetry Stream ===")
for i in range(1, 6):
    temp = sense.get_temperature()
    humidity = sense.get_humidity()
    pressure = sense.get_pressure()
    print(f"Sample #{i} -> Temp: {temp:.1f}°C | Humidity: {humidity:.1f}% | Pressure: {pressure:.1f} hPa")
    time.sleep(0.5)

print("Telemetry batch logged successfully.")
