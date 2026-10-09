# 03. RGB Colour Cycle
from pi_twin import SenseHat
import time

sense = SenseHat()

colors = [
    ("Red",     255, 0,   0),
    ("Green",   0,   255, 0),
    ("Blue",    0,   120, 255),
    ("Amber",   255, 180, 0),
    ("Cyan",    0,   230, 230),
    ("Magenta", 230, 0,   230),
    ("White",   255, 255, 255)
]

print("Starting 8x8 Matrix Colour Cycle...")
for name, r, g, b in colors:
    print(f"Displaying {name} -> RGB({r}, {g}, {b})")
    sense.clear(r, g, b)
    time.sleep(0.4)

sense.clear()
print("Cycle finished. Matrix cleared.")
