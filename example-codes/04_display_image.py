# 04. Display 8x8 Pixel Art Bitmap
from pi_twin import SenseHat
import time

sense = SenseHat()

R = [255, 0, 0]      # Red
G = [0, 200, 0]      # Green
O = [0, 0, 0]        # Off
W = [255, 255, 255]  # White

# Raspberry Icon Bitmap
raspberry = [
    O, G, G, O, O, G, G, O,
    O, O, G, G, G, G, O, O,
    O, R, R, R, R, R, R, O,
    R, R, W, R, R, W, R, R,
    R, R, R, R, R, R, R, R,
    R, R, R, R, R, R, R, R,
    O, R, R, R, R, R, R, O,
    O, O, R, R, R, R, O, O
]

print("Rendering 8x8 Pixel Art Raspberry onto Sense HAT...")
sense.set_pixels(raspberry)
time.sleep(2)
print("Image rendered successfully.")
