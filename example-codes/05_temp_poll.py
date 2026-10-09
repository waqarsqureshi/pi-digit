# 05. Temperature Sensor Polling
# Queries the physical Sense HAT HTS221/LPS25H sensor
import time
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
