# 03. RGB Colour Cycle
# Cycles full 8x8 matrix through Red, Green, Blue, Amber, Cyan, Magenta
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
    time.sleep(0.6)

sense.clear()
print("Cycle finished. Matrix cleared.")
