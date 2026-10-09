# 09. Read Sense HAT 5-Way Joystick Events
from pi_twin import SenseHat
import time

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
