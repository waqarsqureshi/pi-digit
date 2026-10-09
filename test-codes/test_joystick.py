#!/usr/bin/env python3
"""
Sense HAT 5-Way Joystick Diagnostic Test
File: test-codes/test_joystick.py
Tests reading events from the physical Sense HAT joystick (or digital twin emulation).
Captures Up, Down, Left, Right, and Centre directional button presses.
"""
import sys
import os
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

def get_sense():
    try:
        from pi_emulator import EmulatorSenseHat
        return EmulatorSenseHat()
    except Exception:
        import sense_hat
        return sense_hat.SenseHat()

def main():
    print("=" * 65)
    print("  Pi-Digit: Sense HAT 5-Way Joystick Diagnostic")
    print("=" * 65)
    print("Interact with the Sense HAT joystick (Up, Down, Left, Right, Centre).")
    print("Polling for 10 seconds...")

    sense = get_sense()
    start_time = time.time()
    events_found = 0

    while time.time() - start_time < 10.0:
        events = sense.stick.get_events()
        if events:
            for ev in events:
                events_found += 1
                print(f"[{events_found}] Joystick Event: Direction={ev.direction.upper():<7} Action={ev.action.upper()}")
        time.sleep(0.1)

    print("-" * 65)
    print(f"Total events captured: {events_found}")
    print("[ PASS ] Joystick diagnostic polling completed.")

if __name__ == "__main__":
    main()
