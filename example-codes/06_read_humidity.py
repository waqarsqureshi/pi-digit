# 06. Read Humidity Telemetry
from pi_twin import SenseHat
import time

sense = SenseHat()
print("Sense HAT HTS221 Relative Humidity Telemetry:")

for sample in range(1, 8):
    humidity = sense.get_humidity()
    print(f"Sample #{sample:02d}: Relative Humidity = {humidity:.1f} % rH")
    time.sleep(0.4)

print("Relative humidity logging finished.")
