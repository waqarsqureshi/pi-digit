# 07. Read Barometric Pressure
from pi_twin import SenseHat
import time

sense = SenseHat()
print("Sense HAT LPS25H Barometric Pressure Sensor:")

for i in range(1, 8):
    pressure = sense.get_pressure()
    # 1013.25 hPa is standard sea level pressure
    altitude_approx = 44330 * (1 - (pressure / 1013.25)**(1/5.255))
    print(f"[{i:02d}] Pressure: {pressure:.2f} hPa | Approx Altitude: {altitude_approx:.1f} m")
    time.sleep(0.4)

print("Barometer sample batch complete.")
