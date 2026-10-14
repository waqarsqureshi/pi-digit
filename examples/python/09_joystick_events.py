# 09. Read Sense HAT 5-Way Joystick Events
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
print("=== Sense HAT 5-Way Joystick Event Listener ===")
print("Move or click the joystick (Up, Down, Left, Right, Centre / Press / Release)...")

# Check for events on the joystick
for i in range(1, 15):
    events = sense.stick.get_events()
    if events:
        for ev in events:
            print(f"Joystick Event -> Direction: {ev.direction.upper()} | Action: {ev.action.upper()}")
    else:
        print(f"Waiting for joystick interaction... [{i}/15]")
    time.sleep(0.5)

print("Joystick listener finished.")
