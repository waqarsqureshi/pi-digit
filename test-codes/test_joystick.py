#!/usr/bin/env python3
"""
Sense HAT 5-Way Joystick Diagnostic & State Machine Test
File: test-codes/test_joystick.py
Tests:
  1. Directional event reading: UP, DOWN, LEFT, RIGHT, MIDDLE.
  2. Action state machine transitions: PRESSED -> HELD -> RELEASED.
  3. Directional alias normalization (centre, center, enter -> middle).
"""
import sys
import os
import time
import json

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
for p in (SRC_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

def get_sense():
    try:
        from py_twin import EmulatorSenseHat
        return EmulatorSenseHat()
    except Exception:
        try:
            from pi_emulator import EmulatorSenseHat
            return EmulatorSenseHat()
        except Exception:
            import sense_hat
            return sense_hat.SenseHat()

def test_joystick_state_machine(sense):
    print("\n--- Running Automated Joystick State Machine Verification ---")
    ts = int(time.time() * 1000)

    # Inject a deterministic test sequence into /tmp/pi_sense_hardware.json:
    # 1. Middle PRESS
    # 2. Middle HOLD
    # 3. Middle RELEASE
    # 4. Up PRESS
    # 5. Right RELEASE
    test_events = [
        {"direction": "middle", "action": "press",   "timestamp": ts + 10},
        {"direction": "middle", "action": "hold",    "timestamp": ts + 20},
        {"direction": "middle", "action": "release", "timestamp": ts + 30},
        {"direction": "up",     "action": "press",   "timestamp": ts + 40},
        {"direction": "right",  "action": "release", "timestamp": ts + 50},
    ]

    hw_file = "/tmp/pi_sense_hardware.json"
    existing_data = {}
    if os.path.exists(hw_file):
        try:
            with open(hw_file, "r") as f:
                existing_data = json.load(f)
        except Exception:
            pass

    existing_data["joystickEvents"] = test_events
    existing_data["lastJoystick"] = test_events[-1]
    with open(hw_file, "w") as f:
        json.dump(existing_data, f)

    # Test reading via stick
    events = sense.stick.get_events()
    print(f"Captured {len(events)} events from hardware/emulator stream:")
    for ev in events:
        print(f"  -> Direction: {str(ev.direction).upper():<7} | Action: {str(ev.action).upper()}")

    # Assertions
    passed = True
    if len(events) < 3:
        print("  [FAIL] Expected at least 3 events (press, hold, release), got", len(events))
        passed = False

    directions = [str(ev.direction).lower() for ev in events]
    actions = [str(ev.action).lower() for ev in events]

    if "middle" not in directions:
        print("  [FAIL] 'middle' direction was not found in captured events!")
        passed = False
    else:
        print("  [PASS] Middle button press detected successfully.")

    if not any(a in ('held', 'hold') for a in actions):
        print("  [FAIL] 'hold' action was not captured!")
        passed = False
    else:
        print("  [PASS] Press-and-hold (HELD) event state machine verified.")

    if not any(a in ('released', 'release') for a in actions):
        print("  [FAIL] 'release' action was not captured!")
        passed = False
    else:
        print("  [PASS] Button release (RELEASED) event verified.")

    # Test direction string alias normalization
    from pi_emulator import DirectionStr, ActionStr
    d_mid = DirectionStr('centre')
    if d_mid == 'middle' and d_mid == 'centre' and d_mid == 'enter':
        print("  [PASS] DirectionStr alias equivalence verified (centre == middle == enter).")
    else:
        print("  [FAIL] DirectionStr alias check failed.")
        passed = False

    a_press = ActionStr('press')
    if a_press == 'pressed' and a_press == 'press':
        print("  [PASS] ActionStr equivalence verified (press == pressed).")
    else:
        print("  [FAIL] ActionStr check failed.")
        passed = False

    return passed

def main():
    print("=" * 65)
    print("  Pi-Digit: Sense HAT 5-Way Joystick Diagnostic & Test")
    print("=" * 65)

    sense = get_sense()
    quick_check = "--quick" in sys.argv or "--check" in sys.argv

    # Automated state machine test
    sm_passed = test_joystick_state_machine(sense)

    if not quick_check:
        print("\n--- Live Interactive Polling (5 seconds) ---")
        print("Move the joystick or click buttons in the Web UI...")
        start_time = time.time()
        interactive_count = 0
        while time.time() - start_time < 5.0:
            evs = sense.stick.get_events()
            if evs:
                for ev in evs:
                    interactive_count += 1
                    print(f"  [Live #{interactive_count}] {ev.direction.upper()} -> {ev.action.upper()}")
            time.sleep(0.1)

    print("-" * 65)
    if sm_passed:
        print("[ PASS ] Joystick state machine (Middle press, Hold, Release) verified.")
    else:
        print("[ FAIL ] Joystick state machine verification encountered errors.")
        sys.exit(1)
    print("=" * 65)

if __name__ == "__main__":
    main()
