# Sense HAT Sensor Telemetry Logger
from pi_twin import SenseHat
import time

sense = SenseHat()

print("=== Sense HAT Telemetry Stream ===")
for i in range(1, 6):
    temp = sense.get_temperature()
    humidity = sense.get_humidity()
    pressure = sense.get_pressure()
    print(f"Sample #{i} -> Temp: {temp:.1f}°C | Humidity: {humidity:.1f}% | Pressure: {pressure:.1f} hPa")
    time.sleep(0.5)

print("Telemetry batch logged successfully.")
