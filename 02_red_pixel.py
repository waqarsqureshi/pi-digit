# 02. Sense HAT Single Pixel
from pi_twin import SenseHat
import time

sense = SenseHat()
sense.clear()

print("Setting Pixel (0, 0) to Red...")
sense.set_pixel(0, 0, 255, 0, 0)
time.sleep(0.5)

print("Moving Red Pixel across the diagonal...")
for i in range(8):
    sense.clear()
    sense.set_pixel(i, i, 255, 0, 0)
    print(f"Pixel moved to ({i}, {i})")
    time.sleep(0.25)

print("Pixel demo complete!")
